// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createGameState, type GameState } from "../domain/game/GameState";
import { TEST_SEED } from "../domain/game/TestSeed";
import { createBag } from "../domain/items/Bag";
import { autosaveAction } from "../domain/saves/Autosave";
import { serializeSave } from "../domain/saves/SaveFormat";
import { createTownLocation } from "../domain/town/TownLocation";
import {
	AUTOSAVE_KEY,
	clearAutosave,
	LOCAL_SAVE_KEY,
	readAutosave,
	readLocalSave,
	writeAutosave,
} from "../persistence/LocalAdventureSave";
import { savedAdventure } from "./SaveTestHelpers";
import { createTestDungeonFloor } from "./testhelpers";

const floor = (floorNumber: number) =>
	createTestDungeonFloor({
		floorNumber,
		rows: 8,
		cols: 8,
		room: { startRow: 1, endRow: 6, startCol: 1, endCol: 6 },
	});
const dungeon = (seed = 1): GameState => ({
	...createGameState({
		seed,
		activeFloor: 1,
		playerCoordinate: { row: 1, col: 1 },
		floors: [floor(1), floor(2)],
	}),
	turn: 10,
});
const inTown = (state: GameState): GameState => ({
	...state,
	town: createTownLocation(),
});

describe("When to autosave", () => {
	it("saves on floor changes, entering and leaving town, and every 100 turns", () => {
		const state = dungeon();
		expect(
			autosaveAction(state, {
				...state,
				run: { ...state.run, activeFloor: 2 },
			}),
		).toBe("save");
		expect(autosaveAction(state, inTown(state))).toBe("save");
		expect(autosaveAction(inTown(state), state)).toBe("save");
		expect(
			autosaveAction({ ...state, turn: 99 }, { ...state, turn: 100 }),
		).toBe("save");
		expect(
			autosaveAction({ ...state, turn: 100 }, { ...state, turn: 101 }),
		).toBe(null);
	});
	it("saves after a town transaction but not for walking around town", () => {
		const town = inTown(dungeon());
		expect(
			autosaveAction(town, {
				...town,
				town: { ...createTownLocation(), coordinate: { row: 2, col: 2 } },
			}),
		).toBe(null);
		expect(autosaveAction(town, { ...town, gold: town.gold - 50 })).toBe(
			"save",
		);
		expect(
			autosaveAction(town, {
				...town,
				bag: createBag([{ id: "bought", kind: "healing-potion" }]),
			}),
		).toBe("save");
		expect(autosaveAction(town, { ...town, townStorage: [] })).toBe("save");
	});
	it("clears once when the run ends, and never saves the test seed", () => {
		const state = dungeon();
		const dead = { ...state, player: { ...state.player, health: 0 } };
		expect(autosaveAction(state, dead)).toBe("clear");
		expect(autosaveAction(dead, { ...dead, turn: 11 })).toBe(null);
		const won = {
			...state,
			quest: {
				...state.quest,
				victory: {} as NonNullable<GameState["quest"]["victory"]>,
			},
		};
		expect(autosaveAction(state, won)).toBe("clear");
		const test = dungeon(TEST_SEED);
		expect(
			autosaveAction(test, {
				...test,
				run: { ...test.run, activeFloor: 2 },
			}),
		).toBe(null);
	});
	it("saves a fresh adventure's start but not a loaded one", () => {
		const loaded = dungeon();
		const other = { ...loaded, run: { ...loaded.run, floors: [floor(1)] } };
		expect(autosaveAction(other, loaded)).toBe(null);
		expect(autosaveAction(other, inTown({ ...loaded, turn: 0 }))).toBe("save");
	});
});

describe("Autosave slot", () => {
	const memory = () => {
		const entries = new Map<string, string>();
		return {
			getItem: (key: string) => entries.get(key) ?? null,
			setItem: (key: string, value: string) => {
				entries.set(key, value);
			},
			removeItem: (key: string) => {
				entries.delete(key);
			},
		};
	};
	it("writes and clears its own key without touching the manual save", () => {
		const storage = memory();
		const manual = serializeSave(savedAdventure());
		storage.setItem(LOCAL_SAVE_KEY, manual);
		const document = savedAdventure();
		expect(writeAutosave(document, () => storage).ok).toBe(true);
		expect(readAutosave(() => storage)).toEqual({ ok: true, value: document });
		clearAutosave(() => storage);
		expect(storage.getItem(AUTOSAVE_KEY)).toBeNull();
		expect(readLocalSave(() => storage)).toEqual({
			ok: true,
			value: JSON.parse(manual),
		});
	});
	it("handles unavailable storage quietly", () => {
		const broken = () => ({
			getItem: () => {
				throw new Error("denied");
			},
			setItem: () => {
				throw new Error("denied");
			},
			removeItem: () => {
				throw new Error("denied");
			},
		});
		expect(writeAutosave(savedAdventure(), broken).ok).toBe(false);
		expect(readAutosave(broken).ok).toBe(false);
		expect(() => clearAutosave(broken)).not.toThrow();
	});
});
