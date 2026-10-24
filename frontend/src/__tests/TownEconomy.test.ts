// @vitest-environment node
import { expect, it } from "vitest";
import { ITEM_DEFINITIONS } from "../domain/items/Item";
import {
	createMerchantStock,
	equipmentSalePrice,
} from "../domain/merchant/MerchantRules";
import { parseSave, restoreSave } from "../domain/saves/SaveFormat";
import {
	createTownPotionStock,
	isTownPotionStock,
	TOWN_POTION_OFFERS,
	townPotionDescription,
	townPotionKinds,
} from "../domain/town/TownEconomy";
import v32 from "./fixtures/adventure-v32.json?raw";

it("stocks only supported potions with finite saved ownership separate from wandering stock", () => {
	const stock = createTownPotionStock();
	expect(townPotionKinds).toEqual(
		expect.arrayContaining(
			Object.entries(ITEM_DEFINITIONS)
				.filter(
					// Other portable affliction remedies have no town stock.
					([, d]) => d.type === "potion" && !("removesAfflictions" in d),
				)
				.map(([kind]) => kind),
		),
	);
	expect(townPotionKinds).toHaveLength(9);
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
	).toBe(15400);
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
	// Saves from before Bandages joined the store lack their stock; only that kind may be absent.
	const { bandages: _, ...older } = stock;
	expect(isTownPotionStock(older)).toBe(true);
	const { antidote: __, ...missing } = stock;
	expect(isTownPotionStock(missing)).toBe(false);
});

it("prices permanent stat points at 1,500 gold with only two bottles per attribute", () => {
	for (const kind of [
		"strength-potion",
		"dexterity-potion",
		"intelligence-potion",
	] as const)
		expect(TOWN_POTION_OFFERS[kind]).toEqual({ price: 1500, quantity: 2 });
});

it("sells Bandages, and stocks them in full for a save from before they were offered", () => {
	expect(townPotionKinds).toContain("bandages");
	expect(TOWN_POTION_OFFERS.bandages).toEqual({ price: 75, quantity: 4 });
	expect(townPotionDescription("bandages")).toBe(
		"Stops Bleeding. Does not restore health.",
	);
	expect(JSON.parse(v32).state.townPotionStock).not.toHaveProperty("bandages");
	const parsed = parseSave(v32);
	if (!parsed.ok) throw new Error(parsed.error);
	expect(restoreSave(parsed.value).state.townPotionStock.bandages).toBe(4);
});
