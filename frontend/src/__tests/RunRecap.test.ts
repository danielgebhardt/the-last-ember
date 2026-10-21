// @vitest-environment node
import { describe, expect, it } from "vitest";
import { DEFAULT_RUN_CONFIGURATION } from "../domain/dungeon/RunConfiguration";
import type { GameState } from "../domain/game/GameState";
import type { RunRecord } from "../domain/game/RunRecap";
import { createRunRecord, runRecap } from "../domain/game/RunRecap";
import {
	addRunToHistory,
	RUN_HISTORY_KEY,
	RUN_HISTORY_LIMIT,
	readRunHistory,
} from "../persistence/RunHistory";
import { bruteEncounter } from "./BruteTestHelpers";

const ended = (): GameState => {
	const state = bruteEncounter();
	return {
		...state,
		turn: 42,
		player: { ...state.player, health: 0 },
		afflictions: [{ kind: "bleeding", remaining: null, source: "trap" }],
		objects: [
			{
				id: "floor:4:object:mirror:1",
				kind: "mirror",
				floorNumber: 4,
				coordinate: { row: 2, col: 2 },
				activated: true,
				mirrorResult: { choice: "shatter", outcome: "empty" },
			},
			{
				id: "floor:3:object:well:1",
				kind: "well",
				floorNumber: 3,
				coordinate: { row: 2, col: 2 },
				activated: false,
			},
		],
	};
};

describe("run recap", () => {
	it("captures conditions, worn gear and used discoveries", () => {
		const recap = runRecap(ended());
		expect(recap.afflictions).toEqual(["Bleeding"]);
		expect(recap.gear.map((g) => g.slot)).toEqual(["Main hand", "Off hand"]);
		// An unused discovery isn't listed.
		expect(recap.discoveries).toEqual([
			{ name: "Mirror of Shadows", floor: 4, result: "shattered: nothing" },
		]);
	});

	it("records a stable ending, so the same death is never added twice", () => {
		const configuration = DEFAULT_RUN_CONFIGURATION;
		const first = createRunRecord(
			ended(),
			configuration,
			4,
			"The goblin hits you for 3 damage.",
			new Date("2026-10-21T12:00:00Z"),
		);
		expect(first).toMatchObject({
			outcome: "died",
			turns: 42,
			deepestFloor: 4,
			cause: "The goblin hits you for 3 damage.",
		});
		const later = createRunRecord(
			ended(),
			configuration,
			4,
			undefined,
			new Date("2026-10-22T12:00:00Z"),
		);
		expect(later.id).toBe(first.id);
	});
});

describe("run history storage", () => {
	const memory = () => {
		const values = new Map<string, string>();
		return () => ({
			getItem: (key: string) => values.get(key) ?? null,
			setItem: (key: string, value: string) => void values.set(key, value),
		});
	};
	const record = (n: number): RunRecord => ({
		...createRunRecord(
			{ ...ended(), turn: n },
			DEFAULT_RUN_CONFIGURATION,
			4,
			undefined,
			new Date(Date.UTC(2026, 9, 21, 0, n)),
		),
	});

	it("keeps the newest 20, newest first, without duplicates", () => {
		const storage = memory();
		for (let n = 1; n <= RUN_HISTORY_LIMIT + 5; n++)
			addRunToHistory(record(n), storage);
		addRunToHistory(record(RUN_HISTORY_LIMIT + 5), storage);
		const history = readRunHistory(storage);
		expect(history).toHaveLength(RUN_HISTORY_LIMIT);
		expect(history[0].turns).toBe(RUN_HISTORY_LIMIT + 5);
		expect(new Set(history.map((r) => r.id)).size).toBe(RUN_HISTORY_LIMIT);
	});

	it("reads corrupt or unavailable storage as empty and drops malformed entries", () => {
		const storage = memory();
		storage().setItem(RUN_HISTORY_KEY, "{not json");
		expect(readRunHistory(storage)).toEqual([]);
		storage().setItem(
			RUN_HISTORY_KEY,
			JSON.stringify([{ id: "broken" }, record(1)]),
		);
		expect(readRunHistory(storage).map((r) => r.turns)).toEqual([1]);
		const blocked = () => ({
			getItem: () => {
				throw new Error("blocked");
			},
			setItem: () => {
				throw new Error("blocked");
			},
		});
		expect(readRunHistory(blocked)).toEqual([]);
		expect(addRunToHistory(record(2), blocked)).toEqual([]);
	});
});
