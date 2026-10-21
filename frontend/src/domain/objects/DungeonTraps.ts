import { hashStringToUint32 } from "../dungeon/DungeonRun";
import { createSeededRandom } from "../dungeon/Seed";
import { appendActivityEvents } from "../game/ActivityHistory";
import { applyPlayerAffliction } from "../game/Afflictions";
import { deriveAttributes } from "../game/Attributes";
import { awardExperience } from "../game/ExperienceRewards";
import type { GameState } from "../game/GameState";
import {
	type DungeonObject,
	TRAP_BLEEDING_CHANCE,
	TRAP_DISARM_EXPERIENCE,
} from "./DungeonObject";
import { objectDamage, spendObject } from "./ObjectEffects";
export const trapDamage = (seed: number, trap: DungeonObject): number =>
	2 +
	Math.min(2, Math.floor(trap.floorNumber / 5)) +
	Math.floor(
		createSeededRandom(hashStringToUint32(`${seed}:${trap.id}:damage`))() * 3,
	);
// A sprung trap's own stream decides Bleeding, so disarm and damage rolls stay unchanged.
export const trapCausesBleeding = (seed: number, trap: DungeonObject) =>
	createSeededRandom(hashStringToUint32(`${seed}:${trap.id}:bleeding`))() <
	TRAP_BLEEDING_CHANCE;
export const springTrap = (
	state: GameState,
	trap: DungeonObject,
): GameState => {
	const sprung = objectDamage(
		spendObject(state, trap),
		trapDamage(state.run.seed, trap),
		{
			type: "trap-sprung",
			damage: trapDamage(state.run.seed, trap),
			turn: state.turn,
		},
	);
	return trapCausesBleeding(state.run.seed, trap)
		? applyPlayerAffliction(sprung, "bleeding", "trap")
		: sprung;
};
export const disarmTrap = (
	state: GameState,
	trap: DungeonObject,
): GameState | { error: string } => {
	if (trap.activated) return { error: "This trap is already spent." };
	const { dexterityModifier } = deriveAttributes(
		state.progression,
		state.effects,
		state.equipment,
	);
	const chance = Math.min(
		0.95,
		Math.max(0.25, 0.55 + dexterityModifier * 0.05),
	);
	const roll = createSeededRandom(
		hashStringToUint32(`${state.run.seed}:${trap.id}:disarm`),
	)();
	if (roll >= chance) return springTrap(state, trap);
	const spent = spendObject(state, trap);
	return awardExperience(
		{
			...spent,
			activityHistory: appendActivityEvents(spent.activityHistory, [
				{ type: "trap-disarmed", turn: state.turn },
			]),
		},
		TRAP_DISARM_EXPERIENCE,
	);
};
export const triggerArrivalTrap = (state: GameState): GameState => {
	const trap = state.objects.find(
		(object) =>
			object.kind === "trap" &&
			!object.activated &&
			object.floorNumber === state.run.activeFloor &&
			object.coordinate.row === state.run.playerCoordinate.row &&
			object.coordinate.col === state.run.playerCoordinate.col,
	);
	return trap ? springTrap(state, trap) : state;
};
