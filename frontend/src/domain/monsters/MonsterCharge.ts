import type { Coordinate } from "../dungeon/DungeonTypes";
import type { ActivityEvent } from "../game/ActivityHistory";
import type { AttackRollSource } from "../game/CombatRandomness";
import { deriveCombatStats } from "../game/CombatStats";
import type { GameState } from "../game/GameState";
import {
	attackProfile,
	deriveAccuracy,
	resolveMeleeAttack,
} from "../game/MeleeRules";
import { hasMonsterEffect } from "../game/TimedEffects";
import { MONSTER_DEFINITIONS, type Monster } from "./Monster";
import {
	orthogonalDistance,
	protectedFloorLocations,
} from "./MonsterLocations";
import { monsterAttackDamage } from "./MonsterStats";

export const chargeLine = (
	terrain: readonly (readonly string[])[],
	start: Coordinate,
	target: Coordinate,
	range: number,
): Coordinate[] => {
	if (start.row !== target.row && start.col !== target.col) return [];
	const dr = Math.sign(target.row - start.row),
		dc = Math.sign(target.col - start.col);
	const length = Math.min(range, orthogonalDistance(start, target));
	const points: Coordinate[] = [];
	for (let step = 1; step <= length; step++) {
		const point = { row: start.row + dr * step, col: start.col + dc * step };
		if (terrain[point.row]?.[point.col] !== ".") break;
		points.push(point);
	}
	return points;
};
export const resolveMonsterCharge = (
	state: GameState,
	monster: Monster,
	actors: readonly Monster[],
	rolls: AttackRollSource,
	detected: boolean,
):
	| { monster: Monster; events: ActivityEvent[]; damage?: number }
	| undefined => {
	const range = MONSTER_DEFINITIONS[monster.kind].chargeRange;
	if (!range) return undefined;
	const intent = monster.intent,
		turn = state.turn;
	if (intent.type === "recovering-charge")
		return { monster: { ...monster, intent: { type: "idle" } }, events: [] };
	if (intent.type === "idle") {
		const distance = orthogonalDistance(
			monster.coordinate,
			state.run.playerCoordinate,
		);
		const line = chargeLine(
			state.run.floors[state.run.activeFloor - 1].terrain,
			monster.coordinate,
			state.run.playerCoordinate,
			range,
		);
		if (
			!detected ||
			distance < 2 ||
			distance > range ||
			line.length !== distance ||
			hasMonsterEffect(state, monster, "rooted")
		)
			return undefined;
		return {
			monster: {
				...monster,
				intent: {
					type: "preparing-charge",
					target: { ...state.run.playerCoordinate },
				},
			},
			events: [
				{
					type: "monster-charge-prepared",
					actorId: monster.id,
					monster: monster.kind,
					target: { ...state.run.playerCoordinate },
					turn,
				},
			],
		};
	}
	if (intent.type !== "preparing-charge") return undefined;
	let coordinate = monster.coordinate;
	const finished = (
		outcome: "blocked" | "avoided" | "missed" | "interrupted",
	) => ({
		monster: {
			...monster,
			coordinate,
			intent: { type: "recovering-charge" as const },
		},
		events: [
			{
				type: "monster-charge-ended" as const,
				actorId: monster.id,
				monster: monster.kind,
				outcome,
				turn,
			},
		],
	});
	if (hasMonsterEffect(state, monster, "rooted"))
		return finished("interrupted");
	const protectedTiles = protectedFloorLocations(
		state.run,
		state.run.activeFloor,
	);
	const line = chargeLine(
		state.run.floors[state.run.activeFloor - 1].terrain,
		monster.coordinate,
		intent.target,
		range,
	);
	for (const point of line) {
		if (
			protectedTiles.some((tile) => orthogonalDistance(tile, point) === 0) ||
			actors.some(
				(actor) =>
					actor.id !== monster.id &&
					actor.floorNumber === monster.floorNumber &&
					actor.health > 0 &&
					orthogonalDistance(actor.coordinate, point) === 0,
			)
		)
			return finished("blocked");
		if (orthogonalDistance(point, state.run.playerCoordinate) === 0) {
			const outcome = resolveMeleeAttack(
				attackProfile(
					monsterAttackDamage(
						monster.kind,
						monster.floorNumber,
						monster.heroic,
					),
					deriveAccuracy(
						state.progression,
						state.effects,
						state.equipment,
						state.afflictions,
					).monsterHitThreshold,
				),
				rolls({
					seed: state.run.seed,
					floorNumber: monster.floorNumber,
					turn,
					attackerId: `${monster.id}:charge`,
					targetId: "player",
				}),
				deriveCombatStats(state.equipment, state.progression, state.effects)
					.armor,
				state.difficulty,
			);
			if (!outcome.hit) return finished("missed");
			return {
				monster: {
					...monster,
					coordinate,
					intent: { type: "recovering-charge" },
				},
				damage: outcome.damage,
				events: [
					{
						type: "monster-charge-hit",
						monster: monster.kind,
						damage: outcome.damage,
						turn,
					},
				],
			};
		}
		coordinate = point;
	}
	return finished(
		line.length === orthogonalDistance(monster.coordinate, intent.target)
			? "avoided"
			: "blocked",
	);
};
