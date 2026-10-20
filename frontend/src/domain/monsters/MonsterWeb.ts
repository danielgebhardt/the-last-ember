import type { GameState } from "../game/GameState";
import { MONSTER_DEFINITIONS, type Monster } from "./Monster";
import { orthogonalDistance } from "./MonsterLocations";
import {
	resolvedTelegraph,
	type SpecialActionOutcome,
	telegraphReady,
} from "./MonsterTelegraphs";

// A web replaces that phase's attack: prepare on a seen tile, then resolve next phase.
// Staying on the marked tile is Slowed; no hit roll, damage or magic resistance applies.
export const resolveMonsterWeb = (
	state: GameState,
	monster: Monster,
	detected: boolean,
): SpecialActionOutcome | undefined => {
	const web = MONSTER_DEFINITIONS[monster.kind].webAttack;
	if (!web) return undefined;
	const turn = state.turn;
	const player = state.run.playerCoordinate;
	if (monster.intent.type === "preparing-web") {
		const caught = orthogonalDistance(monster.intent.target, player) === 0;
		return {
			monster: resolvedTelegraph(monster, "web", turn),
			events: [
				{
					type: caught ? "monster-web-hit" : "monster-web-avoided",
					monster: monster.kind,
					turn,
				},
			],
			...(caught ? { affliction: "slowed" as const } : {}),
		};
	}
	if (
		monster.intent.type !== "idle" ||
		!detected ||
		!telegraphReady(monster, "web", turn) ||
		orthogonalDistance(monster.coordinate, player) > web.range
	)
		return undefined;
	const target = { ...player };
	return {
		monster: { ...monster, intent: { type: "preparing-web", target } },
		events: [
			{ type: "monster-web-prepared", monster: monster.kind, target, turn },
		],
	};
};
