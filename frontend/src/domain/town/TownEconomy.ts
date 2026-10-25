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
	// A portable cure for Bleeding, dearer than one sanctuary treatment.
	bandages: { price: 75, quantity: 4 },
	"strength-potion": { price: 1500, quantity: 2 },
	"dexterity-potion": { price: 1500, quantity: 2 },
	"intelligence-potion": { price: 1500, quantity: 2 },
} as const satisfies Partial<
	Record<ItemKind, { price: number; quantity: number }>
>;
export type TownPotion = keyof typeof TOWN_POTION_OFFERS;
export type TownPotionStock = Readonly<Record<TownPotion, number>>;
// No Enchantment scrolls: a buyable +1 would undercut the tier-priced town forge.
export const TOWN_SCROLL_OFFERS = {
	"exit-scroll": { price: 200, quantity: 3 },
	"remove-curse-scroll": { price: 375, quantity: 2 },
} as const satisfies Partial<
	Record<ItemKind, { price: number; quantity: number }>
>;
export type TownScroll = keyof typeof TOWN_SCROLL_OFFERS;
export type TownScrollStock = Readonly<Record<TownScroll, number>>;
type Offers = Readonly<Record<string, { price: number; quantity: number }>>;
const createStock = <K extends string>(offers: Offers) =>
	Object.fromEntries(
		Object.keys(offers).map((kind) => [kind, offers[kind].quantity]),
	) as Readonly<Record<K, number>>;
// Remaining copies per offered kind, between none and the authored quantity.
const isStock =
	<K extends string>(offers: Offers) =>
	(value: unknown): value is Readonly<Record<K, number>> => {
		if (typeof value !== "object" || value === null || Array.isArray(value))
			return false;
		const stock = value as Record<string, unknown>;
		const kinds = Object.keys(offers);
		return (
			Object.keys(stock).length === kinds.length &&
			kinds.every(
				(kind) =>
					typeof stock[kind] === "number" &&
					Number.isSafeInteger(stock[kind]) &&
					Number(stock[kind]) >= 0 &&
					Number(stock[kind]) <= offers[kind].quantity,
			)
		);
	};
export const townPotionKinds = Object.keys(TOWN_POTION_OFFERS) as TownPotion[];
export const townScrollKinds = Object.keys(TOWN_SCROLL_OFFERS) as TownScroll[];
export const createTownPotionStock = (): TownPotionStock =>
	createStock<TownPotion>(TOWN_POTION_OFFERS);
export const createTownScrollStock = (): TownScrollStock =>
	createStock<TownScroll>(TOWN_SCROLL_OFFERS);
export const isTownPotionStock = isStock<TownPotion>(TOWN_POTION_OFFERS);
export const isTownScrollStock = isStock<TownScroll>(TOWN_SCROLL_OFFERS);
// Shop copy keeps the effect and drops dungeon-use mechanics (turn cost, stacking rules)
// that the bag, item details and Catalog still explain in full.
// Remedies with long dungeon-use rules get their own short shop copy.
const TOWN_POTION_DESCRIPTIONS: Partial<Record<TownPotion, string>> = {
	bandages: "Stops Bleeding. Does not restore health.",
};
export const townPotionDescription = (kind: TownPotion): string =>
	TOWN_POTION_DESCRIPTIONS[kind] ??
	ITEM_DEFINITIONS[kind].description
		.replace(
			" Each bottle stacks with previous gains, separately from level, gear and temporary buffs.",
			"",
		)
		.replace("Drinking uses one turn; it does not", "It does not")
		.replace(/ (Drinking uses|Uses) one turn\./, "")
		.trim();
// Shop copy keeps what a buyer needs; item details and Catalog keep the full reading rules.
const TOWN_SCROLL_DESCRIPTIONS: Readonly<Record<TownScroll, string>> = {
	"exit-scroll":
		"Read in a cleared dungeon area to open a single-use return portal in Beacon town. Stand on the town portal and press Enter to return to your exact departure location, or a nearby safe tile if blocked, for free. Cannot be used while carrying the Warden's Flame.",
	"remove-curse-scroll":
		"Lifts a Curse before the ensuing phase, restoring melee accuracy and damage. Does not cure other conditions.",
};
export const townScrollDescription = (kind: TownScroll): string =>
	TOWN_SCROLL_DESCRIPTIONS[kind];
