import { appendActivityEvents } from "../game/ActivityHistory";
import type { GameState } from "../game/GameState";
import { bagItemKey, bagSlots, canAddToBag, createBag } from "../items/Bag";
import type { ItemInstance } from "../items/Item";
import { itemName } from "../items/ItemValues";
import { assignPickedUpPotion } from "../items/PotionHotbar";
import { canReachOpenBuilding } from "./TownServices";

// Provisional: a stack takes one slot, matching the bag's slot rules.
export const STORAGE_CAPACITY = 12;
export const storageSlots = (storage: readonly ItemInstance[]) =>
	bagSlots({ items: storage });

// Items move as whole stacks, identified by the bag's stack key.
export type TownStorageAction =
	| { type: "storage-deposit"; itemKey: string }
	| { type: "storage-withdraw"; itemKey: string };
export const canReachTownStorage = (state: GameState): boolean =>
	canReachOpenBuilding(state, "storage");
const stackOf = (items: readonly ItemInstance[], key: string) =>
	items.filter((item) => bagItemKey(item) === key);

// Why a stack can't move right now, or null; the dialog shows these on each tile.
export const storageRefusal = (
	state: Pick<GameState, "bag" | "townStorage">,
	action: TownStorageAction,
): string | null => {
	const deposit = action.type === "storage-deposit";
	const from = deposit ? state.bag.items : state.townStorage;
	const stack = stackOf(from, action.itemKey);
	if (!stack.length)
		return deposit
			? "That item is not in your bag."
			: "That item is not stored.";
	if (stack.some((item) => item.kind === "cure"))
		return "The Last Ember never leaves your keeping.";
	if (deposit) {
		const merges = state.townStorage.some(
			(item) => bagItemKey(item) === action.itemKey,
		);
		return merges || storageSlots(state.townStorage).length < STORAGE_CAPACITY
			? null
			: "The chest is full.";
	}
	return canAddToBag(state.bag, stack[0])
		? null
		: "Your bag is full. Make room first.";
};

// Free and reversible, like every town service: no turn and no confirmation.
export const moveTownStorage = (
	state: GameState,
	action: TownStorageAction,
) => {
	const reject = (error: string) => ({
		state,
		turnAdvanced: false as const,
		error,
	});
	if (
		!canReachTownStorage(state) ||
		state.player.health <= 0 ||
		state.quest.victory
	)
		return reject(
			"Stand beside the open storage courtyard during an active adventure.",
		);
	const refusal = storageRefusal(state, action);
	if (refusal) return reject(refusal);
	const deposit = action.type === "storage-deposit";
	const from = deposit ? state.bag.items : state.townStorage;
	const stack = stackOf(from, action.itemKey);
	const remaining = from.filter((item) => !stack.includes(item));
	const bag = createBag(deposit ? remaining : [...state.bag.items, ...stack]);
	return {
		state: {
			...state,
			bag,
			townStorage: deposit ? [...state.townStorage, ...stack] : remaining,
			potionHotbar: deposit
				? state.potionHotbar
				: assignPickedUpPotion(state.potionHotbar, state.bag, stack[0].kind),
			activityHistory: appendActivityEvents(state.activityHistory, [
				{
					type: deposit ? "storage-deposited" : "storage-withdrawn",
					item: stack[0].kind,
					count: stack.length,
					turn: state.turn,
				},
			]),
		},
		turnAdvanced: false as const,
	};
};

export const storageItemName = (item: ItemInstance, count: number) =>
	`${itemName(item)}${count > 1 ? ` ×${count}` : ""}`;
