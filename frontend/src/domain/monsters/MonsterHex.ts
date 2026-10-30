import {
	deriveCombatStats,
	resolveIncomingMagicDamage,
} from "../game/CombatStats";
import { scaleEnemyValue } from "../game/Difficulty";
import type { GameState } from "../game/GameState";
import { omenSpellDamage } from "../game/Omens";
import { MONSTER_DEFINITIONS, type Monster } from "./Monster";
import { bodyDistance } from "./MonsterFootprint";
import {
	resolvedTelegraph,
	type SpecialActionOutcome,
	telegraphReady,
} from "./MonsterTelegraphs";

// A hex replaces that phase's attack: prepare while it sees you, then resolve next action.
// Breaking its sight or leaving range avoids it; landing deals arcane damage and its
// affliction, Curse unless the hex names another.
export const resolveMonsterHex = (
	state: GameState,
	monster: Monster,
	detected: boolean,
): SpecialActionOutcome | undefined => {
	const hex = MONSTER_DEFINITIONS[monster.kind].hexAttack;
	if (!hex || (hex.fromPhase === 2 && monster.minibossPhase !== 2))
		return undefined;
	const turn = state.turn;
	const inReach =
		detected && bodyDistance(monster, state.run.playerCoordinate) <= hex.range;
	if (monster.intent.type === "preparing-hex") {
		const resolved = resolvedTelegraph(monster, "hex", turn);
		if (!inReach)
			return {
				monster: resolved,
				events: [{ type: "monster-hex-avoided", monster: monster.kind, turn }],
			};
		const damage = resolveIncomingMagicDamage(
			omenSpellDamage(state, scaleEnemyValue(hex.damage, state.difficulty)),
			deriveCombatStats(state.equipment, state.progression, state.effects)
				.magicResistance,
		);
		return {
			monster: resolved,
			events: [
				{ type: "monster-hex-hit", monster: monster.kind, damage, turn },
			],
			damage,
			affliction: hex.affliction ?? "curse",
		};
	}
	if (
		monster.intent.type !== "idle" ||
		!inReach ||
		!telegraphReady(monster, "hex", turn)
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
