import { BAG_CAPACITY, bagSlots } from "../items/Bag";
import {
	EQUIPMENT_SLOT_LABELS,
	type EquipmentSlot,
	fitsEquipmentSlot,
} from "../items/Equipment";
import { ITEM_DEFINITIONS } from "../items/Item";
import { ownedItems } from "../items/OwnedItems";
import {
	MERCHANT_OFFERS,
	type MerchantSupply,
} from "../merchant/MerchantRules";
import { isWarden } from "../monsters/EmberWarden";
import { sarcophagusOutcome } from "../objects/AncientSarcophagi";
import { isMimic, isMimicChest } from "../objects/MimicChests";
import { mirrorRewardKind } from "../objects/MirrorOfShadows";
import { chestReward } from "../objects/TreasureChests";
import { wellReward } from "../objects/WishingWell";
import { TOWN_EQUIPMENT_OFFERS } from "../town/TownEquipmentStock";
import { TOWN_STOCK_STORES } from "../town/TownStockStores";
import { STORAGE_CAPACITY, storageSlots } from "../town/TownStorage";
import { savedLocations, unique } from "./SaveConsistencyHelpers";
import type { SaveDocument } from "./SaveDocument";
import { hasConsistentRareEquipment } from "./SaveRareEquipmentConsistency";

export const hasConsistentInventory = (document: SaveDocument): boolean => {
	const { state } = document;
	const { quest } = state;
	const { walkable } = savedLocations(document);
	for (const [slot, item] of Object.entries(state.equipment)) {
		if (
			!Object.hasOwn(EQUIPMENT_SLOT_LABELS, slot) ||
			(item !== null &&
				(typeof item !== "object" ||
					!Object.hasOwn(ITEM_DEFINITIONS, item.kind)))
		)
			return false;
	}
	if (bagSlots(state.bag).length > BAG_CAPACITY) return false;
	const allItems = ownedItems(state);
	// Storage is town-only, holds whole stacks within its slots and never the ember.
	if (
		storageSlots(state.townStorage).length > STORAGE_CAPACITY ||
		state.townStorage.some((item) => item.kind === "cure")
	)
		return false;
	if (!unique(allItems.map((entry) => entry.id))) return false;
	// A Ring of Displacement fires at most once per floor of this dungeon.
	const displaced = state.displacedFloors ?? [];
	if (
		!unique(displaced) ||
		displaced.some((floor) => floor > state.run.floors.length)
	)
		return false;
	if (!hasConsistentRareEquipment(document)) return false;
	const purchased = state.townEquipmentPurchases;
	if (
		!unique(purchased) ||
		purchased.some(
			(id) =>
				!Object.hasOwn(TOWN_EQUIPMENT_OFFERS, id) ||
				state.townEquipmentStock.some((i) => i.id === id),
		)
	)
		return false;
	if (
		allItems.some(
			(i) => i.id.startsWith("town-gear:") && !purchased.includes(i.id),
		)
	)
		return false;
	// An offer neither bought nor stocked is newer than this save; loading stocks it.

	for (const item of allItems) {
		if (item.id.includes(":object:sarcophagus:")) {
			const owner = state.objects.find(
				(o) => o.kind === "sarcophagus" && `${o.id}:reward` === item.id,
			);
			if (
				!owner?.activated ||
				!["treasure", "both"].includes(
					sarcophagusOutcome(state.run.seed, owner),
				) ||
				chestReward(state.run.seed, owner).item.kind !== item.kind
			)
				return false;
		}

		// A mimic keeps its chest's loot until it falls.
		if (item.id.includes(":object:chest:")) {
			const owner = state.objects.find(
				(o) => o.kind === "chest" && `${o.id}:reward` === item.id,
			);
			if (
				owner &&
				isMimicChest(state.run.seed, owner) &&
				state.monsters.some(
					(m) => isMimic(m) && m.floorNumber === owner.floorNumber,
				)
			)
				return false;
		}

		if (item.id.includes(":object:mirror:")) {
			const owner = state.objects.find(
				(o) => o.kind === "mirror" && `${o.id}:reward` === item.id,
			);
			if (
				!owner?.activated ||
				owner.mirrorResult?.choice !== "shatter" ||
				owner.mirrorResult.outcome !== "item" ||
				mirrorRewardKind(state.run.seed, owner) !== item.kind
			)
				return false;
		}

		if (item.id.includes(":object:well:")) {
			const owner = state.objects.find(
				(o) => o.kind === "well" && `${o.id}:reward` === item.id,
			);
			const reward = owner && wellReward(state.run.seed, owner);
			if (
				!owner?.activated ||
				owner.wellResult?.outcome !== "positive" ||
				reward?.type !== "gear" ||
				reward.kind !== item.kind
			)
				return false;
		}

		if (!item.id.startsWith("merchant:")) continue;
		const parts = item.id.split(":"),
			kind = parts[1],
			index = Number(parts[2]);
		if (
			parts.length !== 3 ||
			kind !== item.kind ||
			!Object.hasOwn(MERCHANT_OFFERS, kind) ||
			!Number.isInteger(index) ||
			index < 1 ||
			index > 10 ||
			String(index) !== parts[2] ||
			index > 10 - state.merchantStock[kind as MerchantSupply]
		)
			return false;
	}

	// Bought copies are numbered in purchase order, so each must already be sold.
	for (const { idPrefix, stock, offers } of Object.values(TOWN_STOCK_STORES)) {
		const remaining: Readonly<Record<string, number>> = document.state[stock];
		const offered: Readonly<
			Record<string, { price: number; quantity: number }>
		> = offers;
		for (const item of allItems) {
			if (!item.id.startsWith(`${idPrefix}:`)) continue;
			const parts = item.id.split(":"),
				kind = parts[1],
				index = Number(parts[2]);
			if (
				parts.length !== 3 ||
				kind !== item.kind ||
				!Object.hasOwn(offered, kind) ||
				!Number.isSafeInteger(index) ||
				index < 1 ||
				String(index) !== parts[2] ||
				index > offered[kind].quantity - remaining[kind]
			)
				return false;
		}
	}

	for (const item of allItems) {
		if (!item.id.startsWith("town-gear:")) continue;
		if (!Object.hasOwn(TOWN_EQUIPMENT_OFFERS, item.id)) return false;
		const offer = TOWN_EQUIPMENT_OFFERS[item.id];
		if (
			item.kind !== offer.item.kind ||
			("enchantment" in item && typeof item.enchantment === "number"
				? item.enchantment
				: 0) < (offer.item.enchantment ?? 0) ||
			state.townEquipmentStock.some((copy) => copy.id === item.id)
		)
			return false;
	}
	for (const [name, entry] of Object.entries(state.equipment))
		if (entry && !fitsEquipmentSlot(entry, name as EquipmentSlot)) return false;
	if (
		state.bag.items.some(
			(entry) =>
				entry.kind === "cure" ||
				ITEM_DEFINITIONS[entry.kind].type === "spellbook",
		) ||
		!state.floorItems.every((entry) =>
			walkable(entry.floorNumber, entry.coordinate),
		)
	)
		return false;
	// One flame: claimed, lying on the final floor, or still carried by a living Warden
	// (older saves always placed it on the floor).
	const cures = state.floorItems.filter((entry) => entry.item.kind === "cure");
	const carried =
		cures.length === 0 &&
		state.monsters.some((monster) => isWarden(monster) && monster.health > 0);
	if (
		quest.cureRecovered
			? cures.length !== 0
			: !carried &&
				(cures.length !== 1 || cures[0].floorNumber !== quest.goalFloor)
	)
		return false;
	return true;
};
