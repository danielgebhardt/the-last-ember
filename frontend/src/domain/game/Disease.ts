import { applyPlayerAffliction, removePlayerAfflictions } from "./Afflictions";
import type { GameState } from "./GameState";

export { advancePlayerAfflictions } from "./Afflictions";
export const applyDisease = (state: GameState, source: string): GameState =>
	applyPlayerAffliction(state, "disease", source);
export const removeDisease = (state: GameState, source: string): GameState =>
	removePlayerAfflictions(state, ["disease"], source);
