import {
	errorCode,
	json,
	type TokenVerifier,
	verifiedUser,
} from "../api/account.ts";
import {
	MAX_STATISTICS_BYTES,
	MAX_STATISTICS_LIST_ROW_BYTES,
	type RunStatistics,
	statisticsBytes,
	statisticsListSummary,
	summarizeRun,
} from "../src/domain/saves/RunStatistics.ts";
import { parseSave } from "../src/domain/saves/SaveFormat.ts";
import { activeAccount, database } from "./AccountData.ts";

export type StatisticsWriter = (
	id: string,
	summary: RunStatistics,
) => Promise<void>;
export const writeStatistics: StatisticsWriter = async (id, summary) => {
	const uid = id.slice(0, -37);
	await database().runTransaction(async (tx) => {
		await activeAccount(tx, uid);
		tx.create(database().doc(`statistics/${id}`), summary);
	});
};

export const handleStatistics = async (
	request: Request,
	verify?: TokenVerifier,
	write: StatisticsWriter = writeStatistics,
): Promise<Response> => {
	if (request.method !== "POST") return json(405, { error: "Use POST." });
	const user = await verifiedUser(request, verify);
	if (user instanceof Response) return user;
	const parsed = parseSave(await request.text());
	if (!parsed.ok) return json(400, { error: parsed.error });
	const document = parsed.value;
	if (document.state.developerRun || document.state.disabledFeatures?.length)
		return json(400, {
			error: "Developer adventures do not contribute run statistics.",
		});
	if (
		!document.state.runId ||
		(document.state.player.health > 0 && document.state.quest.victory === null)
	)
		return json(400, { error: "A finished run with a run ID is required." });
	try {
		const summary = summarizeRun(
			document,
			process.env.VERCEL_GIT_COMMIT_SHA ?? null,
		);
		// The save's clock is the client's. Lists sort and filter on this string, so
		// store it as UTC ISO and never later than its receipt.
		summary.finishedAt = new Date(
			Math.min(Date.parse(summary.finishedAt), Date.now()),
		).toISOString();
		if (
			statisticsBytes(summary) > MAX_STATISTICS_BYTES ||
			statisticsBytes(statisticsListSummary(summary)) >
				MAX_STATISTICS_LIST_ROW_BYTES
		)
			return json(400, {
				error: "Run statistics exceed the supported size budget.",
			});
		await write(`${user.uid}_${document.state.runId}`, summary);
	} catch (error) {
		if (errorCode(error) === "account-deleted")
			return json(410, { error: "This account has been deleted." });
		// Firestore create is atomic: concurrent devices and retries share one document.
		if (errorCode(error) !== 6)
			return json(503, {
				error: "Statistics could not be stored. Retry later.",
			});
	}
	return json(200, { ok: true });
};
export const POST = (request: Request): Promise<Response> =>
	handleStatistics(request);
