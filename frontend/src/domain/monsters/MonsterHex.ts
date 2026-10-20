import type { ActivityEvent } from "../game/ActivityHistory";
import {
	deriveCombatStats,
	resolveIncomingMagicDamage,
} from "../game/CombatStats";
import { scaleEnemyValue } from "../game/Difficulty";
import type { GameState } from "../game/GameState";
import { MONSTER_DEFINITIONS, type Monster } from "./Monster";
import { orthogonalDistance } from "./MonsterLocations";

// A hex replaces that phase's attack: prepare while it sees you, then resolve next action.
// Breaking its sight or leaving range avoids it; landing deals arcane damage and Curse.
export const resolveMonsterHex = (
	state: GameState,
	monster: Monster,
	detected: boolean,
):
	| { monster: Monster; events: ActivityEvent[]; damage?: number }
	| undefined => {
	const hex = MONSTER_DEFINITIONS[monster.kind].hexAttack;
	if (!hex) return undefined;
	const turn = state.turn;
	const inReach =
		detected &&
		orthogonalDistance(monster.coordinate, state.run.playerCoordinate) <=
			hex.range;
	if (monster.intent.type === "preparing-hex") {
		const resolved = {
			...monster,
			intent: { type: "idle" as const },
			hexTurn: turn,
		};
		if (!inReach)
			return {
				monster: resolved,
				events: [{ type: "monster-hex-avoided", monster: monster.kind, turn }],
			};
		const damage = resolveIncomingMagicDamage(
			scaleEnemyValue(hex.damage, state.difficulty),
			deriveCombatStats(state.equipment, state.progression, state.effects)
				.magicResistance,
		);
		return {
			monster: resolved,
			events: [
				{ type: "monster-hex-hit", monster: monster.kind, damage, turn },
			],
			damage,
		};
	}
	if (
		monster.intent.type !== "idle" ||
		!inReach ||
		(monster.hexTurn !== undefined && turn - monster.hexTurn <= hex.cooldown)
	)
		return undefined;
	const target = { ...state.run.playerCoordinate };
	return {
		monster: { ...monster, intent: { type: "preparing-hex", target } },
		events: [
			{ type: "monster-hex-prepared", monster: monster.kind, target, turn },
		],
	};
};
