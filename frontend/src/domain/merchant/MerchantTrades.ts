import { appendActivityEvents } from "../game/ActivityHistory";
import type { GameState } from "../game/GameState";
import { canAddToBag, createBag } from "../items/Bag";
import { ownedItems } from "../items/OwnedItems";
import { assignPickedUpPotion } from "../items/PotionHotbar";
import { orthogonalDistance } from "../monsters/MonsterLocations";
import {
	sellCarriedEquipment,
	sellLowerCarriedEquipment,
} from "./EquipmentSales";
import { merchantsEnabled } from "./MerchantAvailability";
import { MERCHANT_OFFERS, type MerchantSupply } from "./MerchantRules";
export type BuyAction = {
	type: "buy";
	merchantId: string;
	kind: MerchantSupply;
};
export const canReachMerchant = (
	state: GameState,
	merchantId: string,
): boolean =>
	merchantsEnabled() &&
	state.objects.some(
		(o) =>
			o.id === merchantId &&
			o.kind === "merchant" &&
			o.floorNumber === state.run.activeFloor &&
			orthogonalDistance(o.coordinate, state.run.playerCoordinate) <= 1,
	);
export const buyPotion = (
	state: GameState,
	action: BuyAction,
): GameState | { error: string } => {
	if (!canReachMerchant(state, action.merchantId))
		return { error: "No merchant within reach." };
	if (!Object.hasOwn(MERCHANT_OFFERS, action.kind))
		return { error: "That supply is not offered." };
	const count = state.merchantStock[action.kind],
		price = MERCHANT_OFFERS[action.kind].price;
	if (count <= 0)
		return { error: "That supply is sold out for this adventure." };
	if (state.gold < price) return { error: "You do not have enough gold." };
	const item = {
		id: `merchant:${action.kind}:${11 - count}`,
		kind: action.kind,
	};
	if (ownedItems(state).some((copy) => copy.id === item.id))
		return { error: "That bottle already belongs to this adventure." };
	if (!canAddToBag(state.bag, item))
		return { error: "Your bag is full. Make room before buying a new supply." };
	return {
		...state,
		gold: state.gold - price,
		bag: createBag([...state.bag.items, item]),
		merchantStock: { ...state.merchantStock, [action.kind]: count - 1 },
		potionHotbar: assignPickedUpPotion(
			state.potionHotbar,
			state.bag,
			action.kind,
		),
		activityHistory: appendActivityEvents(state.activityHistory, [
			{
				type: "merchant-bought",
				item: action.kind,
				gold: price,
				turn: state.turn,
			},
		]),
	};
};

export type SellAction = { type: "sell"; merchantId: string; itemId: string };
export type SellLowerAction = { type: "sell-lower"; merchantId: string };
export const sellLowerEquipment = (
	state: GameState,
	action: SellLowerAction,
): GameState | { error: string } =>
	canReachMerchant(state, action.merchantId)
		? sellLowerCarriedEquipment(state)
		: { error: "No merchant within reach." };
export const sellEquipment = (
	state: GameState,
	action: SellAction,
): GameState | { error: string } =>
	canReachMerchant(state, action.merchantId)
		? sellCarriedEquipment(state, action.itemId)
		: { error: "No merchant within reach." };
