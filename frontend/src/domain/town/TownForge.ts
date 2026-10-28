import { appendActivityEvents } from "../game/ActivityHistory";
import { recordGoldOut } from "../game/EconomyTelemetry";
import type { GameState } from "../game/GameState";
import { createBag } from "../items/Bag";
import type { Equipment, EquipmentSlot } from "../items/Equipment";
import { resourcesAfterEquipmentChange } from "../items/EquipmentResources";
import {
	ITEM_DEFINITIONS,
	type ItemInstance,
	type ItemKind,
	isRareEquipmentKind,
} from "../items/Item";
import { isEnchantableKind, MAX_ENCHANTMENT } from "../items/ItemValues";
import { canReachOpenBuilding } from "./TownServices";

// Tier from the base stat: armor value, or weapon attack halved and rounded up.
export const FORGE_TIER_PRICES = [150, 300, 600, 1000] as const;
export const townForgeTier = (kind: ItemKind): number => {
	const definition = ITEM_DEFINITIONS[kind];
	const stat =
		definition.type === "weapon"
			? Math.ceil(definition.attackBonus / 2)
			: definition.armor;
	return Math.min(FORGE_TIER_PRICES.length, Math.max(1, stat));
};
// Each level costs the tier base times the level being bought: +0→+3 is six bases.
export const townForgePrice = (item: ItemInstance): number =>
	FORGE_TIER_PRICES[townForgeTier(item.kind) - 1] *
	((item.enchantment ?? 0) + 1);

export type TownForgeAction = {
	type: "town-forge";
	itemId: string;
	// The quoted state; a changed item or price rejects the stale confirmation free.
	enchantment: number;
	price: number;
};
export const canReachTownForge = (state: GameState): boolean =>
	canReachOpenBuilding(state, "forge");

export const ownedForgeItems = (
	state: Pick<GameState, "equipment" | "bag">,
) => ({
	equipped: Object.values(state.equipment).filter(
		(item): item is ItemInstance => !!item && isEnchantableKind(item.kind),
	),
	bag: state.bag.items.filter((item) => isEnchantableKind(item.kind)),
});

export const townForgeRefusal = (
	state: GameState,
	item: ItemInstance,
): string | null =>
	isRareEquipmentKind(item.kind)
		? "Rare item: can't be reforged"
		: (item.enchantment ?? 0) >= MAX_ENCHANTMENT
			? `Already +${MAX_ENCHANTMENT}`
			: state.gold < townForgePrice(item)
				? "Not enough gold"
				: null;

export const reforgeAtTown = (state: GameState, action: TownForgeAction) => {
	const reject = (error: string) => ({
		state,
		turnAdvanced: false as const,
		error,
	});
	if (
		!canReachTownForge(state) ||
		state.player.health <= 0 ||
		state.quest.victory ||
		state.quest.cureRecovered
	)
		return reject("Stand beside the open forge during an active adventure.");
	const { equipped, bag } = ownedForgeItems(state);
	const item = [...equipped, ...bag].find((i) => i.id === action.itemId);
	if (!item) return reject("Choose an owned weapon or armor piece.");
	if (
		(item.enchantment ?? 0) !== action.enchantment ||
		townForgePrice(item) !== action.price
	)
		return reject("The quote changed. Review it and confirm again.");
	const refusal = townForgeRefusal(state, item);
	if (refusal) return reject(`${refusal}.`);
	const enchantment = (item.enchantment ?? 0) + 1;
	const replace = (entry: ItemInstance | null) =>
		entry?.id === item.id ? { ...entry, enchantment } : entry;
	const nextEquipment = Object.fromEntries(
		Object.entries(state.equipment).map(([slot, entry]) => [
			slot,
			replace(entry),
		]),
	) as Record<EquipmentSlot, Equipment[EquipmentSlot]>;
	return {
		state: {
			...recordGoldOut(state, action.price, "town-forge"),
			...resourcesAfterEquipmentChange(state, nextEquipment),
			gold: state.gold - action.price,
			equipment: nextEquipment,
			bag: createBag(state.bag.items.map((entry) => replace(entry) ?? entry)),
			activityHistory: appendActivityEvents(state.activityHistory, [
				{
					type: "town-forged",
					item: item.kind,
					enchantment,
					gold: action.price,
					turn: state.turn,
				},
			]),
		},
		turnAdvanced: false as const,
	};
};
