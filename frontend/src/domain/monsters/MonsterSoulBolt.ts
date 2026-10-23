import {
	deriveCombatStats,
	resolveIncomingMagicDamage,
} from "../game/CombatStats";
import { scaleEnemyValue } from "../game/Difficulty";
import type { GameState } from "../game/GameState";
import { omenSpellDamage } from "../game/Omens";
import { MONSTER_DEFINITIONS, type Monster } from "./Monster";
import { orthogonalDistance } from "./MonsterLocations";
import {
	resolvedTelegraph,
	type SpecialActionOutcome,
	telegraphReady,
} from "./MonsterTelegraphs";

// No telegraph: while it sees you within range and off cooldown, a bolt replaces
// its attack. Shadow damage (magic resistance applies) plus Soul Drain.
export const resolveMonsterSoulBolt = (
	state: GameState,
	monster: Monster,
	detected: boolean,
): SpecialActionOutcome | undefined => {
	const bolt = MONSTER_DEFINITIONS[monster.kind].soulBolt;
	const turn = state.turn;
	if (
		!bolt ||
		monster.intent.type !== "idle" ||
		!detected ||
		!telegraphReady(monster, "soul-bolt", turn) ||
		orthogonalDistance(monster.coordinate, state.run.playerCoordinate) >
			bolt.range
	)
		return undefined;
	const damage = resolveIncomingMagicDamage(
		omenSpellDamage(state, scaleEnemyValue(bolt.damage, state.difficulty)),
		deriveCombatStats(state.equipment, state.progression, state.effects)
			.magicResistance,
	);
	return {
		monster: resolvedTelegraph(monster, "soul-bolt", turn),
		events: [
			{ type: "monster-soul-bolt-hit", monster: monster.kind, damage, turn },
		],
		damage,
		affliction: "soul-drain",
	};
};
