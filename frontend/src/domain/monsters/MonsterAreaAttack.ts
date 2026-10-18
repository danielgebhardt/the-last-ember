import { hasLineOfSight } from "../dungeon/Visibility";
import type { ActivityEvent } from "../game/ActivityHistory";
import { spellArea } from "../game/AreaSpells";
import type { AttackRollSource } from "../game/CombatRandomness";
import {
	deriveCombatStats,
	resolveIncomingMagicDamage,
} from "../game/CombatStats";
import { scaleEnemyValue } from "../game/Difficulty";
import type { GameState } from "../game/GameState";
import { MONSTER_DEFINITIONS, type Monster } from "./Monster";
import { orthogonalDistance } from "./MonsterLocations";
import { detectsPlayer } from "./MonsterPursuit";
import { PURSUIT_RULES, type PursuitRules } from "./PursuitRules";
export const resolveMonsterArea = (
	state: GameState,
	monster: Monster,
	rolls: AttackRollSource,
	rules: Readonly<PursuitRules> = PURSUIT_RULES,
):
	| { monster: Monster; events: ActivityEvent[]; damage?: number }
	| undefined => {
	const profile = MONSTER_DEFINITIONS[monster.kind].areaAttack;
	if (!profile) return undefined;
	if (monster.intent.type === "preparing-area") {
		const intent = monster.intent;
		if (intent.remaining > 1)
			return {
				monster: {
					...monster,
					intent: { ...intent, remaining: intent.remaining - 1 },
				},
				events: [],
			};
		const finished = { ...monster, intent: { type: "idle" as const } };
		if (
			!hasLineOfSight(
				state.run.floors[state.run.activeFloor - 1].terrain,
				monster.coordinate,
				intent.target,
			)
		)
			return {
				monster: finished,
				events: [
					{
						type: "monster-area-blocked",
						monster: monster.kind,
						element: intent.element,
						turn: state.turn,
					},
				],
			};
		const tiles = spellArea(
			state.run.floors[state.run.activeFloor - 1].terrain,
			intent.target,
			intent.radius,
		);
		if (
			!tiles.some(
				(tile) => orthogonalDistance(tile, state.run.playerCoordinate) === 0,
			)
		)
			return {
				monster: finished,
				events: [
					{
						type: "monster-area-avoided",
						monster: monster.kind,
						element: intent.element,
						turn: state.turn,
					},
				],
			};
		const rawDamage = rolls({
			seed: state.run.seed,
			floorNumber: state.run.activeFloor,
			turn: state.turn,
			attackerId: `${monster.id}:area:${intent.element}`,
			targetId: "player",
		}).damage(profile.minDamage, profile.maxDamage);
		const damage = resolveIncomingMagicDamage(
			scaleEnemyValue(rawDamage, state.difficulty),
			deriveCombatStats(state.equipment, state.progression, state.effects)
				.magicResistance,
		);
		return {
			monster: finished,
			damage,
			events: [
				{
					type: "monster-area-hit",
					monster: monster.kind,
					element: intent.element,
					damage,
					turn: state.turn,
				},
			],
		};
	}
	if (
		monster.intent.type !== "idle" ||
		!detectsPlayer(state.run, monster, rules) ||
		orthogonalDistance(monster.coordinate, state.run.playerCoordinate) >
			profile.range
	)
		return undefined;
	const target = { ...state.run.playerCoordinate };
	const remaining = profile.radius + 1;
	return {
		monster: {
			...monster,
			intent: {
				type: "preparing-area",
				target,
				radius: profile.radius,
				element: profile.element,
				remaining,
			},
		},
		events: [
			{
				type: "monster-area-prepared",
				monster: monster.kind,
				element: profile.element,
				target,
				radius: profile.radius,
				remaining,
				turn: state.turn,
			},
		],
	};
};
