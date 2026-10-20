import type { ItemInstance, ItemKind } from "../items/Item";
export type TownEquipmentStore = "armor" | "weapons";
type Offer = Readonly<{
	store: TownEquipmentStore;
	item: ItemInstance;
	price: number;
}>;
const offer = (
	store: TownEquipmentStore,
	kind: ItemKind,
	price: number,
	copy = 1,
	enchantment = 0,
): Offer => ({
	store,
	item: {
		id: `town-gear:${store}:${kind}:${enchantment}:${copy}`,
		kind,
		...(enchantment ? { enchantment } : {}),
	},
	price,
});
// Authored, finite copies. No seed stream, visit or level can reroll this stock.
export const TOWN_EQUIPMENT_OFFERS: Readonly<Record<string, Offer>> =
	Object.fromEntries(
		[
			offer("armor", "leather-armor", 150),
			offer("armor", "chain-armor", 500),
			offer("armor", "scholar-robe", 650),
			offer("armor", "leather-cap", 100),
			offer("armor", "iron-helmet", 350),
			offer("armor", "wooden-shield", 125),
			offer("armor", "iron-shield", 450),
			offer("armor", "warding-cloak", 900),
			offer("armor", "spellguard-shield", 900),
			offer("armor", "copper-ring", 150),
			offer("weapons", "iron-sword", 250),
			offer("weapons", "iron-sword", 250, 2),
			offer("weapons", "steel-sword", 700),
			offer("weapons", "battle-axe", 1100),
		].map((entry) => [entry.item.id, entry]),
	);
// Offers added after adventures already existed. Older v27 stock never contained them,
// so validation permits their absence; loading never adds stock.
export const LATE_TOWN_EQUIPMENT_OFFERS: ReadonlySet<string> = new Set([
	"town-gear:armor:copper-ring:0:1",
]);
// v27 recognition only: existing enchanted copies remain valid, but are not offers.
const retiredOffers = [
	offer("armor", "leather-armor", 400, 1, 1),
	offer("weapons", "short-sword", 150, 1, 1),
	offer("weapons", "iron-sword", 550, 1, 1),
];
export const SAVED_TOWN_EQUIPMENT_OFFERS: Readonly<Record<string, Offer>> = {
	...TOWN_EQUIPMENT_OFFERS,
	...Object.fromEntries(retiredOffers.map((entry) => [entry.item.id, entry])),
};
export const createTownEquipmentStock = (): readonly ItemInstance[] =>
	Object.values(TOWN_EQUIPMENT_OFFERS).map(({ item }) => ({ ...item }));
export const townEquipmentOffers = () => Object.values(TOWN_EQUIPMENT_OFFERS);
export const isTownEquipmentStock = (
	value: unknown,
): value is readonly ItemInstance[] =>
	Array.isArray(value) &&
	value.length <= Object.keys(SAVED_TOWN_EQUIPMENT_OFFERS).length &&
	new Set(value.map((item) => item?.id)).size === value.length &&
	value.every((item) => {
		if (
			!item ||
			typeof item !== "object" ||
			!Object.hasOwn(SAVED_TOWN_EQUIPMENT_OFFERS, item.id)
		)
			return false;
		const expected = SAVED_TOWN_EQUIPMENT_OFFERS[item.id].item;
		return (
			item.kind === expected.kind &&
			item.enchantment === expected.enchantment &&
			Object.keys(item).every((key) =>
				["id", "kind", "enchantment"].includes(key),
			)
		);
	});
