// @vitest-environment node
import { expect, it, vi } from "vitest";
import { handleRankings } from "../../server/Rankings.ts";
import { rankedAdventure } from "./RankingTestHelpers.ts";

const verify = async () => ({ uid: "owner", email: "private@example.com" });
const request = (document: unknown, token = "token") =>
	new Request("http://localhost/api/rankings", {
		method: "POST",
		headers: token ? { authorization: `Bearer ${token}` } : {},
		body: JSON.stringify(document),
	});
it("requires authentication and a validated, finished, newly started ranked adventure", async () => {
	const write = vi.fn();
	const good = rankedAdventure();
	expect((await handleRankings(request(good, ""), verify, write)).status).toBe(
		401,
	);
	expect(
		(
			await handleRankings(
				request(good),
				async () => {
					throw Error("bad");
				},
				write,
			)
		).status,
	).toBe(401);
	for (const change of [
		(d: typeof good) => {
			delete d.state.rankingVersion;
		},
		(d: typeof good) => {
			delete d.state.ranked;
		},
		(d: typeof good) => {
			d.state.developerRun = true;
		},
		(d: typeof good) => {
			d.state.player.health = 10;
		},
		(d: typeof good) => {
			d.state.runId = "fake";
		},
		(d: typeof good) => {
			d.state.quest = { ...d.state.quest, victory: { turns: 1 } as never };
		},
		(d: typeof good) => {
			d.configuration.rows = 20;
		},
		(d: typeof good) => {
			d.state.equipment = {
				...d.state.equipment,
				mainHand: { id: "fake", kind: "healing-potion" },
			};
		},
	]) {
		const document = structuredClone(good);
		change(document);
		expect(
			(await handleRankings(request(document), verify, write)).status,
		).toBe(400);
	}
	expect(write).not.toHaveBeenCalled();
});
it("derives public results from the save and leaves server acceptance time to the writer", async () => {
	const document = rankedAdventure();
	const write = vi.fn();
	expect(
		(
			await handleRankings(
				request({
					...document,
					acceptedAt: "1900-01-01",
					displayName: "forged",
				}),
				verify,
				write,
			)
		).status,
	).toBe(200);
	expect(write).toHaveBeenCalledWith(
		"owner",
		document.state.runId,
		expect.objectContaining({
			gameVersion: "0.3.0-alpha",
			difficulty: 1,
			outcome: "died",
			outcomeOrder: 1,
			depthOrder: -1,
			turns: 0,
			level: 1,
		}),
	);
	expect(JSON.stringify(write.mock.calls)).not.toMatch(
		/1900|forged|private@example/,
	);
});
it("keeps missing names and service failures retryable, and reports deleted accounts", async () => {
	for (const [code, status] of [
		["no-display-name", 409],
		["account-deleted", 410],
		["offline", 503],
	] as const) {
		const response = await handleRankings(
			request(rankedAdventure()),
			verify,
			async () => {
				throw { code };
			},
		);
		expect(response.status).toBe(status);
	}
});
it("accepts a consistent victory and derives its winning order", async () => {
	const document = rankedAdventure();
	const state = document.state;
	state.player.health = 10;
	state.monsters = state.monsters.filter(
		(monster) => monster.kind !== "ember-warden",
	);
	state.quest = {
		...state.quest,
		cureRecovered: true,
		victory: {
			seed: state.run.seed,
			floors: 20,
			turns: state.turn,
			monstersDefeated: state.monstersDefeated,
			health: 10,
			gold: state.gold,
			level: 1,
			experience: 0,
		},
	};
	const write = vi.fn();
	const response = await handleRankings(request(document), verify, write);
	expect(response.status, await response.text()).toBe(200);
	expect(write).toHaveBeenCalledWith(
		"owner",
		state.runId,
		expect.objectContaining({ outcome: "won", outcomeOrder: 0, depthOrder: 0 }),
	);
});
it("validates filters and authenticates personal paging as the token owner", async () => {
	const read = vi.fn(async () => ({
		rows: [],
		next: null,
		versions: ["0.3.0-alpha"],
	}));
	const get = (query: string, token = "token") =>
		new Request(`http://localhost/api/rankings?${query}`, {
			headers: token ? { authorization: `Bearer ${token}` } : {},
		});
	expect(
		(await handleRankings(get("", ""), verify, undefined, read)).status,
	).toBe(200);
	expect(read).toHaveBeenLastCalledWith({
		difficulty: 1,
		version: "0.3.0-alpha",
	});
	expect(
		(await handleRankings(get("board=personal", ""), verify, undefined, read))
			.status,
	).toBe(401);
	expect(
		(
			await handleRankings(
				get("board=personal&difficulty=1.25&after=page&uid=victim"),
				verify,
				undefined,
				read,
			)
		).status,
	).toBe(200);
	expect(read).toHaveBeenLastCalledWith({
		difficulty: 1.25,
		version: "0.3.0-alpha",
		after: "page",
		uid: "owner",
	});
	for (const query of ["difficulty=2", "version=invalid", "board=invalid"])
		expect(
			(await handleRankings(get(query), verify, undefined, read)).status,
		).toBe(400);
});
