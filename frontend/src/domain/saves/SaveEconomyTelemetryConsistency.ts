import type { EconomyMetrics, TradeStore } from "../game/EconomyTelemetry";
import { USAGE_EQUIPMENT_KINDS } from "../game/RunUsage";
import { ITEM_DEFINITIONS, type ItemKind } from "../items/Item";
import { ownedItems } from "../items/OwnedItems";
import type { SaveDocument } from "./SaveDocument";

const sum = (counts: object) =>
	Object.values(counts).reduce<number>((n, count) => n + (count as number), 0);
// Historical receipts must survive price/stock changes. Validate categories,
// rather than recalculating old trades from today's offers.
const historicalStoreItem = (store: TradeStore, kind: ItemKind) => {
	const type = ITEM_DEFINITIONS[kind].type;
	switch (store) {
		case "dungeon-merchant":
		case "town-potions":
			return type === "potion";
		case "town-scrolls":
			return type === "scroll" || type === "enchantment";
		case "town-weapons":
			return type === "weapon";
		case "town-armor":
			return ["shield", "chest-armor", "helmet", "ring"].includes(type);
		default:
			return false;
	}
};
export const hasConsistentEconomyTelemetry = ({
	state,
}: SaveDocument): boolean => {
	const telemetry = state.economyTelemetry;
	if (!telemetry) return true;
	const floors = Object.entries(telemetry.floors);
	if (floors.some(([floor]) => Number(floor) > state.run.floors.length))
		return false;
	const metrics: [EconomyMetrics, boolean][] = [
		...floors.map(
			([, m]) => [m as EconomyMetrics, false] as [EconomyMetrics, boolean],
		),
		[telemetry.town, true],
	];
	let incoming = 0,
		outgoing = 0;
	const acquired: Record<string, number> = { ...telemetry.initialItems },
		learned: Record<string, number> = { ...telemetry.initialSpells },
		bought: Record<string, number> = {};
	for (const [m, town] of metrics) {
		if (
			[m.acquired, m.learned, m.goldIn, m.goldOut].some(
				(map) => !Number.isSafeInteger(sum(map)),
			)
		)
			return false;
		incoming += sum(m.goldIn);
		outgoing += sum(m.goldOut);
		for (const [kind, count] of Object.entries(m.acquired))
			acquired[kind] = (acquired[kind] ?? 0) + (count ?? 0);
		for (const [kind, count] of Object.entries(m.learned))
			learned[kind] = (learned[kind] ?? 0) + (count ?? 0);
		for (const direction of ["purchases", "sales"] as const) {
			let totalGold = 0;
			for (const [store, items] of Object.entries(m[direction])) {
				if ((store !== "dungeon-merchant") !== town) return false;
				if (
					direction === "sales" &&
					store !== "dungeon-merchant" &&
					store !== "town-salvage"
				)
					return false;
				for (const [kind, totals] of Object.entries(items)) {
					if (!totals || totals.gold < totals.quantity) return false;
					if (direction === "purchases") {
						if (!historicalStoreItem(store as TradeStore, kind as ItemKind))
							return false;
						bought[kind] = (bought[kind] ?? 0) + totals.quantity;
					} else if (
						!(USAGE_EQUIPMENT_KINDS as readonly string[]).includes(kind)
					)
						return false;
					totalGold += totals.gold;
				}
			}
			if (
				!Number.isSafeInteger(totalGold) ||
				totalGold !==
					(direction === "purchases"
						? (m.goldOut.purchases ?? 0)
						: (m.goldIn.sales ?? 0))
			)
				return false;
		}
	}
	if (
		!Number.isSafeInteger(incoming) ||
		!Number.isSafeInteger(outgoing) ||
		!Number.isSafeInteger(telemetry.initialGold + incoming) ||
		telemetry.initialGold + incoming - outgoing !== state.gold
	)
		return false;
	if (
		Object.entries(acquired).some(([, count]) => !Number.isSafeInteger(count))
	)
		return false;
	if (
		Object.entries(bought).some(
			([kind, count]) =>
				!Number.isSafeInteger(count) ||
				count >
					(acquired[kind] ?? 0) -
						(telemetry.initialItems[kind as ItemKind] ?? 0),
		)
	)
		return false;
	if (
		Object.entries(learned).some(
			([spell, count]) =>
				count !== 1 ||
				!(state.knownSpells as readonly string[]).includes(spell),
		) ||
		state.knownSpells.some((spell) => learned[spell] !== 1)
	)
		return false;
	// Remaining marked copies may be carried, worn, stored or dropped. Consumed and
	// sold copies need no retained identity. Inventory ownership checks run first.
	const marked: Record<string, number> = {};
	for (const item of ownedItems(state))
		if (item.telemetryAcquired)
			marked[item.kind] = (marked[item.kind] ?? 0) + 1;
	if (
		Object.entries(marked).some(
			([kind, count]) => count > (acquired[kind] ?? 0),
		)
	)
		return false;
	if (
		[
			...state.bag.items,
			...Object.values(state.equipment),
			...state.townStorage,
		].some((item) => item && !item.telemetryAcquired)
	)
		return false;
	return !state.townEquipmentStock.some((item) => item.telemetryAcquired);
};
