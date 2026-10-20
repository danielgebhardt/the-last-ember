import type { ActivityEvent } from "../game/ActivityHistory";
import type { GameState } from "../game/GameState";
import { MONSTER_DEFINITIONS, type Monster } from "./Monster";
import { orthogonalDistance } from "./MonsterLocations";

// A web replaces that phase's attack: prepare on a seen tile, then resolve next phase.
// Staying on the marked tile is Slowed; no hit roll, damage or magic resistance applies.
export const resolveMonsterWeb = (
	state: GameState,
	monster: Monster,
	detected: boolean,
):
	| { monster: Monster; events: ActivityEvent[]; slowed: boolean }
	| undefined => {
	const web = MONSTER_DEFINITIONS[monster.kind].webAttack;
	if (!web) return undefined;
	const turn = state.turn;
	const player = state.run.playerCoordinate;
	if (monster.intent.type === "preparing-web") {
		const caught = orthogonalDistance(monster.intent.target, player) === 0;
		return {
			monster: { ...monster, intent: { type: "idle" }, webTurn: turn },
			events: [
				{
					type: caught ? "monster-web-hit" : "monster-web-avoided",
					monster: monster.kind,
					turn,
				},
			],
			slowed: caught,
		};
	}
	if (
		monster.intent.type !== "idle" ||
		!detected ||
		(monster.webTurn !== undefined && turn - monster.webTurn <= web.cooldown) ||
		orthogonalDistance(monster.coordinate, player) > web.range
	)
		return undefined;
	const target = { ...player };
	return {
		monster: { ...monster, intent: { type: "preparing-web", target } },
		events: [
			{ type: "monster-web-prepared", monster: monster.kind, target, turn },
		],
		slowed: false,
	};
};
