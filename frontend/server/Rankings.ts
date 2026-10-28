import {
	type DocumentSnapshot,
	FieldPath,
	FieldValue,
	type Query,
} from "firebase-admin/firestore";
import { type TokenVerifier, verifiedUser } from "../api/account.ts";
import { displayNameError } from "../src/accounts/DisplayName.ts";
import {
	type Difficulty,
	isDifficulty,
} from "../src/domain/game/Difficulty.ts";
import { GAME_VERSION, GAME_VERSIONS } from "../src/domain/game/GameVersion.ts";
import { isTestSeed } from "../src/domain/game/TestSeed.ts";
import { summarizeRun } from "../src/domain/saves/RunStatistics.ts";
import { parseSave } from "../src/domain/saves/SaveFormat.ts";
import type {
	RankingResult,
	RankingsPage,
} from "../src/statistics/Rankings.ts";
import { activeAccount, database } from "./AccountData.ts";

const json = (status: number, body: unknown) =>
	Response.json(body, { status, headers: { "cache-control": "no-store" } });
export type RankingsWriter = (
	uid: string,
	runId: string,
	result: RankingResult,
) => Promise<void>;
export const writeRanking: RankingsWriter = async (uid, runId, result) => {
	await database().runTransaction(async (tx) => {
		const profile = await activeAccount(tx, uid);
		const reference = database().doc(`rankings/${uid}_${runId}`);
		const existing = await tx.get(reference);
		if (existing.exists) return;
		const version = database().doc(`rankingVersions/${result.gameVersion}`);
		const knownVersion = await tx.get(version);
		const displayName = profile.data()?.displayName;
		if (typeof displayName !== "string" || displayNameError(displayName))
			throw Object.assign(
				Error("Choose a Rankings display name in your account first."),
				{ code: "no-display-name" },
			);
		tx.create(reference, {
			...result,
			uid,
			displayName,
			acceptedAt: FieldValue.serverTimestamp(),
		});
		if (!knownVersion.exists)
			tx.create(version, { version: result.gameVersion });
	});
};
type Board = {
	difficulty: Difficulty;
	version: string;
	uid?: string;
	after?: string;
};
const ordered = (query: Query) =>
	query
		.orderBy("outcomeOrder")
		.orderBy("depthOrder")
		.orderBy("turns")
		.orderBy("acceptedAt")
		.orderBy(FieldPath.documentId());
const position = (document: DocumentSnapshot) => [
	document.get("outcomeOrder"),
	document.get("depthOrder"),
	document.get("turns"),
	document.get("acceptedAt"),
	document.id,
];
const invalidCursor = () =>
	Object.assign(Error("This page is no longer available. Refresh Rankings."), {
		code: "invalid-cursor",
	});
export const readRankings = async ({
	difficulty,
	version,
	uid,
	after,
}: Board): Promise<RankingsPage> => {
	const global = ordered(
		database()
			.collection("rankings")
			.where("difficulty", "==", difficulty)
			.where("gameVersion", "==", version),
	);
	let board = uid ? global.where("uid", "==", uid) : global;
	let offset = 0;
	if (after) {
		if (!/^[A-Za-z0-9_-]+$/.test(after) || after.length > 300)
			throw invalidCursor();
		const cursor = await database().doc(`rankings/${after}`).get();
		if (
			!cursor.exists ||
			cursor.get("difficulty") !== difficulty ||
			cursor.get("gameVersion") !== version ||
			(uid && cursor.get("uid") !== uid)
		)
			throw invalidCursor();
		board = board.startAfter(...position(cursor));
		if (!uid)
			offset = (
				await global
					.endAt(...position(cursor))
					.count()
					.get()
			).data().count;
	}
	const page = await board.limit(21).get();
	const docs = page.docs.slice(0, 20);
	const rows = await Promise.all(
		docs.map(async (doc, index) => ({
			rank: uid
				? (
						await global
							.endBefore(...position(doc))
							.count()
							.get()
					).data().count + 1
				: offset + index + 1,
			displayName: doc.get("displayName") as string,
			outcome: doc.get("outcome") as "won" | "died",
			deepestFloor: doc.get("deepestFloor") as number,
			turns: doc.get("turns") as number,
			level: doc.get("level") as number,
			acceptedAt: doc.get("acceptedAt").toDate().toISOString() as string,
		})),
	);
	const versions = await database()
		.collection("rankingVersions")
		.orderBy(FieldPath.documentId())
		.get();
	return {
		rows,
		next: page.size > 20 ? (docs.at(-1)?.id ?? null) : null,
		versions: [
			...new Set([GAME_VERSION, ...versions.docs.map((doc) => doc.id)]),
		],
	};
};
export const handleRankings = async (
	request: Request,
	verify?: TokenVerifier,
	write = writeRanking,
	read = readRankings,
): Promise<Response> => {
	if (!["GET", "POST"].includes(request.method))
		return json(405, { error: "Use GET or POST." });
	try {
		if (request.method === "GET") {
			const params = new URL(request.url).searchParams;
			const difficulty = Number(params.get("difficulty") ?? "1");
			const version = params.get("version") ?? GAME_VERSION;
			const personal = params.get("board") === "personal";
			if (
				!isDifficulty(difficulty) ||
				!/^[0-9]+\.[0-9]+\.[0-9]+(?:-[a-z0-9.]+)?$/.test(version) ||
				version.length > 40 ||
				![null, "global", "personal"].includes(params.get("board"))
			)
				return json(400, {
					error: "Choose a valid difficulty, version and board.",
				});
			const user = personal ? await verifiedUser(request, verify) : undefined;
			if (user instanceof Response) return user;
			return json(
				200,
				await read({
					difficulty,
					version,
					...(user ? { uid: user.uid } : {}),
					...(params.get("after")
						? { after: params.get("after") ?? undefined }
						: {}),
				}),
			);
		}
		const user = await verifiedUser(request, verify);
		if (user instanceof Response) return user;
		const parsed = parseSave(await request.text());
		if (!parsed.ok) return json(400, { error: parsed.error });
		const { state } = parsed.value;
		if (
			state.developerRun ||
			state.disabledFeatures?.length ||
			isTestSeed(state.run.seed)
		)
			return json(400, {
				error: "Developer adventures cannot enter Rankings.",
			});
		if (!state.ranked)
			return json(400, {
				error: "Adventures started in Settings are unranked.",
			});
		if (!state.rankingVersion || !GAME_VERSIONS.includes(state.rankingVersion))
			return json(400, {
				error:
					"Only adventures newly started after Rankings was introduced qualify.",
			});
		if (!state.runId || (state.player.health > 0 && !state.quest.victory))
			return json(400, {
				error: "Finish the adventure before submitting to Rankings.",
			});
		const summary = summarizeRun(parsed.value, null);
		const won = summary.outcome === "won";
		await write(user.uid, state.runId, {
			gameVersion: state.rankingVersion,
			difficulty: summary.difficulty,
			outcome: won ? "won" : "died",
			outcomeOrder: won ? 0 : 1,
			depthOrder: won ? 0 : -summary.deepestFloor,
			deepestFloor: summary.deepestFloor,
			turns: summary.turns,
			level: summary.level,
		});
		return json(200, { ok: true });
	} catch (error) {
		const code = (error as { code?: string }).code;
		if (code === "no-display-name")
			return json(409, {
				error:
					"Choose a Rankings display name in your account first; your run will retry.",
			});
		if (code === "account-deleted")
			return json(410, { error: "This account has been deleted." });
		if (code === "invalid-cursor")
			return json(400, { error: (error as Error).message });
		return json(503, { error: "Rankings are unavailable. Try again shortly." });
	}
};
export const GET = (request: Request) => handleRankings(request);
export const POST = GET;
