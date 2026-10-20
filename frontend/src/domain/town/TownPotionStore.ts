import { appendActivityEvents } from "../game/ActivityHistory";
import type { GameState } from "../game/GameState";
import { canAddToBag, createBag } from "../items/Bag";
import { assignPickedUpPotion } from "../items/PotionHotbar";
import { TOWN_POTION_OFFERS, type TownPotion } from "./TownEconomy";
import { canReachOpenBuilding } from "./TownServices";
export type BuyTownPotionAction = {
	type: "buy-town-potion";
	kind: TownPotion;
	expectedStock: number;
};
export const canReachTownPotionStore = (state: GameState): boolean =>
	canReachOpenBuilding(state, "potions");
export const buyTownPotion = (
	state: GameState,
	action: BuyTownPotionAction,
) => {
	const reject = (error: string) => ({
		state,
		turnAdvanced: false as const,
		error,
	});
	if (
		!canReachTownPotionStore(state) ||
		state.player.health <= 0 ||
		state.quest.victory ||
		state.quest.cureRecovered
	)
		return reject("Stand beside the open town potion store to trade.");
	if (!Object.hasOwn(TOWN_POTION_OFFERS, action.kind))
		return reject("That potion is not offered.");
	const offer = TOWN_POTION_OFFERS[action.kind],
		count = state.townPotionStock[action.kind];
	if (
		!Number.isSafeInteger(action.expectedStock) ||
		count !== action.expectedStock
	)
		return reject("The stock changed. Review the offer and confirm again.");
	if (count <= 0) return reject("That potion is sold out for this adventure.");
	if (!Number.isSafeInteger(state.gold) || state.gold < offer.price)
		return reject("You do not have enough gold.");
	const item = {
		id: `town-potion:${action.kind}:${offer.quantity - count + 1}`,
		kind: action.kind,
	};
	if (
		[
			...state.bag.items,
			...Object.values(state.equipment),
			...state.floorItems.map((entry) => entry.item),
		].some((owned) => owned?.id === item.id)
	)
		return reject("That bottle already belongs to this adventure.");
	if (!canAddToBag(state.bag, item))
		return reject("Your bag is full. Make room for a new potion kind.");
	return {
		state: {
			...state,
			gold: state.gold - offer.price,
			townPotionStock: { ...state.townPotionStock, [action.kind]: count - 1 },
			bag: createBag([...state.bag.items, item]),
			potionHotbar: assignPickedUpPotion(
				state.potionHotbar,
				state.bag,
				action.kind,
			),
			activityHistory: appendActivityEvents(state.activityHistory, [
				{
					type: "merchant-bought",
					item: action.kind,
					gold: offer.price,
					turn: state.turn,
				},
			]),
		},
		turnAdvanced: false as const,
	};
};
