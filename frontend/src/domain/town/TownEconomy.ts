import { ITEM_DEFINITIONS, type ItemKind } from "../items/Item";
import { MERCHANT_OFFERS } from "../merchant/MerchantRules";
// Authored stock, independent of seed. Later variation must use its own saved stream.
export const TOWN_POTION_OFFERS = {
	"healing-potion": {
		price: MERCHANT_OFFERS["healing-potion"].price,
		quantity: 4,
	},
	"mana-potion": { price: MERCHANT_OFFERS["mana-potion"].price, quantity: 4 },
	"greater-healing-potion": {
		price: MERCHANT_OFFERS["greater-healing-potion"].price,
		quantity: 4,
	},
	"greater-mana-potion": {
		price: MERCHANT_OFFERS["greater-mana-potion"].price,
		quantity: 4,
	},
	antidote: { price: 125, quantity: 4 },
	"strength-potion": { price: 1500, quantity: 2 },
	"dexterity-potion": { price: 1500, quantity: 2 },
	"intelligence-potion": { price: 1500, quantity: 2 },
} as const satisfies Partial<
	Record<ItemKind, { price: number; quantity: number }>
>;
export type TownPotion = keyof typeof TOWN_POTION_OFFERS;
export type TownPotionStock = Readonly<Record<TownPotion, number>>;
export const townPotionKinds = Object.keys(TOWN_POTION_OFFERS) as TownPotion[];
export const createTownPotionStock = (): TownPotionStock =>
	Object.fromEntries(
		townPotionKinds.map((kind) => [kind, TOWN_POTION_OFFERS[kind].quantity]),
	) as TownPotionStock;
export const isTownPotionStock = (value: unknown): value is TownPotionStock => {
	if (typeof value !== "object" || value === null || Array.isArray(value))
		return false;
	const stock = value as Record<string, unknown>;
	return (
		Object.keys(stock).length === townPotionKinds.length &&
		townPotionKinds.every(
			(kind) =>
				typeof stock[kind] === "number" &&
				Number.isSafeInteger(stock[kind]) &&
				Number(stock[kind]) >= 0 &&
				Number(stock[kind]) <= TOWN_POTION_OFFERS[kind].quantity,
		)
	);
};
// Shop copy keeps the effect and drops dungeon-use mechanics (turn cost, stacking rules)
// that the bag, item details and Catalog still explain in full.
export const townPotionDescription = (kind: TownPotion): string =>
	ITEM_DEFINITIONS[kind].description
		.replace(
			" Each bottle stacks with previous gains, separately from level, gear and temporary buffs.",
			"",
		)
		.replace("Drinking uses one turn; it does not", "It does not")
		.replace(/ (Drinking uses|Uses) one turn\./, "")
		.trim();
