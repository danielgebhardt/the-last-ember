// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	type ActivityEvent,
	appendActivityEvents,
} from "../domain/game/ActivityHistory";
import { combatFeedback } from "../domain/game/CombatFeedback";
import { createGameState, type GameState } from "../domain/game/GameState";
import type { Monster } from "../domain/monsters/Monster";
import { createTestDungeonFloor } from "./testhelpers";

const goblin: Monster = {
	id: "1:1",
	kind: "goblin",
	floorNumber: 1,
	coordinate: { row: 2, col: 3 },
	health: 5,
	intent: { type: "idle" },
};
const player = { row: 2, col: 2 };
const base = (): GameState => ({
	...createGameState({
		seed: 1,
		activeFloor: 1,
		playerCoordinate: player,
		floors: [
			createTestDungeonFloor({
				floorNumber: 1,
				rows: 8,
				cols: 8,
				room: { startRow: 1, endRow: 6, startCol: 1, endCol: 6 },
			}),
		],
	}),
	monsters: [goblin],
	player: { health: 10, maxHealth: 10 },
});
// Omit distributed over the union, so each event keeps its own fields.
type EventInput = ActivityEvent extends infer E
	? E extends ActivityEvent
		? Omit<E, "turn">
		: never
	: never;
const withEvents = (
	state: GameState,
	changes: Partial<GameState>,
	...events: EventInput[]
): GameState => ({
	...state,
	...changes,
	activityHistory: appendActivityEvents(
		state.activityHistory,
		events.map((event) => ({ ...event, turn: 1 }) as ActivityEvent),
	),
});
const marks = (previous: GameState, next: GameState) =>
	combatFeedback(previous, next).map(({ coordinate, text, tone, flash }) => ({
		at: `${coordinate.row},${coordinate.col}`,
		text,
		tone,
		flash,
	}));

describe("Combat feedback", () => {
	it("marks your hit on the struck monster with a flash", () => {
		const state = base();
		const next = withEvents(
			state,
			{ monsters: [{ ...goblin, health: 2 }] },
			{ type: "player-hit", monster: "goblin", damage: 3 },
		);
		expect(marks(state, next)).toEqual([
			{ at: "2,3", text: "-3", tone: "physical", flash: true },
		]);
	});
	it("tones a spell kill by element and marks the death and its loot", () => {
		const state = base();
		const next = withEvents(
			state,
			{ monsters: [] },
			{
				type: "spell-hit",
				spell: "magic-missile",
				monster: "goblin",
				damage: 7,
			},
			{ type: "monster-died", monster: "goblin" },
			{ type: "monster-loot", monster: "goblin", item: "healing-potion" },
			{ type: "experience-gained", amount: 4 },
		);
		expect(marks(state, next)).toEqual([
			{ at: "2,3", text: "-5", tone: "arcane", flash: true },
			{ at: "2,3", text: "Slain", tone: "death", flash: false },
			{ at: "2,3", text: "Loot", tone: "loot", flash: false },
			{ at: "2,2", text: "+4 XP", tone: "xp", flash: false },
		]);
	});
	it("shows each hit you take separately, colored by its source", () => {
		const state = base();
		const next = withEvents(
			state,
			{ player: { health: 4, maxHealth: 10 } },
			{ type: "monster-hit", monster: "goblin", damage: 3 },
			{ type: "player-condition-hit", condition: "bleeding", damage: 1 },
			{ type: "player-condition-hit", condition: "poisoned", damage: 1 },
			{
				type: "monster-area-hit",
				monster: "goblin",
				element: "fire",
				damage: 1,
			},
		);
		expect(marks(state, next).map((m) => [m.at, m.text, m.tone])).toEqual([
			["2,2", "-3", "physical"],
			["2,2", "-1", "bleeding"],
			["2,2", "-1", "poison"],
			["2,2", "-1", "fire"],
		]);
	});
	it("marks misses on the right tile, and healing and gold on you", () => {
		const state = { ...base(), player: { health: 5, maxHealth: 10 } };
		const next = withEvents(
			state,
			{ player: { health: 9, maxHealth: 10 } },
			{ type: "player-missed", monster: "goblin" },
			{ type: "monster-missed", monster: "goblin" },
			{ type: "gold-collected", amount: 12 },
		);
		expect(marks(state, next)).toEqual([
			{ at: "2,2", text: "+4", tone: "heal", flash: false },
			{ at: "2,3", text: "Miss", tone: "miss", flash: false },
			{ at: "2,2", text: "Miss", tone: "miss", flash: false },
			{ at: "2,2", text: "+12 gold", tone: "gold", flash: false },
		]);
	});
	it("shows nothing across a floor change, in town, or for an unchanged turn", () => {
		const state = base();
		expect(marks(state, { ...state, turn: 1 })).toEqual([]);
		const hurt = withEvents(
			state,
			{ monsters: [{ ...goblin, health: 2 }] },
			{ type: "player-hit", monster: "goblin", damage: 3 },
		);
		expect(
			marks(state, { ...hurt, run: { ...hurt.run, activeFloor: 2 } }),
		).toEqual([]);
		expect(
			marks(state, {
				...hurt,
				town: { coordinate: { row: 1, col: 1 } } as GameState["town"],
			}),
		).toEqual([]);
	});
});
