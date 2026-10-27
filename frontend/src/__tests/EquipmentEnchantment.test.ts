// @vitest-environment node
import { describe, expect, it } from "vitest";
import { deriveCombatStats } from "../domain/game/CombatStats";
import { createGameState, type GameState } from "../domain/game/GameState";
import { bagSlots } from "../domain/items/Bag";
import { compareEquipment } from "../domain/items/EquipmentComparison";
import { ITEM_DEFINITIONS, type ItemKind } from "../domain/items/Item";
import { equipmentSalePrice } from "../domain/merchant/MerchantRules";
import { createTownLocation } from "../domain/town/TownLocation";
import { resolvePlayerActionWithHits as resolvePlayerAction } from "./ControlledCombatTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";

const encounter = (): GameState => ({
	...createGameState(createCorridorEncounter()),
	monsters: [],
	objects: [],
	bag: {
		items: Array.from({ length: 4 }, (_, i) => ({
			id: `bag:scroll:${i}`,
			kind: "enchantment-scroll" as const,
		})),
	},
});
const enchant = {
	type: "enchant" as const,
	scrollId: "bag:scroll:0",
	targetItemId: "starting:main-hand",
};
describe("Bounded equipment enchantment", () => {
	it("enhances one equipped weapon instance, consumes one stacked scroll and commits one turn", () => {
		const state = encounter(),
			result = resolvePlayerAction(state, enchant);
		expect(bagSlots(state.bag)).toHaveLength(1);
		expect(result.turnAdvanced).toBe(true);
		expect(result.state.turn).toBe(1);
		expect(result.state.bag.items).toHaveLength(3);
		expect(result.state.equipment.mainHand).toMatchObject({
			id: "starting:main-hand",
			kind: "short-sword",
			enchantment: 1,
		});
		expect(
			deriveCombatStats(result.state.equipment, result.state.progression)
				.weaponBonus,
		).toBe(2);
		expect(ITEM_DEFINITIONS["short-sword"].attackBonus).toBe(1);
		const weapon = result.state.equipment.mainHand;
		if (!weapon) throw new Error("Expected weapon");
		expect(equipmentSalePrice(weapon)).toBe(25);
	});
	it.each(["wooden-shield", "leather-armor", "leather-cap"] as const)(
		"enhances carried %s armor and comparison without changing the catalog",
		(kind) => {
			const initial = encounter();
			const state = {
				...initial,
				bag: { items: [...initial.bag.items, { id: "bag:target", kind }] },
			};
			const result = resolvePlayerAction(state, {
				...enchant,
				targetItemId: "bag:target",
			}).state;
			const item = result.bag.items.find((i) => i.id === "bag:target");
			if (!item) throw new Error("Expected target");
			expect(item.enchantment).toBe(1);
			expect(compareEquipment(item, state)?.after.armor).toBe(
				(kind === "wooden-shield" ? 0 : 1) + ITEM_DEFINITIONS[kind].armor + 1,
			);
		},
	);
	it("caps each item at +3 and rejects exhausted, unsupported and foreign targets freely", () => {
		let state = encounter();
		for (let i = 0; i < 3; i++)
			state = resolvePlayerAction(state, {
				...enchant,
				scrollId: `bag:scroll:${i}`,
			}).state;
		const capped = resolvePlayerAction(state, {
			...enchant,
			scrollId: "bag:scroll:3",
		});
		expect(capped.state).toBe(state);
		expect(capped.turnAdvanced).toBe(false);
		expect(
			resolvePlayerAction(state, {
				...enchant,
				targetItemId: "not-owned",
				scrollId: "bag:scroll:3",
			}).state,
		).toBe(state);
		for (const kind of [
			"ring-strength",
			"healing-potion",
			"cure",
		] as ItemKind[]) {
			const owned = {
				...encounter(),
				bag: { items: [...encounter().bag.items, { id: "bag:target", kind }] },
			};
			expect(
				resolvePlayerAction(owned, { ...enchant, targetItemId: "bag:target" })
					.state,
			).toBe(owned);
		}
		expect(resolvePlayerAction(state, enchant).state).toBe(state);
	});
	it("enchanting in town consumes one scroll without spending a turn", () => {
		const initial = encounter();
		const state = { ...initial, town: createTownLocation() };
		const result = resolvePlayerAction(state, enchant);
		expect(result.turnAdvanced).toBe(false);
		expect(result.state.turn).toBe(state.turn);
		expect(result.state.town).toEqual(state.town);
		expect(result.state.equipment.mainHand?.enchantment).toBe(1);
		expect(result.state.bag.items).toHaveLength(3);
		expect(state.equipment.mainHand?.enchantment).toBeUndefined();
		const invalid = resolvePlayerAction(result.state, {
			...enchant,
			scrollId: "not-owned",
		});
		expect(invalid.turnAdvanced).toBe(false);
		expect(invalid.state).toBe(result.state);
	});
	it("applies new armor before the same turn's enemy response", () => {
		const state = {
			...encounter(),
			monsters: [
				{
					id: "1:1",
					kind: "orc" as const,
					floorNumber: 1,
					coordinate: { row: 1, col: 2 },
					health: 7,
					intent: { type: "idle" as const },
				},
			],
		};
		const result = resolvePlayerAction(state, {
			...enchant,
			targetItemId: "starting:off-hand",
		}).state;
		expect(deriveCombatStats(result.equipment, result.progression).armor).toBe(
			2,
		);
		expect(result.player.health).toBe(8);
		expect(result.turn).toBe(1);
	});
});
