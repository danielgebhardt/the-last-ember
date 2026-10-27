import { ITEM_DEFINITIONS, type ItemKind } from "../items/Item";
import { updateCombatMetrics } from "./CombatTelemetry";
import type { GameState } from "./GameState";
import type { SpellKind } from "./Spells";

export type ConsumableKind = {
	[K in ItemKind]: (typeof ITEM_DEFINITIONS)[K]["type"] extends
		| "potion"
		| "scroll"
		| "enchantment"
		? K
		: never;
}[ItemKind];
type EquipmentKind = {
	[K in ItemKind]: (typeof ITEM_DEFINITIONS)[K]["type"] extends
		| "weapon"
		| "shield"
		| "chest-armor"
		| "helmet"
		| "ring"
		? K
		: never;
}[ItemKind];

const kinds = Object.keys(ITEM_DEFINITIONS) as ItemKind[];
export const USAGE_CONSUMABLE_KINDS = kinds.filter(
	(kind): kind is ConsumableKind =>
		["potion", "scroll", "enchantment"].includes(ITEM_DEFINITIONS[kind].type),
);
export const USAGE_EQUIPMENT_KINDS = kinds.filter(
	(kind): kind is EquipmentKind =>
		["weapon", "shield", "chest-armor", "helmet", "ring"].includes(
			ITEM_DEFINITIONS[kind].type,
		),
);

// Present only on newly generated adventures. Sparse maps mean measured zero for
// omitted catalog kinds; absence of the entire field means usage is unknown.
export type RunUsage = {
	casts: Partial<Record<SpellKind, number>>;
	consumables: Partial<Record<ConsumableKind, number>>;
	equippedTurns: Partial<Record<EquipmentKind, number>>;
};
export const emptyRunUsage = (): RunUsage => ({
	casts: {},
	consumables: {},
	equippedTurns: {},
});

export const recordSpellUse = (
	state: GameState,
	spell: SpellKind,
): GameState =>
	state.usage
		? {
				...recordLocalUsage(state, "casts", spell),
				usage: {
					...state.usage,
					casts: {
						...state.usage.casts,
						[spell]: (state.usage.casts[spell] ?? 0) + 1,
					},
				},
			}
		: state;

export const recordConsumableUse = (
	state: GameState,
	kind: ItemKind,
	floor?: number | null,
): GameState => {
	if (!state.usage || !USAGE_CONSUMABLE_KINDS.includes(kind as ConsumableKind))
		return state;
	const consumed = kind as ConsumableKind;
	return {
		...recordLocalUsage(state, "consumables", consumed, floor),
		usage: {
			...state.usage,
			consumables: {
				...state.usage.consumables,
				[consumed]: (state.usage.consumables[consumed] ?? 0) + 1,
			},
		},
	};
};

// Called after the accepted player effect, before the ensuing monster phase.
// Swaps credit the new gear; gear destroyed during retaliation still earns its turn.
// Two rings of the same kind count as one turn of wearing that kind, not two.
export const recordEquippedTurn = (state: GameState): GameState => {
	if (!state.usage) return state;
	const kinds = new Set(
		Object.values(state.equipment).flatMap((item) =>
			item ? [item.kind as EquipmentKind] : [],
		),
	);
	const equippedTurns = { ...state.usage.equippedTurns };
	for (const kind of kinds)
		equippedTurns[kind] = (equippedTurns[kind] ?? 0) + 1;
	const measured = kinds.size
		? updateCombatMetrics(state, (m) => {
				const local = { ...m.usage.equippedTurns };
				for (const kind of kinds) local[kind] = (local[kind] ?? 0) + 1;
				return { ...m, usage: { ...m.usage, equippedTurns: local } };
			})
		: state;
	return { ...measured, usage: { ...state.usage, equippedTurns } };
};

const recordLocalUsage = (
	state: GameState,
	counter: keyof RunUsage,
	kind: string,
	floor?: number | null,
): GameState =>
	updateCombatMetrics(
		state,
		(m) => {
			const counts = m.usage[counter] as Record<string, number>;
			return {
				...m,
				usage: {
					...m.usage,
					[counter]: { ...counts, [kind]: (counts[kind] ?? 0) + 1 },
				},
			};
		},
		floor,
	);
