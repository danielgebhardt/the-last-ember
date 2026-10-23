// @vitest-environment node
import { describe, expect, it } from "vitest";
import { deriveCombatStats } from "../domain/game/CombatStats";
import { createGameState, type GameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { createProgression } from "../domain/game/Progression";
import { createEquipment } from "../domain/items/Equipment";
import {
	ITEM_DEFINITIONS,
	type ItemInstance,
	RARE_EQUIPMENT_KINDS,
	validateItemDefinition,
} from "../domain/items/Item";
import { bloodrageBonus } from "../domain/items/ItemValues";
import { TOWN_EQUIPMENT_OFFERS } from "../domain/town/TownEquipmentStock";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";

const axe = { id: "axe", kind: "bloodrage-axe" as const };
const at = (health: number) => ({ health, maxHealth: 28 });
const corridor = (health: number, mainHand: ItemInstance = axe): GameState => {
	const base = createGameState(createCorridorEncounter());
	return {
		...base,
		player: { health, maxHealth: 28 },
		equipment: createEquipment(mainHand),
		run: { ...base.run, playerCoordinate: { row: 1, col: 5 } },
		monsters: [],
	};
};
// One fixed lowest-damage hit on an ogre beside the player.
const strike = (health: number) => {
	const state: GameState = {
		...corridor(health),
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
const drink = (state: GameState) => {
	const withPotion = {
		...state,
		bag: { items: [{ id: "p", kind: "healing-potion" as const }] },
	};
	return resolvePlayerAction(withPotion, { type: "consume", itemId: "p" }).state
		.player.health;
};

describe("Bloodrage Axe", () => {
	it("adds +1 attack per 25% of maximum health missing, up to +3", () => {
		expect(bloodrageBonus(axe, at(28))).toBe(0);
		expect(bloodrageBonus(axe, at(22))).toBe(0);
		expect(bloodrageBonus(axe, at(21))).toBe(1);
		expect(bloodrageBonus(axe, at(14))).toBe(2);
		expect(bloodrageBonus(axe, at(7))).toBe(3);
		expect(bloodrageBonus(axe, at(1))).toBe(3);
		expect(bloodrageBonus({ id: "s", kind: "iron-sword" }, at(1))).toBe(0);
		expect(strike(7)).toBeGreaterThan(strike(28));
	});

	it("costs 1 armor while wielded, never below zero", () => {
		const armor = (offHand: { id: string; kind: "wooden-shield" } | null) =>
			deriveCombatStats(createEquipment(axe, offHand), createProgression())
				.armor;
		const shield = { id: "w", kind: "wooden-shield" as const };
		expect(armor(shield)).toBe(
			deriveCombatStats(
				createEquipment({ id: "s", kind: "iron-sword" }, shield),
				createProgression(),
			).armor - 1,
		);
		expect(armor(null)).toBe(0);
	});

	it("halves health potion healing while wielded, and only then", () => {
		const healed = drink(corridor(2)) - 2;
		const normal = drink(corridor(2, { id: "s", kind: "iron-sword" })) - 2;
		expect(healed).toBe(Math.max(1, Math.floor(normal / 2)));
		expect(healed).toBeLessThan(normal);
	});

	it("is a rare with a valid definition and one weapons-store copy", () => {
		expect(RARE_EQUIPMENT_KINDS).toContain("bloodrage-axe");
		expect(() =>
			validateItemDefinition(ITEM_DEFINITIONS["bloodrage-axe"]),
		).not.toThrow();
		const offers = Object.values(TOWN_EQUIPMENT_OFFERS).filter(
			(offer) => offer.item.kind === "bloodrage-axe",
		);
		expect(offers).toHaveLength(1);
		expect(offers[0]).toMatchObject({ store: "weapons", price: 1500 });
	});
});
