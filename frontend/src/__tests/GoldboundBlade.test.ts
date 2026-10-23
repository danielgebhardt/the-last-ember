// @vitest-environment node
import { describe, expect, it } from "vitest";
import { deriveCombatStats } from "../domain/game/CombatStats";
import { createGameState, type GameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { createProgression } from "../domain/game/Progression";
import { createEquipment } from "../domain/items/Equipment";
import { compareEquipment } from "../domain/items/EquipmentComparison";
import {
	ITEM_DEFINITIONS,
	type ItemInstance,
	RARE_EQUIPMENT_KINDS,
	validateItemDefinition,
} from "../domain/items/Item";
import { goldBoundBonus } from "../domain/items/ItemValues";
import {
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { TOWN_EQUIPMENT_OFFERS } from "../domain/town/TownEquipmentStock";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import { rareEquipmentAdventure } from "./RareEquipmentTestHelpers";
import { tacticalSnapshot } from "./TacticalReplayTestHelpers";

const blade = { id: "blade", kind: "goldbound-blade" as const };
const attack = (gold: number, mainHand: ItemInstance = blade) =>
	deriveCombatStats(createEquipment(mainHand), createProgression(), [], {
		gold,
	}).attack;
// An ogre beside the player in a corridor, struck once by a fixed lowest-damage hit.
const strike = (gold: number) => {
	const base = createGameState(createCorridorEncounter());
	const state: GameState = {
		...base,
		gold,
		equipment: createEquipment(blade),
		run: { ...base.run, playerCoordinate: { row: 1, col: 5 } },
		monsters: [
			{
				id: "1:1",
				kind: "ogre",
				floorNumber: 1,
				coordinate: { row: 1, col: 6 },
				health: 20,
				intent: { type: "idle" },
				lastDamagedTurn: null,
			},
		],
	};
	const after = resolvePlayerAction(
		state,
		{ type: "move", direction: "right" },
		() => ({ d20: () => 20, damage: (min: number) => min }),
	).state;
	return 20 - (after.monsters[0]?.health ?? 0);
};

describe("Goldbound Blade", () => {
	it("adds +1 attack per 1,000 carried gold, up to +4, and nothing on other weapons", () => {
		expect(goldBoundBonus(blade, 0)).toBe(0);
		expect(goldBoundBonus(blade, 999)).toBe(0);
		expect(goldBoundBonus(blade, 1000)).toBe(1);
		expect(goldBoundBonus(blade, 3999)).toBe(3);
		expect(goldBoundBonus(blade, 10000)).toBe(4);
		expect(goldBoundBonus({ id: "s", kind: "iron-sword" }, 10000)).toBe(0);
		expect(attack(4000) - attack(0)).toBe(4);
		expect(attack(10000, { id: "s", kind: "iron-sword" })).toBe(
			attack(0, { id: "s", kind: "iron-sword" }),
		);
	});

	it("hits harder in melee with more gold in hand", () => {
		expect(strike(4000) - strike(0)).toBeGreaterThan(0);
	});

	it("compares at its current edge, so gold makes it the better weapon", () => {
		const base = createGameState(createCorridorEncounter());
		const context = {
			...base,
			equipment: createEquipment({ id: "s", kind: "steel-sword" }),
		};
		expect(compareEquipment(blade, { ...context, gold: 0 })?.label).toBe(
			"Lower",
		);
		expect(compareEquipment(blade, { ...context, gold: 4000 })?.label).toBe(
			"Better",
		);
	});

	it("keeps a bought weapons-store copy through a save", () => {
		const state = rareEquipmentAdventure("warding-cloak", "town");
		const id = "town-gear:weapons:goldbound-blade:0:1";
		const bought = {
			...state,
			bag: {
				items: [...state.bag.items, { id, kind: "goldbound-blade" as const }],
			},
			townEquipmentPurchases: [id],
			townEquipmentStock: state.townEquipmentStock.filter((i) => i.id !== id),
		};
		const parsed = parseSave(serializeSave(tacticalSnapshot(bought)));
		if (!parsed.ok) throw new Error(parsed.error);
		expect(restoreSave(parsed.value).state.bag).toEqual(bought.bag);
	});

	it("is a rare with a valid definition and one weapons-store copy", () => {
		expect(RARE_EQUIPMENT_KINDS).toContain("goldbound-blade");
		expect(() =>
			validateItemDefinition(ITEM_DEFINITIONS["goldbound-blade"]),
		).not.toThrow();
		const offers = Object.values(TOWN_EQUIPMENT_OFFERS).filter(
			(offer) => offer.item.kind === "goldbound-blade",
		);
		expect(offers).toHaveLength(1);
		expect(offers[0]).toMatchObject({ store: "weapons", price: 1200 });
	});
});
