// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { handleStatistics } from "../../server/Statistics.ts";
import { savedAdventure } from "../../src/__tests/SaveTestHelpers.ts";
import { parseSave } from "../../src/domain/saves/SaveFormat.ts";

const id = "e2703081-c956-4320-a766-139bb6485111";
const verify = async () => ({ uid: "player", email: "private@example.com" });
const finished = () => {
	const document = savedAdventure();
	document.state.runId = id;
	document.state.player.health = 0;
	return document;
};
const request = (body: unknown = finished(), token: string | null = "token") =>
	new Request("http://localhost/api/statistics", {
		method: "POST",
		headers: token ? { authorization: `Bearer ${token}` } : {},
		body: typeof body === "string" ? body : JSON.stringify(body),
	});

describe("Trusted run statistics", () => {
	it("rejects developer adventures before a trusted write", async () => {
		const document = finished();
		document.state.developerRun = true;
		const write = vi.fn();
		expect(
			(await handleStatistics(request(document), verify, write)).status,
		).toBe(400);
		expect(write).not.toHaveBeenCalled();
	});
	it("rejects missing and invalid tokens without a write", async () => {
		const write = vi.fn();

		expect(
			(await handleStatistics(request(undefined, null), verify, write)).status,
		).toBe(401);

		expect(
			(
				await handleStatistics(
					request(),
					async () => {
						throw Object.assign(new Error("bad token"), {
							code: "auth/invalid-id-token",
						});
					},
					write,
				)
			).status,
		).toBe(401);

		expect(write).not.toHaveBeenCalled();
	});
	it("rejects invalid JSON, inconsistent edits, unfinished runs, and invalid IDs", async () => {
		const tampered = finished();
		tampered.state.equipment = {
			...tampered.state.equipment,
			mainHand: { id: "forged", kind: "healing-potion" },
		};
		const unfinished = savedAdventure();
		unfinished.state.runId = id;
		const badId = finished();
		badId.state.runId = "../other";
		const missingId = finished();
		delete missingId.state.runId;
		const write = vi.fn();
		for (const body of [
			"{broken",
			{},
			tampered,
			unfinished,
			badId,
			missingId,
		]) {
			expect(
				(await handleStatistics(request(body), verify, write)).status,
			).toBe(400);
		}
		expect(write).not.toHaveBeenCalled();
	});
	it("derives the death summary and final equipment from the validated save", async () => {
		const document = finished();
		const weapon = document.state.equipment.mainHand;
		if (!weapon) throw new Error("Fixture needs a weapon");
		document.state.equipment = {
			...document.state.equipment,
			mainHand: { ...weapon, enchantment: 2 },
		};
		document.state.activityHistory = {
			nextId: 2,
			entries: [
				{
					id: 0,
					event: {
						type: "player-condition-hit",
						condition: "poisoned",
						damage: 1,
						turn: document.state.turn,
					},
				},
				{ id: 1, event: { type: "player-died", turn: document.state.turn } },
			],
		};
		expect(parseSave(JSON.stringify(document)).ok).toBe(true);
		const write = vi.fn();
		expect(
			(await handleStatistics(request(document), verify, write)).status,
		).toBe(200);
		expect(write).toHaveBeenCalledWith(
			`player_${id}`,
			expect.objectContaining({
				outcome: "died",
				seed: 123,
				gameVersion: "0.3.0-alpha",
				standard: false,
				ranked: false,
				turns: 3,
				equipped: expect.objectContaining({
					head: null,
					mainHand: { kind: weapon.kind, enchantment: 2 },
				}),
				causeOfDeath: { type: "player-condition-hit", condition: "poisoned" },
				finishedAt: document.savedAt,
			}),
		);
		expect(JSON.stringify(write.mock.calls)).not.toContain(
			"private@example.com",
		);
	});
	it("accepts a validated victory and derives a win rather than a death", async () => {
		const document = savedAdventure();
		const state = document.state;
		state.runId = id;
		state.run.playerCoordinate = { ...state.quest.entrance };
		state.floorItems = state.floorItems.filter(
			(entry) => entry.item.kind !== "cure",
		);
		state.quest = {
			...state.quest,
			cureRecovered: true,
			victory: {
				seed: state.run.seed,
				floors: state.run.floors.length,
				turns: state.turn,
				monstersDefeated: state.monstersDefeated,
				health: state.player.health,
				gold: state.gold,
				level: 1,
				experience: state.progression.experience,
			},
		};
		expect(parseSave(JSON.stringify(document)).ok).toBe(true);
		const write = vi.fn();
		expect(
			(await handleStatistics(request(document), verify, write)).status,
		).toBe(200);
		expect(write).toHaveBeenCalledWith(
			`player_${id}`,
			expect.objectContaining({ outcome: "won", causeOfDeath: null }),
		);
	});

	it("acknowledges an existing run, and makes other write failures retryable", async () => {
		expect(
			(
				await handleStatistics(request(), verify, async () => {
					throw { code: 6 };
				})
			).status,
		).toBe(200);
		expect(
			(
				await handleStatistics(request(), verify, async () => {
					throw new Error("offline");
				})
			).status,
		).toBe(503);
	});
});
