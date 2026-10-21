// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { updateExploration } from "../domain/dungeon/Exploration";
import { DEFAULT_FOG_CONFIGURATION } from "../domain/dungeon/RunConfiguration";
import { createGameState, type GameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { BAG_CAPACITY, createBag } from "../domain/items/Bag";
import type { ItemInstance } from "../domain/items/Item";
import {
	createSaveDocument,
	parseSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { createTownLocation } from "../domain/town/TownLocation";
import { STORAGE_CAPACITY } from "../domain/town/TownStorage";
import { COMPACT_TEST_CONFIGURATION as config } from "./TestRunConfiguration";

// Beside the Forge Court storage courtyard, with two healing potions and a sword.
const yard = (overrides: Partial<GameState> = {}): GameState => ({
	...createGameState(connectDungeonFloors(generateDungeonRun(123, 5, config))),
	town: { ...createTownLocation(), coordinate: { row: 5, col: 16 } },
	bag: createBag([
		{ id: "heal-1", kind: "healing-potion" },
		{ id: "heal-2", kind: "healing-potion" },
		{ id: "sword", kind: "iron-sword" },
	]),
	potionHotbar: [null, null, null, null],
	...overrides,
});
const store = (state: GameState, itemKey: string) =>
	resolvePlayerAction(state, { type: "storage-deposit", itemKey });
const take = (state: GameState, itemKey: string) =>
	resolvePlayerAction(state, { type: "storage-withdraw", itemKey });
const gear = (count: number): ItemInstance[] =>
	Array.from({ length: count }, (_, i) => ({
		id: `gear:${i}`,
		kind: "short-sword",
	}));
const saves = (state: GameState) =>
	parseSave(
		serializeSave(
			createSaveDocument(
				state,
				updateExploration(state.run, 8),
				config,
				DEFAULT_FOG_CONFIGURATION,
			),
		),
	).ok;

describe("town storage chest", () => {
	it("stores and takes back whole stacks for free, keeping item identity", () => {
		const start = yard();
		const stored = store(start, "stack:healing-potion");
		expect(stored.turnAdvanced).toBe(false);
		expect(stored.error).toBeUndefined();
		expect(stored.state.bag.items.map((i) => i.id)).toEqual(["sword"]);
		expect(stored.state.townStorage.map((i) => i.id)).toEqual([
			"heal-1",
			"heal-2",
		]);
		expect(stored.state.turn).toBe(start.turn);
		expect(stored.state.activityHistory.entries.at(-1)?.event).toMatchObject({
			type: "storage-deposited",
			item: "healing-potion",
			count: 2,
		});
		const back = take(stored.state, "stack:healing-potion");
		expect(back.state.townStorage).toEqual([]);
		expect(back.state.bag.items.map((i) => i.id).sort()).toEqual([
			"heal-1",
			"heal-2",
			"sword",
		]);
		// A potion coming back joins an empty shortcut, like buying one.
		expect(back.state.potionHotbar[0]).toBe("healing-potion");
		expect(saves(stored.state)).toBe(true);
	});

	it("holds twelve slots; a matching stack still merges when full", () => {
		const full = yard({
			bag: createBag([{ id: "heal-3", kind: "healing-potion" }, ...gear(1)]),
			townStorage: [
				...gear(STORAGE_CAPACITY).map((i) => ({ ...i, id: `stored:${i.id}` })),
			]
				.slice(0, STORAGE_CAPACITY - 1)
				.concat([{ id: "heal-1", kind: "healing-potion" }]),
		});
		const refused = store(full, "item:gear:0");
		expect(refused.error).toBe("The chest is full.");
		expect(refused.state).toBe(full);
		expect(store(full, "stack:healing-potion").error).toBeUndefined();
		expect(saves(full)).toBe(true);
	});

	it("taking needs room in the bag", () => {
		const packed = yard({
			bag: createBag(gear(BAG_CAPACITY)),
			townStorage: [{ id: "stored-sword", kind: "iron-sword" }],
		});
		expect(take(packed, "item:stored-sword").error).toBe(
			"Your bag is full. Make room first.",
		);
	});

	it("works only beside the open courtyard during an active adventure", () => {
		for (const state of [
			yard({ town: createTownLocation() }),
			yard({ town: null }),
			yard({ player: { health: 0, maxHealth: 10 } }),
		]) {
			const result = store(state, "stack:healing-potion");
			expect(result.error).toBeDefined();
			expect(result.state).toBe(state);
		}
	});

	it("saves reject duplicate copies, an overfull chest or a stored ember", () => {
		const start = yard();
		const document = createSaveDocument(
			start,
			updateExploration(start.run, 8),
			config,
			DEFAULT_FOG_CONFIGURATION,
		);
		const withStorage = (townStorage: unknown[]) =>
			parseSave(
				serializeSave({
					...document,
					state: { ...document.state, townStorage },
				} as typeof document),
			).ok;
		expect(withStorage([])).toBe(true);
		expect(withStorage([{ id: "sword", kind: "iron-sword" }])).toBe(false);
		expect(withStorage(gear(STORAGE_CAPACITY + 1))).toBe(false);
		expect(withStorage([{ id: "quest:cure", kind: "cure" }])).toBe(false);
	});
});
