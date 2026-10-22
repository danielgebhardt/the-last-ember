import type { GameState } from "../game/GameState";
import { isTestSeed } from "../game/TestSeed";

export const AUTOSAVE_TURN_INTERVAL = 100;
export type AutosaveAction = "save" | "clear" | null;

const ended = (state: GameState) =>
	state.player.health <= 0 || state.quest.victory !== null;

// What the autosave slot should do after one state change. A finished run clears it
// (no free undo of a death), the test seed never saves, and otherwise it saves on a
// floor change, entering or leaving town, a town transaction, or every 100 turns.
export const autosaveAction = (
	previous: GameState,
	next: GameState,
): AutosaveAction => {
	if (isTestSeed(next.run.seed)) return null;
	if (ended(next)) return ended(previous) ? null : "clear";
	// A different run (new or loaded): save a fresh adventure's start, which is in town.
	if (previous.run.floors !== next.run.floors)
		return next.turn === 0 ? "save" : null;
	if (previous.run.activeFloor !== next.run.activeFloor) return "save";
	if (!previous.town !== !next.town) return "save";
	if (
		next.town &&
		(previous.gold !== next.gold ||
			previous.bag !== next.bag ||
			previous.townStorage !== next.townStorage ||
			previous.equipment !== next.equipment ||
			previous.knownSpells !== next.knownSpells ||
			previous.afflictions !== next.afflictions)
	)
		return "save";
	if (
		Math.floor(previous.turn / AUTOSAVE_TURN_INTERVAL) !==
		Math.floor(next.turn / AUTOSAVE_TURN_INTERVAL)
	)
		return "save";
	return null;
};
