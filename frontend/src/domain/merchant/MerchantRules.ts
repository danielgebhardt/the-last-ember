import { haggledPrice, haggledSale } from "../game/PerkEffects";
import type { Progression } from "../game/Progression";
import { equipmentSlotFor } from "../items/Equipment";
import { ITEM_DEFINITIONS, type ItemInstance } from "../items/Item";

export const MERCHANT_OFFERS = {
	"healing-potion": { price: 150 },
	"mana-potion": { price: 200 },
	"greater-healing-potion": { price: 450 },
	"greater-mana-potion": { price: 600 },
} as const;
export type MerchantSupply = keyof typeof MERCHANT_OFFERS;
export type MerchantStock = Readonly<Record<MerchantSupply, number>>;
export const createMerchantStock = (): MerchantStock => ({
	"healing-potion": 10,
	"mana-potion": 10,
	"greater-healing-potion": 10,
	"greater-mana-potion": 10,
});
export const equipmentSalePrice = (item: ItemInstance): number | null =>
	equipmentSlotFor(item) === null
		? null
		: 10 +
			Math.ceil(ITEM_DEFINITIONS[item.kind].minFloor / 4) * 10 +
			(item.enchantment ?? 0) * 5;

// What this buyer actually pays or receives, after Haggler.
export const merchantPrice = (
	kind: MerchantSupply,
	progression: Progression,
): number => haggledPrice(progression, MERCHANT_OFFERS[kind].price);
export const equipmentSaleGold = (
	item: ItemInstance,
	progression: Progression,
): number | null => {
	const gold = equipmentSalePrice(item);
	return gold === null ? null : haggledSale(progression, gold);
};

export const isMerchantStock = (value: unknown): value is MerchantStock => {
	if (typeof value !== "object" || value === null || Array.isArray(value))
		return false;
	const stock = value as Record<string, unknown>;
	return (
		Object.keys(stock).length === Object.keys(MERCHANT_OFFERS).length &&
		Object.keys(MERCHANT_OFFERS).every(
			(kind) =>
				typeof stock[kind] === "number" &&
				Number.isInteger(stock[kind]) &&
				(stock[kind] as number) >= 0 &&
				(stock[kind] as number) <= 10,
		)
	);
};
