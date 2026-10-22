// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createEquipment } from "../domain/items/Equipment";
import { compareEquipment } from "../domain/items/EquipmentComparison";
import type { ItemInstance, ItemKind } from "../domain/items/Item";
import { createComparisonContext as context } from "./EquipmentComparisonTestHelpers";

const item = (kind: ItemKind, enchantment?: number): ItemInstance => ({
	id: `candidate:${kind}`,
	kind,
	...(enchantment ? { enchantment } : {}),
});

describe("Practical loadout previews", () => {
	it.each([false, true])(
		"previews the actual evasion step when the other Dexterity ring is present: %s",
		(otherRing) => {
			const current = {
				...context(
					createEquipment(
						null,
						null,
						null,
						null,
						null,
						otherRing ? { id: "worn:dex-ring", kind: "ring-dexterity" } : null,
					),
				),
				progression: { experience: 800 },
			};
			expect(
				compareEquipment(item("ring-dexterity"), current, "leftRing"),
			).toMatchObject({
				// Evasion steps at every 4 Dexterity: 20 → 22 crosses one, 22 → 24 doesn't.
				before: {
					dexterity: otherRing ? 22 : 20,
					evadeChance: otherRing ? 35 : 30,
					hitChance: 95,
				},
				after: {
					dexterity: otherRing ? 24 : 22,
					evadeChance: 35,
					hitChance: 95,
				},
			});
		},
	);
	it("shows an enchanted weapon's whole damage range at the current level", () => {
		const current = {
			...context(
				createEquipment({ id: "worn", kind: "iron-sword", enchantment: 2 }),
			),
			progression: { experience: 30 },
		};
		const preview = compareEquipment(item("short-sword", 3), current);
		expect(preview).toMatchObject({
			slot: "mainHand",
			label: "Same",
			before: { minDamage: 5, maxDamage: 7 },
			after: { minDamage: 5, maxDamage: 7 },
		});
	});
	it("includes the other ring, armor enchantments and active player effects", () => {
		const current = {
			...context(
				createEquipment(
					item("iron-sword", 1),
					item("wooden-shield", 2),
					item("plate-armor"),
					item("iron-helmet"),
					{ id: "worn:ring", kind: "ring-strength" },
					item("copper-ring"),
				),
			),
			progression: { experience: 30 },
			effects: [
				{
					actorId: "player",
					floorNumber: null,
					kind: "strengthened" as const,
					remaining: 4,
				},
				{
					actorId: "player",
					floorNumber: null,
					kind: "protected" as const,
					remaining: 4,
				},
				{
					actorId: "monster",
					floorNumber: 1,
					kind: "strengthened" as const,
					remaining: 4,
				},
			],
		};
		expect(
			compareEquipment(item("ring-intelligence"), current, "leftRing"),
		).toMatchObject({
			label: "Tradeoff",
			before: { minDamage: 6, maxDamage: 8, armor: 11, maxMana: 12 },
			after: { minDamage: 5, maxDamage: 7, armor: 11, maxMana: 14 },
		});
		expect(
			compareEquipment(item("ring-intelligence"), current, "rightRing"),
		).toMatchObject({
			label: "Tradeoff",
			after: { minDamage: 6, maxDamage: 8, armor: 10, maxMana: 14 },
		});
	});
	it("shows a Dexterity benefit even when the hit chance is already capped", () => {
		// Level 6: Dexterity 16 caps hit chance; the ring reaches the 18 evasion step.
		const current = { ...context(), progression: { experience: 200 } };
		expect(
			compareEquipment(item("ring-dexterity"), current, "leftRing"),
		).toMatchObject({
			label: "Better",
			before: { hitChance: 95, evadeChance: 25 },
			after: { hitChance: 95, evadeChance: 30, dexterity: 18 },
		});
	});
	it("compares each ring destination and chooses the useful empty slot for the bag badge", () => {
		const current = context(
			createEquipment(null, null, null, null, item("ring-strength")),
		);
		expect(
			compareEquipment(item("ring-intelligence"), current, "leftRing")?.label,
		).toBe("Tradeoff");
		expect(
			compareEquipment(item("ring-intelligence"), current, "rightRing")?.label,
		).toBe("Better");
		expect(compareEquipment(item("ring-intelligence"), current)?.slot).toBe(
			"rightRing",
		);
	});
	it("preserves the existing health capacity and current resources while inspecting vitality", () => {
		const current = {
			...context(
				createEquipment(null, null, null, null, item("ring-vitality")),
			),
			player: { health: 7, maxHealth: 20 },
			mana: 3,
			turn: 12,
		};
		const original = structuredClone(current);
		expect(
			compareEquipment(item("ring-mana"), current, "leftRing"),
		).toMatchObject({
			label: "Tradeoff",
			before: { maxHealth: 20, maxMana: 10 },
			after: { maxHealth: 16, maxMana: 14 },
		});
		expect(current).toEqual(original);
	});
	it("uses active Intelligence when deriving mana capacity", () => {
		const current = {
			...context(),
			progression: { experience: 30 },
			effects: [
				{
					actorId: "player",
					floorNumber: null,
					kind: "enlightened" as const,
					remaining: 4,
				},
			],
		};
		expect(compareEquipment(item("scholar-robe"), current)).toMatchObject({
			label: "Better",
			before: { maxMana: 14, intelligence: 14 },
			after: { maxMana: 16, intelligence: 16, armor: 1 },
		});
	});
	it.each(["healing-potion", "cure"] as const)("does not compare %s", (kind) =>
		expect(compareEquipment(item(kind), context())).toBeNull(),
	);
	it("rejects an incompatible destination without changing worn gear", () => {
		const current = context();
		expect(
			compareEquipment(item("ring-intelligence"), current, "head"),
		).toBeNull();
		expect(current.equipment.head).toBeNull();
	});
});
