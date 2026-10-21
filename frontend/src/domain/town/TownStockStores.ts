import { appendActivityEvents } from "../game/ActivityHistory";
import type { GameState } from "../game/GameState";
import { canAddToBag, createBag } from "../items/Bag";
import { ownedItems } from "../items/OwnedItems";
import { assignPickedUpPotion } from "../items/PotionHotbar";
import {
	TOWN_POTION_OFFERS,
	TOWN_SCROLL_OFFERS,
	type TownPotion,
	type TownScroll,
} from "./TownEconomy";
import { canReachOpenBuilding } from "./TownServices";
export type BuyTownPotionAction = {
	type: "buy-town-potion";
	kind: TownPotion;
	expectedStock: number;
};
export type BuyTownScrollAction = {
	type: "buy-town-scroll";
	kind: TownScroll;
	expectedStock: number;
};
export type BuyTownStockAction = BuyTownPotionAction | BuyTownScrollAction;
// The potion store and scroll shop share finite authored stock and one purchase rule.
export const TOWN_STOCK_STORES = {
	"buy-town-potion": {
		building: "potions",
		stock: "townPotionStock",
		offers: TOWN_POTION_OFFERS,
		idPrefix: "town-potion",
		name: "town potion store",
		noun: "potion",
		copy: "bottle",
	},
	"buy-town-scroll": {
		building: "scrolls",
		stock: "townScrollStock",
		offers: TOWN_SCROLL_OFFERS,
		idPrefix: "town-scroll",
		name: "scroll shop",
		noun: "scroll",
		copy: "scroll",
	},
} as const;
export const buyTownStock = (state: GameState, action: BuyTownStockAction) => {
	const reject = (error: string) => ({
		state,
		turnAdvanced: false as const,
		error,
	});
	const store = TOWN_STOCK_STORES[action.type];
	if (
		!canReachOpenBuilding(state, store.building) ||
		state.player.health <= 0 ||
		state.quest.victory ||
		state.quest.cureRecovered
	)
		return reject(`Stand beside the open ${store.name} to trade.`);
	if (!Object.hasOwn(store.offers, action.kind))
		return reject(`That ${store.noun} is not offered.`);
	const stock: Readonly<Record<string, number>> = state[store.stock];
	const offers: Readonly<Record<string, { price: number; quantity: number }>> =
		store.offers;
	const offer = offers[action.kind],
		count = stock[action.kind];
	if (
		!Number.isSafeInteger(action.expectedStock) ||
		count !== action.expectedStock
	)
		return reject("The stock changed. Review the offer and confirm again.");
	if (count <= 0)
		return reject(`That ${store.noun} is sold out for this adventure.`);
	if (!Number.isSafeInteger(state.gold) || state.gold < offer.price)
		return reject("You do not have enough gold.");
	const item = {
		id: `${store.idPrefix}:${action.kind}:${offer.quantity - count + 1}`,
		kind: action.kind,
	};
	if (ownedItems(state).some((owned) => owned.id === item.id))
		return reject(`That ${store.copy} already belongs to this adventure.`);
	if (!canAddToBag(state.bag, item))
		return reject(`Your bag is full. Make room for a new ${store.noun} kind.`);
	return {
		state: {
			...state,
			gold: state.gold - offer.price,
			[store.stock]: { ...stock, [action.kind]: count - 1 },
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
