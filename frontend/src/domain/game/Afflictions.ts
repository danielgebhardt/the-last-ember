import { appendActivityEvents } from "./ActivityHistory";
import {
	type ActiveAffliction,
	AFFLICTION_DEFINITIONS,
	type AfflictionKind,
	afflictionModifiers,
} from "./AfflictionDefinitions";
import type { GameState } from "./GameState";
import { maximumMana } from "./Mana";
import {
	advanceAfflictions,
	applyAffliction,
	removeAfflictions,
} from "./PlayerAfflictions";
import { maximumHealth } from "./PlayerHealth";

// Capacity is derived from afflictions; current HP and mana clamp but never refill.
const withAfflictions = (
	state: GameState,
	afflictions: readonly ActiveAffliction[],
): Pick<GameState, "player" | "mana"> => {
	const maxHealth = maximumHealth(
		state.progression,
		state.equipment,
		afflictions,
	);
	return {
		player: { maxHealth, health: Math.min(state.player.health, maxHealth) },
		mana: Math.min(
			state.mana,
			maximumMana(
				state.progression,
				state.equipment,
				state.effects,
				afflictions,
			),
		),
	};
};

export const applyPlayerAffliction = (
	state: GameState,
	kind: AfflictionKind,
	source: string,
): GameState => {
	if (state.player.health <= 0) return state;
	const result = applyAffliction(
		state.afflictions,
		AFFLICTION_DEFINITIONS[kind],
		source,
	);
	if (result.outcome === "unchanged") return state;
	const event = {
		type: "affliction-changed" as const,
		condition: kind,
		change: result.outcome,
		source,
		turn: state.turn,
	};
	if (result.outcome === "rejected")
		return {
			...state,
			activityHistory: appendActivityEvents(state.activityHistory, [event]),
		};
	return {
		...state,
		afflictions: result.afflictions,
		...withAfflictions(state, result.afflictions),
		activityHistory: appendActivityEvents(state.activityHistory, [event]),
	};
};

export const removePlayerAfflictions = (
	state: GameState,
	kinds: readonly AfflictionKind[],
	source: string,
): GameState => {
	const active = state.afflictions;
	const afflictions = removeAfflictions(active, kinds);
	if (afflictions === active) return state;
	return {
		...state,
		afflictions,
		...withAfflictions(state, afflictions),
		activityHistory: appendActivityEvents(
			state.activityHistory,
			active
				.filter((a) => !afflictions.includes(a))
				.map((a) => ({
					type: "affliction-changed" as const,
					condition: a.kind,
					change: "cured" as const,
					source,
					turn: state.turn,
				})),
		),
	};
};

// Called once at the committed-phase boundary, after timed effects, so durations count
// the phase they land in. Expiry is logged once, never per phase.
export const advancePlayerAfflictions = (ticked: GameState): GameState => {
	const active = ticked.afflictions;
	const afflictions = advanceAfflictions(active);
	if (afflictions === active) return ticked;
	const expired = active.filter(
		(a) => !afflictions.some((next) => next.kind === a.kind),
	);
	if (!expired.length) return { ...ticked, afflictions };
	return {
		...ticked,
		afflictions,
		...withAfflictions(ticked, afflictions),
		activityHistory: appendActivityEvents(
			ticked.activityHistory,
			expired.map((a) => ({
				type: "affliction-changed" as const,
				condition: a.kind,
				change: "expired" as const,
				source: a.source,
				turn: ticked.turn,
			})),
		),
	};
};

// Damage ticks right after monsters act and before timed effects such as Renewal, so
// lethal poison cannot be healed away in the same phase.
export const tickAfflictionDamage = (state: GameState): GameState => {
	let next = state;
	for (const { kind } of state.afflictions) {
		const perPhase = afflictionModifiers(kind).damagePerPhase;
		if (!perPhase || next.player.health <= 0) continue;
		const damage = Math.min(next.player.health, perPhase);
		const health = next.player.health - damage;
		next = {
			...next,
			player: { ...next.player, health },
			activityHistory: appendActivityEvents(next.activityHistory, [
				{
					type: "player-condition-hit",
					condition: kind,
					damage,
					turn: next.turn,
				},
				...(health === 0
					? [{ type: "player-died" as const, turn: next.turn }]
					: []),
			]),
		};
	}
	return next;
};
