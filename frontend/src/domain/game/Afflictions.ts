import { appendActivityEvents } from "./ActivityHistory";
import {
	type ActiveAffliction,
	AFFLICTION_DEFINITIONS,
	type AfflictionKind,
} from "./AfflictionDefinitions";
import type { GameState } from "./GameState";
import {
	advanceAfflictions,
	applyAffliction,
	removeAfflictions,
} from "./PlayerAfflictions";
import { maximumHealth } from "./PlayerHealth";

// Capacity is derived from afflictions; current HP clamps but is never healed.
const withAfflictions = (
	state: GameState,
	afflictions: readonly ActiveAffliction[],
): GameState["player"] => {
	const maxHealth = maximumHealth(
		state.progression,
		state.equipment,
		afflictions,
	);
	return { maxHealth, health: Math.min(state.player.health, maxHealth) };
};

export const applyPlayerAffliction = (
	state: GameState,
	kind: AfflictionKind,
	source: string,
): GameState => {
	if (state.player.health <= 0) return state;
	const result = applyAffliction(
		state.afflictions ?? [],
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
		player: withAfflictions(state, result.afflictions),
		activityHistory: appendActivityEvents(state.activityHistory, [event]),
	};
};

export const removePlayerAfflictions = (
	state: GameState,
	kinds: readonly AfflictionKind[],
	source: string,
): GameState => {
	const active = state.afflictions ?? [];
	const afflictions = removeAfflictions(active, kinds);
	if (afflictions === active) return state;
	return {
		...state,
		afflictions,
		player: withAfflictions(state, afflictions),
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

// Called once at the committed-phase boundary; expiry is logged once, never per phase.
export const advancePlayerAfflictions = (state: GameState): GameState => {
	const active = state.afflictions;
	if (!active) return state;
	const afflictions = advanceAfflictions(active);
	if (afflictions === active) return state;
	const expired = active.filter(
		(a) => !afflictions.some((next) => next.kind === a.kind),
	);
	if (!expired.length) return { ...state, afflictions };
	return {
		...state,
		afflictions,
		player: withAfflictions(state, afflictions),
		activityHistory: appendActivityEvents(
			state.activityHistory,
			expired.map((a) => ({
				type: "affliction-changed" as const,
				condition: a.kind,
				change: "expired" as const,
				source: a.source,
				turn: state.turn,
			})),
		),
	};
};
