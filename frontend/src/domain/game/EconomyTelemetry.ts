import {
	ITEM_DEFINITIONS,
	type ItemInstance,
	type ItemKind,
} from "../items/Item";
import {
	AFFLICTION_DEFINITIONS,
	type AfflictionKind,
} from "./AfflictionDefinitions";
import type { GameState } from "./GameState";
import type { SpellKind } from "./Spells";

const AFFLICTION_KINDS = Object.keys(
	AFFLICTION_DEFINITIONS,
) as AfflictionKind[];

export const INCOME_SOURCES = [
	"floor-gold",
	"monster-reward",
	"throne",
	"sales",
	"theft-recovery",
] as const;
export const EXPENSE_SOURCES = [
	"purchases",
	"theft",
	"town-forge",
	"library",
	"sanctuary-health",
	...AFFLICTION_KINDS.map((kind) => `sanctuary-${kind}` as const),
	"sanctuary-cleanse",
	"dungeon-forge-reliable",
	"dungeon-forge-risky",
	"shrine",
	"well",
] as const;
export const TRADE_STORES = [
	"dungeon-merchant",
	"town-potions",
	"town-scrolls",
	"town-weapons",
	"town-armor",
	"town-salvage",
] as const;
export type IncomeSource = (typeof INCOME_SOURCES)[number];
export type ExpenseSource = (typeof EXPENSE_SOURCES)[number];
export type TradeStore = (typeof TRADE_STORES)[number];
export type TradeTotals = { quantity: number; gold: number };
export type EconomyMetrics = {
	acquired: Partial<Record<ItemKind, number>>;
	learned: Partial<Record<SpellKind, number>>;
	goldIn: Partial<Record<IncomeSource, number>>;
	goldOut: Partial<Record<ExpenseSource, number>>;
	purchases: Partial<
		Record<TradeStore, Partial<Record<ItemKind, TradeTotals>>>
	>;
	sales: Partial<Record<TradeStore, Partial<Record<ItemKind, TradeTotals>>>>;
};
export type EconomyTelemetry = {
	initialGold: number;
	initialItems: Partial<Record<ItemKind, number>>;
	initialSpells: Partial<Record<SpellKind, number>>;
	floors: Partial<Record<number, EconomyMetrics>>;
	town: EconomyMetrics;
};
export const emptyEconomyMetrics = (): EconomyMetrics => ({
	acquired: {},
	learned: {},
	goldIn: {},
	goldOut: {},
	purchases: {},
	sales: {},
});
export const emptyEconomyTelemetry = (
	initialGold: number,
): EconomyTelemetry => ({
	initialGold,
	initialItems: {},
	initialSpells: {},
	floors: {},
	town: emptyEconomyMetrics(),
});
const add = <K extends string>(
	map: Partial<Record<K, number>>,
	key: K,
	amount: number,
): Partial<Record<K, number>> => ({ ...map, [key]: (map[key] ?? 0) + amount });

// A boolean travels with the existing physical copy. It survives drops/storage
// without retaining an ever-growing set of acquired IDs after items are consumed.
export const markAcquiredItem = (
	state: Pick<GameState, "economyTelemetry">,
	item: ItemInstance,
): ItemInstance =>
	state.economyTelemetry && !item.telemetryAcquired
		? { ...item, telemetryAcquired: true }
		: item;
export const initializeEconomyTelemetry = (state: GameState): GameState => {
	const telemetry = emptyEconomyTelemetry(state.gold);
	for (const item of [
		...state.bag.items,
		...Object.values(state.equipment),
		...state.townStorage,
	])
		if (item)
			telemetry.initialItems = add(telemetry.initialItems, item.kind, 1);
	for (const spell of state.knownSpells) telemetry.initialSpells[spell] = 1;
	const tracked = { ...state, economyTelemetry: telemetry };
	return {
		...tracked,
		bag: {
			items: state.bag.items.map((item) => markAcquiredItem(tracked, item)),
		},
		equipment: Object.fromEntries(
			Object.entries(state.equipment).map(([slot, item]) => [
				slot,
				item ? markAcquiredItem(tracked, item) : null,
			]),
		) as GameState["equipment"],
		townStorage: state.townStorage.map((item) =>
			markAcquiredItem(tracked, item),
		),
	};
};
const updateEconomy = (
	state: GameState,
	update: (metrics: EconomyMetrics) => EconomyMetrics,
	floor: number | null = state.town ? null : state.run.activeFloor,
): GameState => {
	const telemetry = state.economyTelemetry;
	if (!telemetry) return state;
	return {
		...state,
		economyTelemetry:
			floor === null
				? { ...telemetry, town: update(telemetry.town) }
				: {
						...telemetry,
						floors: {
							...telemetry.floors,
							[floor]: update(telemetry.floors[floor] ?? emptyEconomyMetrics()),
						},
					},
	};
};
export const recordAcquisition = (
	state: GameState,
	kind: ItemKind,
	alreadyAcquired = false,
): GameState => {
	if (alreadyAcquired || !state.economyTelemetry) return state;
	const definition = ITEM_DEFINITIONS[kind];
	return updateEconomy(state, (m) => ({
		...m,
		acquired: add(m.acquired, kind, 1),
		learned:
			definition.type === "spellbook"
				? add(m.learned, definition.teaches, 1)
				: m.learned,
	}));
};
export const recordPickupAcquisition = (
	state: GameState,
	itemId: string,
): GameState => {
	if (!state.economyTelemetry) return state;
	const item = state.floorItems.find((entry) => entry.item.id === itemId)?.item;
	return item
		? recordAcquisition(state, item.kind, item.telemetryAcquired)
		: state;
};
export const recordGoldIn = (
	state: GameState,
	amount: number,
	source: IncomeSource,
	floor?: number | null,
): GameState =>
	amount > 0
		? updateEconomy(
				state,
				(m) => ({ ...m, goldIn: add(m.goldIn, source, amount) }),
				floor,
			)
		: state;
export const recordGoldOut = (
	state: GameState,
	amount: number,
	source: ExpenseSource,
): GameState =>
	amount > 0
		? updateEconomy(state, (m) => ({
				...m,
				goldOut: add(m.goldOut, source, amount),
			}))
		: state;
export const recordTrade = (
	state: GameState,
	direction: "purchases" | "sales",
	store: TradeStore,
	item: ItemKind,
	gold: number,
): GameState => {
	if (!state.economyTelemetry) return state;
	return updateEconomy(state, (m) => {
		const previous = m[direction][store]?.[item] ?? { quantity: 0, gold: 0 };
		return {
			...m,
			[direction]: {
				...m[direction],
				[store]: {
					...m[direction][store],
					[item]: {
						quantity: previous.quantity + 1,
						gold: previous.gold + gold,
					},
				},
			},
			...(direction === "purchases"
				? { goldOut: add(m.goldOut, "purchases", gold) }
				: { goldIn: add(m.goldIn, "sales", gold) }),
		};
	});
};
