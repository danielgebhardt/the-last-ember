import { ITEM_DEFINITIONS, type ItemInstance } from "./Item";

export const EQUIPMENT_SLOT_LABELS = {
	mainHand: "Main hand",
	offHand: "Off hand",
	chest: "Chest",
	head: "Head",
	leftRing: "Left ring",
	rightRing: "Right ring",
} as const;
export type EquipmentSlot = keyof typeof EQUIPMENT_SLOT_LABELS;

export const equipmentPlacementLabel = (slot: EquipmentSlot): string =>
	slot === "leftRing"
		? "left hand"
		: slot === "rightRing"
			? "right hand"
			: EQUIPMENT_SLOT_LABELS[slot].toLowerCase();

export type Equipment = Readonly<Record<EquipmentSlot, ItemInstance | null>>;

export const equipmentSlotFor = (item: ItemInstance): EquipmentSlot | null => {
	switch (ITEM_DEFINITIONS[item.kind].type) {
		case "ring":
			return "leftRing";
		case "weapon":
			return "mainHand";
		case "shield":
			return "offHand";
		case "chest-armor":
			return "chest";
		case "helmet":
			return "head";
		case "spellbook":
		case "quest":
		case "enchantment":
		case "scroll":
		case "potion":
			return null;
	}
};
export const equipmentSlotsFor = (
	item: ItemInstance,
): readonly EquipmentSlot[] =>
	ITEM_DEFINITIONS[item.kind].type === "ring"
		? ["leftRing", "rightRing"]
		: equipmentSlotFor(item)
			? [equipmentSlotFor(item) as EquipmentSlot]
			: [];
export const emptyEquipmentSlotFor = (
	equipment: Equipment,
	item: ItemInstance,
): EquipmentSlot | undefined =>
	equipmentSlotsFor(item).find((slot) => equipment[slot] === null);

export const fitsEquipmentSlot = (
	item: ItemInstance,
	slot: EquipmentSlot,
): boolean => equipmentSlotsFor(item).includes(slot);

export const createEquipment = (
	mainHand: ItemInstance | null = null,
	offHand: ItemInstance | null = null,
	chest: ItemInstance | null = null,
	head: ItemInstance | null = null,
	leftRing: ItemInstance | null = null,
	rightRing: ItemInstance | null = null,
): Equipment => {
	const equipment = { mainHand, offHand, chest, head, leftRing, rightRing };
	const items = Object.values(equipment).filter((item) => item !== null);
	if (new Set(items.map((item) => item.id)).size !== items.length)
		throw new Error("The same item cannot occupy multiple equipment slots.");
	for (const slot of Object.keys(equipment) as EquipmentSlot[]) {
		const item = equipment[slot];
		if (item && !fitsEquipmentSlot(item, slot))
			throw new Error(
				`That item does not fit the ${EQUIPMENT_SLOT_LABELS[slot].toLowerCase()}.`,
			);
	}
	return equipment;
};
export const replaceEquipmentSlot = (
	equipment: Equipment,
	slot: EquipmentSlot,
	item: ItemInstance | null,
): Equipment => {
	const next = { ...equipment, [slot]: item };
	return createEquipment(
		next.mainHand,
		next.offHand,
		next.chest,
		next.head,
		next.leftRing,
		next.rightRing,
	);
};
export const createStartingEquipment = (): Equipment =>
	createEquipment(
		{ id: "starting:main-hand", kind: "short-sword" },
		{ id: "starting:off-hand", kind: "wooden-shield" },
	);
