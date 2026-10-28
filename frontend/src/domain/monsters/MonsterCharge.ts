import type { DungeonRun } from "../dungeon/DungeonRun";
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
import { navigationRun } from "../objects/NavigationTerrain";
import { MONSTER_DEFINITIONS, type Monster } from "./Monster";
import {
	coordinateKey,
	orthogonalDistance,
	protectedFloorLocations,
} from "./MonsterLocations";
import { actorAttackDamage } from "./MonsterStats";

// Far enough to cross any hall; the line itself stops at the first wall.
const OVERRUN_LIMIT = 64;
const beyond = (start: Coordinate, target: Coordinate): Coordinate => ({
	row: start.row + Math.sign(target.row - start.row) * OVERRUN_LIMIT,
	col: start.col + Math.sign(target.col - start.col) * OVERRUN_LIMIT,
});
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
// Only the Iron Juggernaut hunts for a charging line: its arena fight is built on the
// charge, while ordinary chargers simply close in. When it can't charge or strike, it
// takes a step that leaves it in line with the player, a clear 2 to range tiles away,
// nearest first. Undefined means ordinary pursuit.
export const selectChargeApproach = (
	run: DungeonRun,
	monster: Monster,
	actors: readonly Monster[],
): Coordinate | undefined => {
	const range = MONSTER_DEFINITIONS[monster.kind].chargeRange;
	if (monster.kind !== "iron-juggernaut" || !range) return undefined;
	const terrain = run.floors[run.activeFloor - 1].terrain;
	const target = run.playerCoordinate;
	const blocked = new Set(
		protectedFloorLocations(run, run.activeFloor).map(coordinateKey),
	);
	for (const actor of actors)
		if (
			actor.health > 0 &&
			actor.floorNumber === run.activeFloor &&
			actor.id !== monster.id
		)
			blocked.add(coordinateKey(actor.coordinate));
	// The same neighbor order as pursuit breaks ties.
	const steps = [
		{ row: -1, col: 0 },
		{ row: 0, col: 1 },
		{ row: 1, col: 0 },
		{ row: 0, col: -1 },
	]
		.map((offset) => ({
			row: monster.coordinate.row + offset.row,
			col: monster.coordinate.col + offset.col,
		}))
		.filter((step) => {
			const distance = orthogonalDistance(step, target);
			return (
				terrain[step.row]?.[step.col] === "." &&
				!blocked.has(coordinateKey(step)) &&
				distance >= 2 &&
				distance <= range &&
				chargeLine(terrain, step, target, range).length === distance
			);
		});
	return steps.reduce<Coordinate | undefined>(
		(best, step) =>
			!best ||
			orthogonalDistance(step, target) < orthogonalDistance(best, target)
				? step
				: best,
		undefined,
	);
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
	const overrun = MONSTER_DEFINITIONS[monster.kind].overrun === true;
	// In its second phase a juggernaut wastes no time recovering from a missed charge.
	const relentless = overrun && monster.minibossPhase === 2;
	const finished = (
		outcome: "blocked" | "avoided" | "missed" | "interrupted" | "slammed",
	) => ({
		...(outcome === "slammed" ? { stunned: true as const } : {}),
		monster: {
			...monster,
			coordinate,
			intent:
				relentless && outcome !== "slammed"
					? { type: "idle" as const }
					: { type: "recovering-charge" as const },
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
	// An overrunning charge keeps going past its mark, through open doors, until stone
	// or someone stops it.
	const line = overrun
		? chargeLine(
				navigationRun(state).floors[state.run.activeFloor - 1].terrain,
				monster.coordinate,
				beyond(monster.coordinate, intent.target),
				OVERRUN_LIMIT,
			)
		: chargeLine(
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
					actorAttackDamage(monster),
					deriveAccuracy(
						state.progression,
						state.effects,
						state.equipment,
						state.afflictions,
						state.player,
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
	if (overrun)
		return finished(line.length < OVERRUN_LIMIT ? "slammed" : "avoided");
	return finished(
		line.length === orthogonalDistance(monster.coordinate, intent.target)
			? "avoided"
			: "blocked",
	);
};
