import type { Coordinate } from "../dungeon/DungeonTypes";
import type { GameState } from "../game/GameState";
import type { SpellKind } from "../game/Spells";
import {
	type Bag,
	bagItemKey,
	canAddToBag,
	createBag,
	removeBagItem,
} from "./Bag";
import {
	type Equipment,
	emptyEquipmentSlotFor,
	replaceEquipmentSlot,
} from "./Equipment";
import type { EquipmentChangeEvent } from "./EquipmentChanges";
import { ITEM_DEFINITIONS, type ItemInstance, type ItemKind } from "./Item";

export type FloorItem = Readonly<{
	item: ItemInstance;
	floorNumber: number;
	coordinate: Coordinate;
}>;
export type FloorItemAction =
	| { type: "pickup"; itemId: string }
	// A whole-stack drop (dragged from Character) drops every copy for one turn.
	| { type: "drop"; itemId: string; wholeStack?: boolean };
export type FloorItemEvent = {
	type: "item-picked-up" | "item-dropped";
	item: ItemKind;
	// Copies dropped together, when more than one.
	count?: number;
};
type Transfer =
	| {
			bag: Bag;
			floorItems: readonly FloorItem[];
			event: FloorItemEvent;
			knownSpells?: readonly SpellKind[];
			equipment?: Equipment;
			equipEvent?: EquipmentChangeEvent;
	  }
	| { error: string };

export const itemsAtPlayer = (
	state: Pick<GameState, "run" | "floorItems">,
): readonly FloorItem[] =>
	state.floorItems.filter(
		({ floorNumber, coordinate }) =>
			floorNumber === state.run.activeFloor &&
			coordinate.row === state.run.playerCoordinate.row &&
			coordinate.col === state.run.playerCoordinate.col,
	);

export const transferFloorItem = (
	state: GameState,
	action: FloorItemAction,
): Transfer => {
	if (action.type === "pickup") {
		const found = itemsAtPlayer(state).find(
			(entry) => entry.item.id === action.itemId,
		);
		if (!found) return { error: "That item is not on your current tile." };
		const definition = ITEM_DEFINITIONS[found.item.kind];
		if (definition.type === "spellbook") {
			if (state.knownSpells.includes(definition.teaches))
				return { error: "You already know that spell." };
			return {
				bag: state.bag,
				floorItems: state.floorItems.filter((entry) => entry !== found),
				knownSpells: [...state.knownSpells, definition.teaches],
				event: { type: "item-picked-up", item: found.item.kind },
			};
		}
		if (found.item.kind === "cure") {
			if (state.quest.cureRecovered)
				return { error: "You already recovered the ember." };
			return {
				bag: state.bag,
				floorItems: state.floorItems.filter((entry) => entry !== found),
				event: { type: "item-picked-up", item: "cure" },
			};
		}
		if (
			[
				...state.bag.items,
				...Object.values(state.equipment),
				...state.townStorage,
			].some((item) => item?.id === action.itemId)
		)
			return { error: "You already own that item." };
		const slot = emptyEquipmentSlotFor(state.equipment, found.item);
		if (slot !== undefined)
			return {
				bag: state.bag,
				equipment: replaceEquipmentSlot(state.equipment, slot, found.item),
				floorItems: state.floorItems.filter((entry) => entry !== found),
				event: { type: "item-picked-up", item: found.item.kind },
				equipEvent: { type: "item-equipped", item: found.item.kind, slot },
			};
		if (!canAddToBag(state.bag, found.item))
			return {
				error: "Your bag is full. Make room before picking up an item.",
			};
		return {
			bag: createBag([...state.bag.items, found.item]),
			floorItems: state.floorItems.filter((entry) => entry !== found),
			event: { type: "item-picked-up", item: found.item.kind },
		};
	}
	const item = state.bag.items.find((item) => item.id === action.itemId);
	if (!item)
		return {
			error:
				"That item is not in your bag. Unequip worn gear before dropping it.",
		};
	const copies =
		action.wholeStack === true
			? state.bag.items.filter((copy) => bagItemKey(copy) === bagItemKey(item))
			: [item];
	if (
		state.floorItems.some((entry) =>
			copies.some((copy) => copy.id === entry.item.id),
		)
	)
		return { error: "That item is already on the floor." };
	return {
		bag: copies.reduce((bag, copy) => removeBagItem(bag, copy.id), state.bag),
		floorItems: [
			...state.floorItems,
			...copies.map((copy) => ({
				item: copy,
				floorNumber: state.run.activeFloor,
				coordinate: { ...state.run.playerCoordinate },
			})),
		],
		event: {
			type: "item-dropped",
			item: item.kind,
			...(copies.length > 1 ? { count: copies.length } : {}),
		},
	};
};
