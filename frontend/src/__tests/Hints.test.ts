// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	type ActivityEvent,
	appendActivityEvents,
} from "../domain/game/ActivityHistory";
import { createGameState, type GameState } from "../domain/game/GameState";
import { detectHints } from "../domain/hints/Hints";
import { BAG_CAPACITY, createBag } from "../domain/items/Bag";
import {
	HINTS_KEY,
	readHintPreferences,
	writeHintPreferences,
} from "../persistence/HintPreferences";
import { createTestDungeonFloor } from "./testhelpers";

const base = (): GameState => ({
	...createGameState({
		seed: 1,
		activeFloor: 1,
		playerCoordinate: { row: 1, col: 1 },
		floors: [
			createTestDungeonFloor({
				floorNumber: 1,
				rows: 8,
				cols: 8,
				room: { startRow: 1, endRow: 6, startCol: 1, endCol: 6 },
			}),
		],
	}),
	bag: createBag(),
});
const withEvents = (
	state: GameState,
	...events: ActivityEvent[]
): GameState => ({
	...state,
	activityHistory: appendActivityEvents(state.activityHistory, events),
});
const ids = (previous: GameState, next: GameState) =>
	detectHints(previous, next).map((hint) => hint.id);
const target = { row: 2, col: 2 };

describe("Hint detection", () => {
	it.each([
		[
			"affliction",
			{
				type: "affliction-changed",
				condition: "poisoned",
				change: "applied",
				source: "trap",
				turn: 1,
			},
		],
		[
			"rare-discovery",
			{ type: "object-seen", kind: "well", activated: false, turn: 1 },
		],
		[
			"telegraph",
			{
				type: "monster-charge-prepared",
				actorId: "1:1",
				monster: "dungeon-brute",
				target,
				turn: 1,
			},
		],
		[
			"alarm",
			{
				type: "monster-alarm-sounded",
				actorId: "1:1",
				monster: "alarm-sentry",
				target,
				turn: 1,
			},
		],
		[
			"bleeding",
			{
				type: "player-condition-hit",
				condition: "bleeding",
				damage: 1,
				turn: 1,
			},
		],
	] as const)(
		"recognizes the first %s from a new Activity event",
		(id, event) => {
			const state = base();
			expect(ids(state, withEvents(state, event as ActivityEvent))).toEqual([
				id,
			]);
		},
	);
	it("ignores events that don't introduce a mechanic and events already seen", () => {
		const state = base();
		const refreshed = withEvents(state, {
			type: "affliction-changed",
			condition: "poisoned",
			change: "refreshed",
			source: "trap",
			turn: 1,
		});
		expect(ids(state, refreshed)).toEqual([]);
		const used = withEvents(state, {
			type: "object-seen",
			kind: "well",
			activated: true,
			turn: 1,
		});
		expect(ids(state, used)).toEqual([]);
		const poisoned = withEvents(state, {
			type: "player-condition-hit",
			condition: "poisoned",
			damage: 1,
			turn: 1,
		});
		expect(ids(state, poisoned)).toEqual([]);
		// Entries already in the previous history are not new.
		expect(ids(poisoned, { ...poisoned, turn: 2 })).toEqual([]);
	});
	it("recognizes a town portal opening, a bag becoming full, and new gear", () => {
		const state = base();
		expect(
			ids(state, {
				...state,
				townPortal: { floorNumber: 3, coordinate: target },
			}),
		).toEqual(["town-portal"]);
		const almost = {
			...state,
			bag: createBag(
				Array.from({ length: BAG_CAPACITY - 1 }, (_, index) => ({
					id: `potion:${index}`,
					kind: "healing-potion" as const,
				})).map((item, index) =>
					index === 0 ? item : { ...item, kind: "short-sword" as const },
				),
			),
		};
		const full = {
			...almost,
			bag: createBag([
				...almost.bag.items,
				{ id: "sword:new", kind: "short-sword" },
			]),
		};
		expect(ids(almost, full)).toEqual(["bag-full", "gear-drag"]);
		expect(
			ids(state, {
				...state,
				bag: createBag([{ id: "potion:new", kind: "healing-potion" }]),
			}),
		).toEqual([]);
	});
	it("keeps one hint per kind when an action triggers it twice", () => {
		const state = base();
		const twice = withEvents(
			state,
			{
				type: "affliction-changed",
				condition: "poisoned",
				change: "applied",
				source: "trap",
				turn: 1,
			},
			{
				type: "affliction-changed",
				condition: "bleeding",
				change: "applied",
				source: "trap",
				turn: 1,
			},
		);
		const hints = detectHints(state, twice);
		expect(hints).toHaveLength(1);
		expect(hints[0].title).toContain("Poison");
	});
});

describe("Hint preferences", () => {
	const memory = (initial: string | null = null) => {
		let value = initial;
		return () => ({
			getItem: () => value,
			setItem: (_: string, next: string) => {
				value = next;
			},
		});
	};
	it("defaults to on with nothing seen, and round-trips through storage", () => {
		const storage = memory();
		expect(readHintPreferences(storage)).toEqual({ enabled: true, seen: [] });
		writeHintPreferences({ enabled: false, seen: ["alarm"] }, storage);
		expect(readHintPreferences(storage)).toEqual({
			enabled: false,
			seen: ["alarm"],
		});
	});
	it("reads corrupt or unavailable storage as the defaults and drops unknown ids", () => {
		expect(readHintPreferences(memory("{not json"))).toEqual({
			enabled: true,
			seen: [],
		});
		expect(
			readHintPreferences(
				memory(JSON.stringify({ enabled: true, seen: ["alarm", "nope", 3] })),
			),
		).toEqual({ enabled: true, seen: ["alarm"] });
		const broken = () => ({
			getItem: () => {
				throw new Error("denied");
			},
			setItem: () => {
				throw new Error("denied");
			},
		});
		expect(readHintPreferences(broken)).toEqual({ enabled: true, seen: [] });
		expect(() =>
			writeHintPreferences({ enabled: true, seen: [] }, broken),
		).not.toThrow();
		expect(HINTS_KEY).toBe("larn:hints");
	});
});
