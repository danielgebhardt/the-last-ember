// @vitest-environment node
import { expect, it, vi } from "vitest";
import { SPELL_DEFINITIONS, spellPotency } from "../domain/game/Spells";
import {
	createEquipment,
	replaceEquipmentSlot,
} from "../domain/items/Equipment";
import * as EquipmentBonuses from "../domain/items/EquipmentBonuses";
import { compareEquipment } from "../domain/items/EquipmentComparison";
import { createComparisonContext } from "./EquipmentComparisonTestHelpers";

it("uses progression, active Intelligence and the other ring in both destinations without changing resources", () => {
	const context = createComparisonContext(
		createEquipment(
			{ id: "sword", kind: "iron-sword", enchantment: 3 },
			{ id: "shield", kind: "wooden-shield", enchantment: 2 },
			null,
			null,
			{ id: "left", kind: "ring-intelligence" },
			{ id: "right", kind: "ring-strength" },
		),
		{
			progression: { experience: 30 },
			effects: [
				{
					actorId: "player",
					floorNumber: null,
					kind: "enlightened",
					remaining: 4,
				},
			],
		},
	);
	const snapshot = structuredClone(context);
	const ring = { id: "carried", kind: "ring-intelligence" } as const;
	expect(compareEquipment(ring, context, "leftRing")).toMatchObject({
		label: "Same",
		before: { spellPowerBonus: 3 },
		after: { spellPowerBonus: 3 },
	});
	expect(compareEquipment(ring, context, "rightRing")).toMatchObject({
		label: "Tradeoff",
		before: { spellPowerBonus: 3, armor: 3 },
		after: { spellPowerBonus: 4, armor: 3 },
	});
	const after = replaceEquipmentSlot(context.equipment, "rightRing", ring);
	expect(
		spellPotency(
			context.progression,
			SPELL_DEFINITIONS["magic-missile"],
			context.equipment,
			context.effects,
		),
	).toMatchObject({ minimumDamage: 6, maximumDamage: 8 });
	expect(
		spellPotency(
			context.progression,
			SPELL_DEFINITIONS["magic-missile"],
			after,
			context.effects,
		),
	).toMatchObject({ minimumDamage: 7, maximumDamage: 9 });
	expect(
		spellPotency(
			context.progression,
			SPELL_DEFINITIONS.heal,
			context.equipment,
			context.effects,
		),
	).toMatchObject({ healing: 7 });
	expect(
		spellPotency(
			context.progression,
			SPELL_DEFINITIONS.heal,
			after,
			context.effects,
		),
	).toMatchObject({ healing: 8 });
	expect(context).toEqual(snapshot);
});

it("shows a spell bonus downgrade when replacing an Intelligence ring with mana capacity", () => {
	const context = createComparisonContext(
		createEquipment(
			null,
			null,
			null,
			null,
			{ id: "left", kind: "ring-intelligence" },
			{ id: "right", kind: "ring-intelligence" },
		),
	);
	expect(
		compareEquipment({ id: "mana", kind: "ring-mana" }, context, "leftRing"),
	).toMatchObject({
		label: "Tradeoff",
		before: { maxMana: 14, spellPowerBonus: 2, magicResistance: 7 },
		after: { maxMana: 16, spellPowerBonus: 1, magicResistance: 6 },
	});
});

it("rounds odd Intelligence down through the same modifier used by actual spells", () => {
	// Current gear bonuses are even. This controlled +3 ring exercises the supported odd-value rule.
	const original = EquipmentBonuses.equipmentBonuses;
	const oddRing = vi
		.spyOn(EquipmentBonuses, "equipmentBonuses")
		.mockImplementation((equipment) => {
			const bonuses = original(equipment);
			return equipment?.leftRing?.kind === "ring-intelligence"
				? { ...bonuses, intelligence: bonuses.intelligence + 1 }
				: bonuses;
		});
	try {
		const context = createComparisonContext(
			createEquipment(null, null, null, null, {
				id: "left",
				kind: "ring-intelligence",
			}),
		);
		const robe = { id: "robe", kind: "scholar-robe" } as const;
		expect(compareEquipment(robe, context)).toMatchObject({
			before: { intelligence: 13, spellPowerBonus: 1 },
			after: { intelligence: 15, spellPowerBonus: 2 },
		});
		const equipped = replaceEquipmentSlot(context.equipment, "chest", robe);
		expect(
			spellPotency(
				context.progression,
				SPELL_DEFINITIONS.heal,
				context.equipment,
			),
		).toMatchObject({ healing: 5 });
		expect(
			spellPotency(context.progression, SPELL_DEFINITIONS.heal, equipped),
		).toMatchObject({ healing: 6 });
	} finally {
		oddRing.mockRestore();
	}
});

it("keeps control fixed while ongoing healing uses its separate half-modifier formula", () => {
	const context = createComparisonContext();
	const robe = { id: "robe", kind: "scholar-robe" } as const;
	const after = replaceEquipmentSlot(context.equipment, "chest", robe);
	expect(compareEquipment(robe, context)?.after.spellPowerBonus).toBe(1);
	expect(
		spellPotency(context.progression, SPELL_DEFINITIONS.web, after),
	).toEqual(
		spellPotency(context.progression, SPELL_DEFINITIONS.web, context.equipment),
	);
	expect(
		spellPotency(context.progression, SPELL_DEFINITIONS.renewal, after),
	).toEqual(
		spellPotency(
			context.progression,
			SPELL_DEFINITIONS.renewal,
			context.equipment,
		),
	);
});
