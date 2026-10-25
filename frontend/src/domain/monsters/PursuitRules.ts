import type { GameState } from "../game/GameState";
import { omenDetectionBonus } from "../game/Omens";
import { pactDetectionBonus } from "../game/Pacts";
import { equipmentStealth } from "../items/ItemValues";

export type PursuitRules = {
	detectionBonus: number;
	memoryPhases: number;
	searchPhases: number;
	blockedPhases: number;
	cureSenseRadius?: number;
};
// Counts are eligible active monster phases, not global turns or wall-clock time.
export const PURSUIT_RULES: Readonly<PursuitRules> = {
	detectionBonus: 0,
	memoryPhases: 12,
	searchPhases: 3,
	blockedPhases: 3,
};

export const ESCAPE_PURSUIT_RULES: Readonly<PursuitRules> = {
	cureSenseRadius: 24,
	detectionBonus: 2,
	memoryPhases: 18,
	searchPhases: 4,
	blockedPhases: 3,
};
// Stealthy equipment shrinks every detection radius, on top of the escape's wider one.
export const pursuitRulesFor = (
	state: Pick<GameState, "escape" | "quest"> &
		Partial<Pick<GameState, "equipment" | "omens" | "run" | "progression">>,
): Readonly<PursuitRules> => {
	const base =
		state.escape && state.quest.cureRecovered && !state.quest.victory
			? ESCAPE_PURSUIT_RULES
			: PURSUIT_RULES;
	const shift =
		omenDetectionBonus(state) +
		(state.progression ? pactDetectionBonus(state.progression) : 0) -
		(state.equipment ? equipmentStealth(state.equipment) : 0);
	return shift
		? { ...base, detectionBonus: base.detectionBonus + shift }
		: base;
};
