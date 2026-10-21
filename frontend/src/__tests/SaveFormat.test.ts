// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { updateExploration } from "../domain/dungeon/Exploration";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import {
	createSaveDocument,
	MAX_SAVE_BYTES,
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { savedAdventure } from "./SaveTestHelpers";

describe("Complete adventure save format", () => {
	it("round-trips a played run with retained loot, actors, resources, shortcuts and history", () => {
		const original = savedAdventure();
		original.state.mana = 4;
		original.state.potionHotbar = ["healing-potion", "mana-potion", null, null];
		const result = parseSave(serializeSave(original));
		expect(result).toEqual({ ok: true, value: original });
		if (!result.ok) throw new Error(result.error);
		const restored = restoreSave(result.value);
		expect(restored.state.turn).toBe(3);
		expect(restored.state.mana).toBe(4);
		expect(restored.state.run.floors[0].terrain[0]).toEqual([
			...original.state.run.floors[0].terrain[0],
		]);
		expect(restored.configuration).toEqual(original.configuration);
		expect(restored.fog).toEqual(original.fog);
		expect(restored.state.floorItems).toEqual(original.state.floorItems);
		expect(restored.state.monsters).toEqual(original.state.monsters);
		expect(restored.state.bag).toEqual(original.state.bag);
		expect(restored.state.equipment).toEqual(original.state.equipment);
		expect(restored.state.activityHistory).toEqual(
			original.state.activityHistory,
		);
		expect(restored.state.knownSpells).toEqual(original.state.knownSpells);
		expect(restored.state.potionHotbar).toEqual(original.state.potionHotbar);
	});
	it("preserves discovery on earlier floors and recomputes current sight", () => {
		const initial = restoreSave(savedAdventure());
		const state = {
			...initial.state,
			run: {
				...initial.state.run,
				activeFloor: 2,
				playerCoordinate: initial.state.run.floors[1].upStair?.coordinate ?? {
					row: 1,
					col: 1,
				},
			},
		};
		const explored = updateExploration(state.run, 2, initial.exploration);
		const document = createSaveDocument(
			state,
			explored,
			initial.configuration,
			{ enabled: true, radius: 2 },
		);
		const parsed = parseSave(serializeSave(document));
		expect(parsed.ok).toBe(true);
		if (!parsed.ok) throw new Error(parsed.error);
		const restored = restoreSave(parsed.value);
		expect(restored.exploration.explored).toEqual(explored.explored);
		expect(restored.exploration.visible).toEqual(explored.visible);
		expect(document.explored.map((entry) => entry.floorNumber)).toEqual([1, 2]);
	});
	it("continues seeded combat and the thirtieth-turn recovery identically after loading", () => {
		const document = savedAdventure();
		document.state.turn = 29;
		document.state.mana = 2;
		document.state.player = { health: 10, maxHealth: 10 };
		const player = document.state.run.playerCoordinate;
		const neighbors = [
			{ direction: "up", row: player.row - 1, col: player.col },
			{ direction: "down", row: player.row + 1, col: player.col },
			{ direction: "left", row: player.row, col: player.col - 1 },
			{ direction: "right", row: player.row, col: player.col + 1 },
		] as const;
		const target = neighbors.find(
			({ row, col }) =>
				document.state.run.floors[0].terrain[row]?.[col] === ".",
		);
		if (!target) throw new Error("Fixture needs an adjacent floor tile");
		document.state.monsters = [
			{
				intent: { type: "idle" as const },
				lastDamagedTurn: null,
				id: "1:1",
				kind: "goblin",
				floorNumber: 1,
				coordinate: { row: target.row, col: target.col },
				health: 4,
			},
		];

		const original = restoreSave(document);
		const parsed = parseSave(serializeSave(document));
		if (!parsed.ok) throw new Error(parsed.error);
		const loaded = restoreSave(parsed.value);
		const random = vi.spyOn(Math, "random").mockImplementation(() => {
			throw new Error("Resume must use seeded combat");
		});
		try {
			const action = { type: "move", direction: target.direction } as const;
			const after = resolvePlayerAction(loaded.state, action);
			expect(after).toEqual(resolvePlayerAction(original.state, action));
			expect(after.state.turn).toBe(30);
			expect(after.state.mana).toBe(3);
		} finally {
			random.mockRestore();
		}
	});
	it("retains a dead run rather than reviving it on load", () => {
		const document = savedAdventure();
		document.state.player = { health: 0, maxHealth: 10 };
		const parsed = parseSave(serializeSave(document));
		if (!parsed.ok) throw new Error(parsed.error);
		const loaded = restoreSave(parsed.value);
		expect(resolvePlayerAction(loaded.state, { type: "wait" }).state).toBe(
			loaded.state,
		);
	});
	it.each([
		[
			"unsupported version",
			(d: ReturnType<typeof savedAdventure>) => {
				d.version = 999 as 32;
			},
		],
		[
			"missing field",
			(d: ReturnType<typeof savedAdventure>) => {
				Reflect.deleteProperty(d.state, "mana");
			},
		],
		[
			"unknown monster",
			(d: ReturnType<typeof savedAdventure>) => {
				d.state.monsters[0].kind = "dragon" as "goblin";
			},
		],
		[
			"unknown spell",
			(d: ReturnType<typeof savedAdventure>) => {
				d.state.knownSpells = ["unknown" as "heal"];
			},
		],
		[
			"invalid position",
			(d: ReturnType<typeof savedAdventure>) => {
				d.state.run.playerCoordinate = { row: 0, col: 0 };
			},
		],
		[
			"broken stairs",
			(d: ReturnType<typeof savedAdventure>) => {
				const stair = d.state.run.floors[0].downStair;
				if (stair) stair.destinationFloor = 20;
			},
		],
		[
			"duplicate ownership",
			(d: ReturnType<typeof savedAdventure>) => {
				d.state.bag = { items: [d.state.bag.items[0], d.state.bag.items[0]] };
			},
		],
		[
			"incorrect equipment slot",
			(d: ReturnType<typeof savedAdventure>) => {
				d.state.equipment = {
					...d.state.equipment,
					head: d.state.equipment.mainHand,
					mainHand: null,
				};
			},
		],
		[
			"excess mana",
			(d: ReturnType<typeof savedAdventure>) => {
				d.state.mana = 999;
			},
		],
		[
			"invalid fog memory",
			(d: ReturnType<typeof savedAdventure>) => {
				d.explored[0].rows[0] = "x";
			},
		],
		[
			"unknown activity event",
			(d: ReturnType<typeof savedAdventure>) => {
				d.state.activityHistory = {
					entries: [{ id: 0, event: { type: "unknown", turn: 0 } as never }],
					nextId: 1,
				};
			},
		],
	])("rejects %s before restoration", (_name, damage) => {
		const document = savedAdventure();
		damage(document);
		expect(parseSave(serializeSave(document)).ok).toBe(false);
	});
	it("rejects malformed and oversized input", () => {
		expect(parseSave("not json").ok).toBe(false);
		expect(parseSave(" ".repeat(MAX_SAVE_BYTES + 1))).toEqual({
			ok: false,
			error: "This save file is too large.",
		});
	});
});
