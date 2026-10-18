// @vitest-environment node

import { describe, expect, it } from "vitest";
import { ITEM_DEFINITIONS, type ItemKind } from "../domain/items/Item";
import {
	createMerchantStock,
	equipmentSalePrice,
	MERCHANT_OFFERS,
} from "../domain/merchant/MerchantRules";
import {
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { savedAdventure } from "./SaveTestHelpers";

describe("Shared merchant stock and prices", () => {
	it("starts each adventure with independent stock of ten of each of four supplies", () => {
		const a = createMerchantStock(),
			b = createMerchantStock();
		expect(a).toEqual({
			"healing-potion": 10,
			"mana-potion": 10,
			"greater-healing-potion": 10,
			"greater-mana-potion": 10,
		});
		expect(a).not.toBe(b);
		expect(
			Object.values(MERCHANT_OFFERS).reduce(
				(sum, offer) => sum + offer.price * 10,
				0,
			),
		).toBe(14000);
	});
	it("offers nominal equipment values and excludes every consumable and quest item", () => {
		for (const [kind, definition] of Object.entries(ITEM_DEFINITIONS)) {
			const price = equipmentSalePrice({ id: "bag:1", kind: kind as ItemKind });
			if (
				["weapon", "shield", "chest-armor", "helmet", "ring"].includes(
					definition.type,
				)
			)
				expect(price).toBeGreaterThan(0);
			else expect(price).toBeNull();
			if (price !== null) expect(price).toBeLessThan(150);
		}
		expect(
			equipmentSalePrice({ id: "bag:1", kind: "runeblade" }),
		).toBeGreaterThan(
			equipmentSalePrice({ id: "bag:2", kind: "short-sword" }) ?? 0,
		);
	});
	it("persists partially spent shared stock", () => {
		const document = savedAdventure();
		document.state.merchantStock = {
			...createMerchantStock(),
			"mana-potion": 3,
		};
		const parsed = parseSave(serializeSave(document));
		if (!parsed.ok) throw new Error(parsed.error);
		expect(restoreSave(parsed.value).state.merchantStock["mana-potion"]).toBe(
			3,
		);
	});
	it.each([-1, 11, 0.5, NaN, "10"])(
		"rejects invalid shared stock %s",
		(count) => {
			const document = savedAdventure();
			expect(
				parseSave(
					JSON.stringify({
						...document,
						state: {
							...document.state,
							merchantStock: { ...createMerchantStock(), "mana-potion": count },
						},
					}),
				).ok,
			).toBe(false);
		},
	);
});
