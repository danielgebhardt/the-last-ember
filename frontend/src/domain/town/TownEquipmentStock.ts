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
			offer("armor", "shadowweave-cloak", 1100),
			offer("armor", "seers-circlet", 1000),
			offer("armor", "ring-of-displacement", 1300),
			offer("armor", "copper-ring", 150),
			offer("weapons", "iron-sword", 250),
			offer("weapons", "iron-sword", 250, 2),
			offer("weapons", "steel-sword", 700),
			offer("weapons", "battle-axe", 1100),
			offer("weapons", "goldbound-blade", 1200),
			offer("weapons", "bloodrage-axe", 1500),
			offer("weapons", "hungering-blade", 1400),
		].map((entry) => [entry.item.id, entry]),
	);
export const createTownEquipmentStock = (): readonly ItemInstance[] =>
	Object.values(TOWN_EQUIPMENT_OFFERS).map(({ item }) => ({ ...item }));
export const townEquipmentOffers = () => Object.values(TOWN_EQUIPMENT_OFFERS);
export const isTownEquipmentStock = (
	value: unknown,
): value is readonly ItemInstance[] =>
	Array.isArray(value) &&
	value.length <= Object.keys(TOWN_EQUIPMENT_OFFERS).length &&
	new Set(value.map((item) => item?.id)).size === value.length &&
	value.every((item) => {
		if (
			!item ||
			typeof item !== "object" ||
			!Object.hasOwn(TOWN_EQUIPMENT_OFFERS, item.id)
		)
			return false;
		const expected = TOWN_EQUIPMENT_OFFERS[item.id].item;
		return (
			item.kind === expected.kind &&
			item.enchantment === expected.enchantment &&
			Object.keys(item).every((key) =>
				["id", "kind", "enchantment"].includes(key),
			)
		);
	});
