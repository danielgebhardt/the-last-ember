// @vitest-environment node
import { expect, it } from "vitest";
import { ITEM_DEFINITIONS } from "../domain/items/Item";
import {
	createMerchantStock,
	equipmentSalePrice,
} from "../domain/merchant/MerchantRules";
import {
	createTownPotionStock,
	isTownPotionStock,
	TOWN_POTION_OFFERS,
	townPotionKinds,
} from "../domain/town/TownEconomy";

it("stocks only supported potions with finite saved ownership separate from wandering stock", () => {
	const stock = createTownPotionStock();
	expect(townPotionKinds).toEqual(
		expect.arrayContaining(
			Object.entries(ITEM_DEFINITIONS)
				.filter(
					([kind, d]) => d.type === "potion" && kind !== "cure-disease-potion",
				)
				.map(([kind]) => kind),
		),
	);
	expect(townPotionKinds).toHaveLength(8);
	for (const kind of townPotionKinds) {
		expect(ITEM_DEFINITIONS[kind].type).toBe("potion");
		expect(equipmentSalePrice({ id: "bottle", kind })).toBeNull();
	}
	expect(stock["healing-potion"]).toBe(4);
	expect(createMerchantStock()["healing-potion"]).toBe(10);
	expect(createTownPotionStock()).toEqual(stock);
	expect(createTownPotionStock()).not.toBe(stock);
	expect(
		Object.values(TOWN_POTION_OFFERS).reduce(
			(sum, offer) => sum + offer.price * offer.quantity,
			0,
		),
	).toBe(15100);
});
it("accepts actual depletion but rejects refill, fractional, missing and extra stock", () => {
	const stock = createTownPotionStock();
	expect(isTownPotionStock({ ...stock, antidote: 0 })).toBe(true);
	for (const invalid of [
		null,
		{},
		{ ...stock, antidote: 5 },
		{ ...stock, antidote: 0.5 },
		{ ...stock, antidote: -1 },
		{ ...stock, antidote: NaN },
		{ ...stock, unknown: 1 },
	])
		expect(isTownPotionStock(invalid)).toBe(false);
});

it("prices permanent stat points at 1,500 gold with only two bottles per attribute", () => {
	for (const kind of [
		"strength-potion",
		"dexterity-potion",
		"intelligence-potion",
	] as const)
		expect(TOWN_POTION_OFFERS[kind]).toEqual({ price: 1500, quantity: 2 });
});
