import { appendActivityEvents } from "../game/ActivityHistory";
import { recordTrade } from "../game/EconomyTelemetry";
import type { GameState } from "../game/GameState";
import { createBag } from "../items/Bag";
import { lowerEquipmentSale } from "./LowerEquipmentSales";
import { equipmentSaleGold } from "./MerchantRules";

// Ownership, pricing and atomic mutations are shared by town and dungeon buyers.
export const sellLowerCarriedEquipment = (
	state: GameState,
): GameState | { error: string } => {
	const sale = lowerEquipmentSale(state);
	if (!sale.items.length) return { error: "No Lower equipment to sell." };
	if (!Number.isSafeInteger(state.gold + sale.gold))
		return { error: "You cannot carry more gold." };
	const soldIds = new Set(sale.items.map((item) => item.id));
	return {
		...sale.items.reduce(
			(next, item) =>
				recordTrade(
					next,
					"sales",
					state.town ? "town-salvage" : "dungeon-merchant",
					item.kind,
					equipmentSaleGold(item, state.progression) ?? 0,
				),
			state,
		),
		gold: state.gold + sale.gold,
		bag: createBag(state.bag.items.filter((item) => !soldIds.has(item.id))),
		activityHistory: appendActivityEvents(
			state.activityHistory,
			sale.items.map((item) => ({
				type: "merchant-sold" as const,
				item: item.kind,
				gold: equipmentSaleGold(item, state.progression) ?? 0,
				turn: state.turn,
			})),
		),
	};
};
export const sellCarriedEquipment = (
	state: GameState,
	itemId: string,
): GameState | { error: string } => {
	const item = state.bag.items.find((copy) => copy.id === itemId);
	if (!item)
		return {
			error: "That equipment is not in your bag. Unequip worn gear first.",
		};
	const gold = equipmentSaleGold(item, state.progression);
	if (gold === null)
		return { error: "The merchant buys only carried equipment." };
	if (!Number.isSafeInteger(state.gold + gold))
		return { error: "You cannot carry more gold." };
	return {
		...recordTrade(
			state,
			"sales",
			state.town ? "town-salvage" : "dungeon-merchant",
			item.kind,
			gold,
		),
		gold: state.gold + gold,
		bag: createBag(state.bag.items.filter((copy) => copy.id !== item.id)),
		activityHistory: appendActivityEvents(state.activityHistory, [
			{ type: "merchant-sold", item: item.kind, gold, turn: state.turn },
		]),
	};
};
