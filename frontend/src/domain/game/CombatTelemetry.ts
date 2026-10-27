import type { Monster, MonsterKind } from "../monsters/Monster";
import type { ActivityEvent } from "./ActivityHistory";
import type { AfflictionKind } from "./AfflictionDefinitions";
import type { GameState } from "./GameState";
import type { OmenKind } from "./Omens";
import type { PactKind } from "./Pacts";
import { isPlayerDamage } from "./PlayerDamageEvents";
import type { RunUsage } from "./RunUsage";
import type { SpellKind } from "./Spells";

export const DAMAGE_SOURCES = [
	"melee",
	"ranged",
	"spell",
	"trap",
	"condition",
	"object",
	"self-spell",
	"blade",
] as const;
export const HEALING_SOURCES = [
	"potion",
	"spell",
	"renewal",
	"drain-life",
	"fountain",
	"throne",
	"hourglass",
	"arena",
	"sanctuary",
] as const;
export const PRESSURE_EVENTS = [
	"arena-entered",
	"arena-cleared",
	"thief-met",
	"mimic-revealed",
	"runic-portal-used",
	"town-scroll-used",
	"town-portal-returned",
	"town-gate-exit",
	"upward-stairs",
] as const;
export type DamageSource = (typeof DAMAGE_SOURCES)[number];
export type HealingSource = (typeof HEALING_SOURCES)[number];
export type PressureEvent = (typeof PRESSURE_EVENTS)[number];
export type DeathSource = {
	source: DamageSource;
	monster?: MonsterKind;
	condition?: AfflictionKind;
	spell?: SpellKind;
};
export type CombatMetrics = {
	damage: Partial<Record<DamageSource, number>>;
	damageByMonster: Partial<Record<MonsterKind, number>>;
	damageByCondition: Partial<Record<AfflictionKind, number>>;
	healing: Partial<Record<HealingSource, number>>;
	defeated: Partial<Record<MonsterKind, number>>;
	heroicDefeated: number;
	summonedDefeated: number;
	pressure: Partial<Record<PressureEvent, number>>;
	omens: Partial<Record<OmenKind, number>>;
	pacts: Partial<Record<PactKind, number>>;
	usage: RunUsage;
	death?: DeathSource;
};
export type CombatTelemetry = {
	floors: Partial<Record<number, CombatMetrics>>;
	town: CombatMetrics;
};
export const emptyCombatMetrics = (): CombatMetrics => ({
	damage: {},
	damageByMonster: {},
	damageByCondition: {},
	healing: {},
	defeated: {},
	heroicDefeated: 0,
	summonedDefeated: 0,
	pressure: {},
	omens: {},
	pacts: {},
	usage: { casts: {}, consumables: {}, equippedTurns: {} },
});
export const emptyCombatTelemetry = (): CombatTelemetry => ({
	floors: {},
	town: emptyCombatMetrics(),
});

// Called at the confirmed effect, with the location that actually received it.
// Missing telemetry stays unknown; no action-log replay, RNG or network work.
export const updateCombatMetrics = (
	state: GameState,
	update: (metrics: CombatMetrics) => CombatMetrics,
	floor: number | null = state.town ? null : state.run.activeFloor,
): GameState => {
	const telemetry = state.combatTelemetry;
	if (!telemetry) return state;
	const previous = floor === null ? telemetry.town : telemetry.floors[floor];
	const updated = update(previous ?? emptyCombatMetrics());
	if (updated === previous) return state;
	return {
		...state,
		combatTelemetry:
			floor === null
				? { ...telemetry, town: updated }
				: {
						...telemetry,
						floors: { ...telemetry.floors, [floor]: updated },
					},
	};
};
const add = <K extends string>(
	map: Partial<Record<K, number>>,
	key: K,
	amount: number,
): Partial<Record<K, number>> => ({ ...map, [key]: (map[key] ?? 0) + amount });
export const recordDamageTaken = (
	state: GameState,
	amount: number,
	source: DeathSource,
): GameState => {
	const actual = Math.min(state.player.health, Math.max(0, amount));
	if (!actual) return state;
	return updateCombatMetrics(state, (m) => ({
		...m,
		damage: add(m.damage, source.source, actual),
		damageByMonster: source.monster
			? add(m.damageByMonster, source.monster, actual)
			: m.damageByMonster,
		damageByCondition: source.condition
			? add(m.damageByCondition, source.condition, actual)
			: m.damageByCondition,
		...(actual === state.player.health ? { death: source } : {}),
	}));
};
export const recordHealing = (
	state: GameState,
	amount: number,
	source: HealingSource,
	maximum = state.player.maxHealth,
): GameState => {
	const actual = Math.max(0, Math.min(amount, maximum - state.player.health));
	return actual
		? updateCombatMetrics(state, (m) => ({
				...m,
				healing: add(m.healing, source, actual),
			}))
		: state;
};
export const recordDefeat = (state: GameState, monster: Monster): GameState =>
	updateCombatMetrics(
		state,
		(m) => ({
			...m,
			defeated: add(m.defeated, monster.kind, 1),
			heroicDefeated: m.heroicDefeated + (monster.heroic ? 1 : 0),
			summonedDefeated: m.summonedDefeated + (monster.summonedBy ? 1 : 0),
		}),
		monster.floorNumber,
	);
export const recordPressure = (
	state: GameState,
	kind: PressureEvent,
	amount = 1,
	floor?: number | null,
): GameState =>
	amount
		? updateCombatMetrics(
				state,
				(m) => ({ ...m, pressure: add(m.pressure, kind, amount) }),
				floor,
			)
		: state;
export const recordOmen = (state: GameState, omen: OmenKind): GameState =>
	updateCombatMetrics(state, (m) =>
		m.omens[omen] ? m : { ...m, omens: { ...m.omens, [omen]: 1 } },
	);
export const recordPact = (state: GameState, pact: PactKind): GameState =>
	updateCombatMetrics(state, (m) => ({ ...m, pacts: add(m.pacts, pact, 1) }));

export const damageEventSource = (
	event: ActivityEvent,
): DeathSource | undefined => {
	if (!isPlayerDamage(event)) return undefined;
	switch (event.type) {
		case "monster-shot-hit":
			return { source: "ranged", monster: event.monster };
		case "monster-hit":
		case "monster-withdrawal-hit":
		case "monster-heavy-hit":
		case "monster-charge-hit":
			return { source: "melee", monster: event.monster };
		case "monster-spell-hit":
			return { source: "spell", monster: event.monster, spell: event.spell };
		case "monster-area-hit":
		case "monster-hex-hit":
		case "monster-blind-hit":
		case "monster-soul-bolt-hit":
			return { source: "spell", monster: event.monster };
		case "player-condition-hit":
			return { source: "condition", condition: event.condition };
		case "player-spell-hit":
			return { source: "self-spell", spell: event.spell };
		case "trap-sprung":
			return { source: "trap" };
		default:
			return { source: "object" };
	}
};
// Monster phases already build an ordered, untruncated event batch. They never
// heal the player between hits. Cap each hit against the remaining HP, not its roll.
export const recordMonsterDamageBatch = (
	state: GameState,
	events: readonly ActivityEvent[],
): GameState => {
	if (!state.combatTelemetry) return state;
	let next = state,
		health = state.player.health;
	for (const event of events) {
		const source = damageEventSource(event);
		if (!source || !isPlayerDamage(event)) continue;
		next = recordDamageTaken(
			{ ...next, player: { ...state.player, health } },
			event.damage,
			source,
		);
		health = Math.max(0, health - event.damage);
	}
	return next === state ? state : { ...next, player: state.player };
};
