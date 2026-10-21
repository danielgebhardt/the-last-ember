import type { AttackRollSource } from "../game/CombatRandomness";
import { deriveCombatStats } from "../game/CombatStats";
import type { GameState } from "../game/GameState";
import {
	attackProfile,
	deriveAccuracy,
	resolveMeleeAttack,
} from "../game/MeleeRules";
import { MONSTER_DEFINITIONS, type Monster } from "./Monster";
import { orthogonalDistance } from "./MonsterLocations";
import { monsterAttackDamage } from "./MonsterStats";
import {
	resolvedTelegraph,
	type SpecialActionOutcome,
	telegraphReady,
} from "./MonsterTelegraphs";

// A blinding strike replaces that phase's attack: mark the adjacent player's tile,
// then on its next action make a normal melee roll if they stayed on it.
export const resolveMonsterBlindingStrike = (
	state: GameState,
	monster: Monster,
	detected: boolean,
	rollSource: AttackRollSource,
): SpecialActionOutcome | undefined => {
	if (!MONSTER_DEFINITIONS[monster.kind].blindingStrike) return undefined;
	const turn = state.turn;
	const player = state.run.playerCoordinate;
	if (monster.intent.type === "preparing-blind") {
		const resolved = resolvedTelegraph(monster, "blind", turn);
		if (
			orthogonalDistance(monster.intent.target, player) !== 0 ||
			orthogonalDistance(monster.coordinate, player) !== 1
		)
			return {
				monster: resolved,
				events: [
					{ type: "monster-blind-avoided", monster: monster.kind, turn },
				],
			};
		const { armor } = deriveCombatStats(
			state.equipment,
			state.progression,
			state.effects,
		);
		const { monsterHitThreshold } = deriveAccuracy(
			state.progression,
			state.effects,
			state.equipment,
			state.afflictions,
		);
		const outcome = resolveMeleeAttack(
			attackProfile(
				monsterAttackDamage(monster.kind, monster.floorNumber, monster.heroic),
				monsterHitThreshold,
			),
			rollSource({
				seed: state.run.seed,
				floorNumber: state.run.activeFloor,
				turn,
				attackerId: `${monster.id}:blind`,
				targetId: "player",
			}),
			armor,
			state.difficulty,
		);
		return outcome.hit
			? {
					monster: resolved,
					events: [
						{
							type: "monster-blind-hit",
							monster: monster.kind,
							damage: outcome.damage,
							turn,
						},
					],
					damage: outcome.damage,
					affliction: "blinded",
				}
			: {
					monster: resolved,
					events: [
						{ type: "monster-blind-missed", monster: monster.kind, turn },
					],
				};
	}
	if (
		monster.intent.type !== "idle" ||
		!detected ||
		!telegraphReady(monster, "blind", turn) ||
		orthogonalDistance(monster.coordinate, player) !== 1
	)
		return undefined;
	const target = { ...player };
	return {
		monster: { ...monster, intent: { type: "preparing-blind", target } },
		events: [
			{ type: "monster-blind-prepared", monster: monster.kind, target, turn },
		],
	};
};
