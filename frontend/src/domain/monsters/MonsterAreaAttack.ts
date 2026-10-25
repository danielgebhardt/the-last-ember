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
import { resolvedTelegraph, telegraphReady } from "./MonsterTelegraphs";
import { PURSUIT_RULES, type PursuitRules } from "./PursuitRules";

// The Warden's breath scales with its saved depth attack: half to full, raw.
const breathDamage = (
	monster: Monster,
	profile: { minDamage: number; maxDamage: number },
): [number, number] =>
	monster.warden
		? [
				Math.max(1, Math.ceil(monster.warden.attackDamage / 2)),
				monster.warden.attackDamage,
			]
		: [profile.minDamage, profile.maxDamage];
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
		// A breather with a cooldown records when it breathed, blocked or not.
		const finished = profile.cooldown
			? resolvedTelegraph(monster, "breath", state.turn)
			: { ...monster, intent: { type: "idle" as const } };
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
		}).damage(...breathDamage(monster, profile));
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
		// A Pyre Lord in its second phase breathes without pause.
		!(
			monster.minibossPhase === 2 ||
			telegraphReady(monster, "breath", state.turn)
		) ||
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
