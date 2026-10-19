import { appendActivityEvents } from "./ActivityHistory";
import { AFFLICTION_DEFINITIONS } from "./AfflictionDefinitions";
import type { GameState } from "./GameState";
import {
	advanceAfflictions,
	applyAffliction,
	removeAfflictions,
} from "./PlayerAfflictions";
import { maximumHealth } from "./PlayerHealth";
export const applyDisease = (state: GameState, source: string): GameState => {
	if (state.player.health <= 0) return state;
	const result = applyAffliction(
		state.afflictions ?? [],
		AFFLICTION_DEFINITIONS.disease,
		source,
	);
	if (result.outcome === "unchanged") return state;
	if (result.outcome === "rejected")
		return {
			...state,
			activityHistory: appendActivityEvents(state.activityHistory, [
				{
					type: "affliction-changed",
					condition: "disease",
					change: "rejected",
					source,
					turn: state.turn,
				},
			]),
		};
	const maxHealth = maximumHealth(
		state.progression,
		state.equipment,
		result.afflictions,
	);
	return {
		...state,
		afflictions: result.afflictions,
		player: { maxHealth, health: Math.min(state.player.health, maxHealth) },
		activityHistory: appendActivityEvents(state.activityHistory, [
			{
				type: "affliction-changed",
				condition: "disease",
				change: result.outcome,
				source,
				turn: state.turn,
			},
		]),
	};
};
export const removeDisease = (state: GameState, source: string): GameState => {
	const active = state.afflictions ?? [];
	const afflictions = removeAfflictions(active, ["disease"]);
	if (afflictions === active) return state;
	return {
		...state,
		afflictions,
		player: {
			...state.player,
			maxHealth: maximumHealth(state.progression, state.equipment, afflictions),
		},
		activityHistory: appendActivityEvents(state.activityHistory, [
			{
				type: "affliction-changed",
				condition: "disease",
				change: "cured",
				source,
				turn: state.turn,
			},
		]),
	};
};

export const advancePlayerAfflictions = (state: GameState): GameState => {
	const active = state.afflictions;
	if (!active) return state;
	const afflictions = advanceAfflictions(active);
	return afflictions === active ? state : { ...state, afflictions };
};
