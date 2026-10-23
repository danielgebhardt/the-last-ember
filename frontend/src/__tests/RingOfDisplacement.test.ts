// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createGameState, type GameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { createEquipment } from "../domain/items/Equipment";
import {
	ITEM_DEFINITIONS,
	RARE_EQUIPMENT_KINDS,
	validateItemDefinition,
} from "../domain/items/Item";
import {
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { TOWN_EQUIPMENT_OFFERS } from "../domain/town/TownEquipmentStock";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import { rareEquipmentAdventure } from "./RareEquipmentTestHelpers";
import { tacticalSnapshot } from "./TacticalReplayTestHelpers";

const ring = { id: "ring", kind: "ring-of-displacement" as const };
const hit = () => ({ d20: () => 20, damage: (min: number) => min });
// An orc beside a wounded player in a long corridor; its landed hit sets the scene.
const wounded = (health: number, worn = true): GameState => {
	const base = createGameState(createCorridorEncounter());
	return {
		...base,
		player: { health, maxHealth: 28 },
		equipment: worn
			? createEquipment(null, null, null, null, ring)
			: base.equipment,
		run: { ...base.run, playerCoordinate: { row: 1, col: 5 } },
		monsters: [
			{
				id: "1:1",
				kind: "orc",
				floorNumber: 1,
				coordinate: { row: 1, col: 6 },
				health: 10,
				intent: { type: "idle" },
				lastDamagedTurn: null,
			},
		],
	};
};
const wait = (state: GameState) =>
	resolvePlayerAction(state, { type: "wait" }, hit).state;
const types = (state: GameState) =>
	state.activityHistory.entries.map(({ event }) => event.type);

describe("Ring of Displacement", () => {
	it("Blinks you away for free when a hit leaves you below a quarter of your health", () => {
		const before = wounded(8);
		const after = wait(before);
		expect(after.player.health).toBeGreaterThan(0);
		expect(after.player.health).toBeLessThan(7);
		expect(after.run.playerCoordinate).not.toEqual(before.run.playerCoordinate);
		expect(after.mana).toBe(before.mana);
		expect(after.displacedFloors).toEqual([1]);
		expect(types(after)).toContain("ring-displaced");
		expect(types(after)).not.toContain("spell-repositioned");
	});

	it("answers once per floor, only while worn, only when wounded that far, and never after death", () => {
		const fired = wait(wounded(8));
		const again = wait({
			...fired,
			run: { ...fired.run, playerCoordinate: { row: 1, col: 5 } },
		});
		expect(again.run.playerCoordinate).toEqual({ row: 1, col: 5 });
		expect(again.displacedFloors).toEqual([1]);
		expect(wait(wounded(8, false)).run.playerCoordinate).toEqual({
			row: 1,
			col: 5,
		});
		expect(wait(wounded(28)).displacedFloors).toBeUndefined();
		const dead = wait(wounded(1));
		expect(dead.player.health).toBe(0);
		expect(dead.displacedFloors).toBeUndefined();
	});

	it("saves the floors it has answered on, and rejects repeats or floors past the dungeon", () => {
		const state = rareEquipmentAdventure("warding-cloak", "town");
		const save = (displacedFloors: number[]) =>
			parseSave(serializeSave(tacticalSnapshot({ ...state, displacedFloors })));
		const parsed = save([1, 3]);
		if (!parsed.ok) throw new Error(parsed.error);
		expect(restoreSave(parsed.value).state.displacedFloors).toEqual([1, 3]);
		expect(save([1, 1]).ok).toBe(false);
		expect(save([9]).ok).toBe(false);
	});

	it("is a rare ring with one armor-store copy", () => {
		expect(RARE_EQUIPMENT_KINDS).toContain("ring-of-displacement");
		expect(() =>
			validateItemDefinition(ITEM_DEFINITIONS["ring-of-displacement"]),
		).not.toThrow();
		const offers = Object.values(TOWN_EQUIPMENT_OFFERS).filter(
			(offer) => offer.item.kind === "ring-of-displacement",
		);
		expect(offers).toHaveLength(1);
		expect(offers[0]).toMatchObject({ store: "armor", price: 1300 });
	});
});
