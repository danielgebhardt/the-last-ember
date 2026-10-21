// @vitest-environment node

import { describe, expect, it } from "vitest";
import { deriveCombatStats } from "../domain/game/CombatStats";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { savedAdventure } from "./SaveTestHelpers";

describe("Versioned owned enchantments", () => {
	it("round-trips equipped, bag and dropped bonuses while selecting only declared item fields", () => {
		const document = savedAdventure();
		const sword = document.state.equipment.mainHand;
		if (!sword) throw new Error("Expected sword");
		document.state.equipment = {
			...document.state.equipment,
			mainHand: { ...sword, enchantment: 2 },
		};
		document.state.bag = {
			items: [{ id: "bag:enhanced", kind: "wooden-shield", enchantment: 1 }],
		};
		const location = document.state.floorItems.find(
			(i) => i.item.kind !== "cure",
		);
		if (!location) throw new Error("Expected item tile");
		document.state.floorItems = [
			...document.state.floorItems,
			{
				...location,
				item: { id: "dropped:enhanced", kind: "leather-cap", enchantment: 3 },
			},
		];
		const parsed = parseSave(serializeSave(document));
		if (!parsed.ok) throw new Error(parsed.error);
		expect(parsed.value.version).toBe(30);
		const restored = restoreSave(parsed.value);
		expect(restored.state.equipment.mainHand?.enchantment).toBe(2);
		expect(restored.state.bag.items[0].enchantment).toBe(1);
		expect(restored.state.floorItems.at(-1)?.item.enchantment).toBe(3);
		expect(
			deriveCombatStats(restored.state.equipment, restored.state.progression)
				.weaponBonus,
		).toBe(3);
		const extra = {
			...restored.state,
			bag: {
				items: restored.state.bag.items.map((item) => ({
					...item,
					debugNote: "not saved",
				})),
			},
		};
		const written = createSaveDocument(
			extra,
			restored.exploration,
			restored.configuration,
			restored.fog,
		);
		expect(written.state.bag.items[0]).not.toHaveProperty("debugNote");
	});
	it.each([-1, 0, 4, 1.5, "1", null])(
		"rejects invalid enhancement %s before replacement",
		(bonus) => {
			const document = savedAdventure();
			expect(
				parseSave(
					JSON.stringify({
						...document,
						state: {
							...document.state,
							equipment: {
								...document.state.equipment,
								mainHand: {
									...document.state.equipment.mainHand,
									enchantment: bonus,
								},
							},
						},
					}),
				).ok,
			).toBe(false);
		},
	);
	it("rejects enchanted rings and consumables", () => {
		const document = savedAdventure();
		for (const kind of ["ring-strength", "healing-potion"]) {
			expect(
				parseSave(
					JSON.stringify({
						...document,
						state: {
							...document.state,
							bag: { items: [{ id: "bag:forged", kind, enchantment: 1 }] },
						},
					}),
				).ok,
			).toBe(false);
		}
	});
	it("rejects unexpected equipment slots safely in the current format", () => {
		const document = savedAdventure();
		for (const extra of [null, 10, { id: "extra:gear", kind: "not-a-kind" }]) {
			const content = JSON.stringify({
				...document,
				version: 30,
				state: {
					...document.state,
					equipment: { ...document.state.equipment, extra },
				},
			});
			expect(() => parseSave(content)).not.toThrow();
			expect(parseSave(content).ok).toBe(false);
		}
	});
});
