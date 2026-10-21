import type { Coordinate } from "../dungeon/DungeonTypes";
import type { ActivityEvent } from "../game/ActivityHistory";
import type { AfflictionKind } from "../game/AfflictionDefinitions";
import {
	MONSTER_DEFINITIONS,
	type Monster,
	type MonsterDefinition,
	type MonsterIntent,
} from "./Monster";
import { orthogonalDistance } from "./MonsterLocations";

// Prepare-then-act behaviors whose saved intent is a single target tile. The
// area attack carries extra state and keeps its own shape and checks.
export type TargetTelegraph = Exclude<
	MonsterIntent["type"],
	"idle" | "recovering-charge" | "preparing-area"
>;
// What a special action did this phase. Damage lands first; the affliction
// applies only if the player survives it.
export type SpecialActionOutcome = Readonly<{
	monster: Monster;
	events: ActivityEvent[];
	damage?: number;
	affliction?: AfflictionKind;
}>;
// Behaviors that need a pause after resolving; the monster saves the turn.
export type TelegraphCooldown = "web" | "hex" | "blind";

type TelegraphRule = Readonly<{
	owns: (definition: MonsterDefinition) => boolean;
	// Whether a saved target is a plausible preparation from this monster.
	reaches: (monster: Monster, target: Coordinate) => boolean;
	advice: string;
}>;

const reach = (monster: Monster, target: Coordinate) =>
	orthogonalDistance(monster.coordinate, target);

export const TARGET_TELEGRAPHS: Readonly<
	Record<TargetTelegraph, TelegraphRule>
> = {
	"preparing-attack": {
		owns: (definition) => definition.preparesAttack === true,
		reaches: (monster, target) => reach(monster, target) === 1,
		advice:
			"Move off the marked tile before its next action; Sleep or Fear cancels the heavy strike.",
	},
	"preparing-charge": {
		owns: (definition) => definition.chargeRange !== undefined,
		reaches: (monster, target) =>
			(monster.coordinate.row === target.row ||
				monster.coordinate.col === target.col) &&
			reach(monster, target) >= 2 &&
			reach(monster, target) <=
				(MONSTER_DEFINITIONS[monster.kind].chargeRange ?? 0),
		advice:
			"Sidestep the marked line before its next action; Sleep or Fear interrupts, Web stops the charge.",
	},
	"preparing-alarm": {
		owns: (definition) => definition.alarmRadius !== undefined,
		reaches: (monster, target) =>
			monster.alarmUsed !== true &&
			reach(monster, target) > 0 &&
			Math.hypot(
				monster.coordinate.row - target.row,
				monster.coordinate.col - target.col,
			) <=
				MONSTER_DEFINITIONS[monster.kind].detectionRadius + 2,
		advice:
			"Alarm on its next action: kill it or use Sleep or Fear. Web does not silence it.",
	},
	"preparing-web": {
		owns: (definition) => definition.webAttack !== undefined,
		reaches: (monster, target) =>
			reach(monster, target) <=
			(MONSTER_DEFINITIONS[monster.kind].webAttack?.range ?? 0),
		advice:
			"Move off the marked tile before its next action to avoid Slowed; Sleep or Fear cancels the web.",
	},
	"preparing-hex": {
		owns: (definition) => definition.hexAttack !== undefined,
		reaches: (monster, target) =>
			reach(monster, target) <=
			(MONSTER_DEFINITIONS[monster.kind].hexAttack?.range ?? 0),
		advice:
			"Hex on its next action: break its line of sight, get out of range, or use Sleep or Fear to avoid Curse.",
	},
	"preparing-blind": {
		owns: (definition) => definition.blindingStrike !== undefined,
		reaches: (monster, target) => reach(monster, target) === 1,
		advice:
			"Blinding strike on its next action: move off the marked tile, or use Sleep or Fear to cancel it.",
	},
};
export const isTargetTelegraph = (type: string): type is TargetTelegraph =>
	Object.hasOwn(TARGET_TELEGRAPHS, type);

export const TELEGRAPH_COOLDOWNS: Readonly<
	Record<
		TelegraphCooldown,
		(definition: MonsterDefinition) => number | undefined
	>
> = {
	web: (definition) => definition.webAttack?.cooldown,
	hex: (definition) => definition.hexAttack?.cooldown,
	blind: (definition) => definition.blindingStrike?.cooldown,
};

// Another use needs more than the cooldown since the last resolution.
export const telegraphReady = (
	monster: Monster,
	kind: TelegraphCooldown,
	turn: number,
): boolean => {
	const last = monster.telegraphTurn?.[kind];
	const cooldown = TELEGRAPH_COOLDOWNS[kind](MONSTER_DEFINITIONS[monster.kind]);
	return last === undefined || cooldown === undefined || turn - last > cooldown;
};
export const resolvedTelegraph = (
	monster: Monster,
	kind: TelegraphCooldown,
	turn: number,
): Monster => ({
	...monster,
	intent: { type: "idle" },
	telegraphTurn: { ...monster.telegraphTurn, [kind]: turn },
});
