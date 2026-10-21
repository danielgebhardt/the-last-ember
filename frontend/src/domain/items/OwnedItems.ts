import type { ItemInstance } from "./Item";

// Every physical copy the adventure owns: carried, worn, on the ground or stored in
// town. Item IDs are unique across all of them.
export const ownedItems = (state: {
	bag: { items: readonly ItemInstance[] };
	equipment: Readonly<Record<string, ItemInstance | null>>;
	floorItems: readonly { item: ItemInstance }[];
	townStorage: readonly ItemInstance[];
}): ItemInstance[] => [
	...state.bag.items,
	...Object.values(state.equipment).filter((item) => item !== null),
	...state.floorItems.map((entry) => entry.item),
	...state.townStorage,
];
