// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createEquipment } from "../domain/items/Equipment";
import { compareEquipment } from "../domain/items/EquipmentComparison";
import type { ItemKind } from "../domain/items/Item";

import { createComparisonContext } from "./EquipmentComparisonTestHelpers";

const item = (kind: ItemKind) => ({ id: kind, kind });
describe("Comparing gear with its compatible equipped slot", () => {
	it("shows the Intelligence spell bonus gained by replacing armor with a scholar robe", () => {
		const context = createComparisonContext(
			createEquipment(null, null, item("plate-armor")),
		);
		expect(compareEquipment(item("scholar-robe"), context)).toMatchObject({
			label: "Tradeoff",
			before: { spellPowerBonus: 0, armor: 3 },
			after: { spellPowerBonus: 1, armor: 1 },
		});
	});
	it.each([
		["iron-sword", "short-sword", "Better", 1, 2],
		["iron-sword", "iron-sword", "Same", 2, 2],
		["short-sword", "iron-sword", "Lower", 2, 1],
	] as const)(
		"compares carried %s against equipped %s",
		(carried, equipped, label, beforeDamage, afterDamage) => {
			expect(
				compareEquipment(
					item(carried),
					createComparisonContext(createEquipment(item(equipped))),
				),
			).toMatchObject({
				slot: "mainHand",
				label,
				before: { minDamage: beforeDamage },
				after: { minDamage: afterDamage },
			});
		},
	);
	it("compares chest armor by replacing only chest while retaining helmet and shield", () => {
		const equipment = createEquipment(
			null,
			item("wooden-shield"),
			item("leather-armor"),
			item("iron-helmet"),
		);
		expect(
			compareEquipment(item("chain-armor"), createComparisonContext(equipment)),
		).toMatchObject({
			slot: "chest",
			before: { armor: 4 },
			after: { armor: 5 },
			label: "Better",
		});
	});
	it("compares a helmet by replacing only the head slot in total armor", () => {
		const equipment = createEquipment(
			null,
			item("wooden-shield"),
			item("chain-armor"),
			item("iron-helmet"),
		);
		expect(
			compareEquipment(item("leather-cap"), createComparisonContext(equipment)),
		).toMatchObject({
			slot: "head",
			before: { armor: 5 },
			after: { armor: 4 },
			label: "Lower",
		});
	});
	it("previews an equipped ring's own sold-out shop offer without duplicating it across both hands", () => {
		const ring = {
			id: "town-gear:armor:copper-ring:0:1",
			kind: "copper-ring",
		} as const;
		const context = createComparisonContext(
			createEquipment(null, null, null, null, ring),
		);
		expect(compareEquipment(ring, context, "rightRing")).toMatchObject({
			slot: "rightRing",
			label: "Same",
		});
		expect(compareEquipment(ring, context)).toMatchObject({ label: "Same" });
	});
	it("treats a useful item for an empty slot as an upgrade over the current loadout", () => {
		expect(
			compareEquipment(item("wooden-shield"), createComparisonContext()),
		).toMatchObject({
			slot: "offHand",
			before: { armor: 0 },
			after: { armor: 1 },
			label: "Better",
		});
	});
	it.each(["healing-potion", "cure"] as const)(
		"does not compare %s",
		(kind) => {
			expect(
				compareEquipment(item(kind), createComparisonContext()),
			).toBeNull();
		},
	);
});
