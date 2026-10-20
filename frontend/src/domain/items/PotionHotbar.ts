import type { GameState } from "../game/GameState";
import type { Bag } from "./Bag";
import { ITEM_DEFINITIONS, type ItemKind } from "./Item";

export const HOTBAR_SLOTS = [1, 2, 3, 4] as const;
export type HotbarSlot = (typeof HOTBAR_SLOTS)[number];
export type PotionKind = {
	[K in ItemKind]: (typeof ITEM_DEFINITIONS)[K]["type"] extends "potion"
		? K
		: never;
}[ItemKind];
export type PotionHotbar = readonly [
	PotionKind | null,
	PotionKind | null,
	PotionKind | null,
	PotionKind | null,
];
export type HotbarAssignmentAction =
	| { type: "assign-hotbar"; slot: HotbarSlot; itemId: string }
	| { type: "clear-hotbar"; slot: HotbarSlot };
export type HotbarAction =
	| HotbarAssignmentAction
	| { type: "use-hotbar"; slot: HotbarSlot };
export const createStartingPotionHotbar = (): PotionHotbar => [
	"healing-potion",
	"mana-potion",
	null,
	null,
];
const isPotionKind = (kind: ItemKind): kind is PotionKind =>
	ITEM_DEFINITIONS[kind].type === "potion";

// Called only after a successful pickup, with the bag from before the transfer.
export const assignPickedUpPotion = (
	potionHotbar: PotionHotbar,
	bag: Bag,
	kind: ItemKind,
): PotionHotbar => {
	if (
		!isPotionKind(kind) ||
		potionHotbar.includes(kind) ||
		bag.items.some((item) => item.kind === kind)
	)
		return potionHotbar;
	const emptyIndex = potionHotbar.indexOf(null);
	if (emptyIndex === -1) return potionHotbar;
	const next: [
		PotionKind | null,
		PotionKind | null,
		PotionKind | null,
		PotionKind | null,
	] = [...potionHotbar];
	next[emptyIndex] = kind;
	return next;
};

export const changeHotbarAssignment = (
	potionHotbar: PotionHotbar,
	bag: Bag,
	action: HotbarAssignmentAction,
): { potionHotbar: PotionHotbar } | { error: string } => {
	if (!HOTBAR_SLOTS.includes(action.slot))
		return { error: "Choose a potion slot from 1 to 4." };
	let kind: PotionKind | null = null;
	if (action.type === "assign-hotbar") {
		const item = bag.items.find((item) => item.id === action.itemId);
		if (!item) return { error: "That item is no longer in your bag." };
		if (!isPotionKind(item.kind))
			return { error: "Only potions can be assigned to the hotbar." };
		kind = item.kind;
	}
	const index = action.slot - 1;
	if (potionHotbar[index] === kind) return { potionHotbar };
	const next: [
		PotionKind | null,
		PotionKind | null,
		PotionKind | null,
		PotionKind | null,
	] = [...potionHotbar];
	for (const slot of HOTBAR_SLOTS) {
		if (kind !== null && next[slot - 1] === kind) next[slot - 1] = null;
	}
	next[index] = kind;
	return { potionHotbar: next };
};

export const hotbarSlotContents = (
	state: Pick<GameState, "potionHotbar" | "bag">,
	slot: HotbarSlot,
) => {
	const kind = state.potionHotbar[slot - 1];
	const copies = kind
		? state.bag.items.filter((item) => item.kind === kind)
		: [];
	return { kind, count: copies.length, item: copies[0] };
};
