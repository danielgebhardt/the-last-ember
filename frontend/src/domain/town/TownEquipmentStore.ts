import { appendActivityEvents } from "../game/ActivityHistory";
import type { GameState } from "../game/GameState";
import { canAddToBag, createBag } from "../items/Bag";
import { rareEquipmentId } from "../items/RareEquipment";
import {
	TOWN_EQUIPMENT_OFFERS,
	type TownEquipmentStore,
} from "./TownEquipmentStock";
import { canReachOpenBuilding } from "./TownServices";
export type BuyTownEquipmentAction = {
	type: "buy-town-equipment";
	offerId: string;
};
export const reachableTownEquipmentStore = (
	state: GameState,
): TownEquipmentStore | null =>
	(["armor", "weapons"] as const).find((id) =>
		canReachOpenBuilding(state, id),
	) ?? null;
export const buyTownEquipment = (
	state: GameState,
	action: BuyTownEquipmentAction,
) => {
	const reject = (error: string) => ({
		state,
		turnAdvanced: false as const,
		error,
	});
	const store = reachableTownEquipmentStore(state);
	if (
		!store ||
		state.player.health <= 0 ||
		state.quest.victory ||
		state.quest.cureRecovered
	)
		return reject("Stand beside an open town equipment store to trade.");
	if (!Object.hasOwn(TOWN_EQUIPMENT_OFFERS, action.offerId))
		return reject("That item is not offered.");
	const offer = TOWN_EQUIPMENT_OFFERS[action.offerId];
	if (offer.store !== store)
		return reject("That item belongs to another store.");
	if (state.townEquipmentPurchases.includes(action.offerId))
		return reject("That copy is sold out.");
	const item = state.townEquipmentStock.find(
		(copy) => copy.id === action.offerId,
	);
	if (!item)
		return reject(
			"That copy is sold out. Stock changed; review another offer.",
		);
	if (
		item.kind !== offer.item.kind ||
		item.enchantment !== offer.item.enchantment
	)
		return reject("That offer changed.");
	if (!Number.isSafeInteger(state.gold) || state.gold < offer.price)
		return reject("You do not have enough gold.");
	if (!canAddToBag(state.bag, item))
		return reject("Your bag is full. Equipment needs its own slot.");
	if (
		[
			...state.bag.items,
			...Object.values(state.equipment),
			...state.floorItems.map((entry) => entry.item),
		].some((owned) => owned?.id === item.id)
	)
		return reject("That copy already belongs to this adventure.");
	return {
		state: {
			...state,
			gold: state.gold - offer.price,
			townEquipmentPurchases: [...state.townEquipmentPurchases, item.id],
			...(state.rareEquipment &&
			rareEquipmentId(state.rareEquipment) === item.id
				? { rareEquipment: { ...state.rareEquipment, acquired: true } }
				: {}),
			bag: createBag([...state.bag.items, { ...item }]),
			townEquipmentStock: state.townEquipmentStock.filter(
				(copy) => copy.id !== item.id,
			),
			activityHistory: appendActivityEvents(state.activityHistory, [
				{
					type: "merchant-bought",
					item: item.kind,
					gold: offer.price,
					turn: state.turn,
				},
			]),
		},
		turnAdvanced: false as const,
	};
};
