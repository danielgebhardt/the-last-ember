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
import { bracesAgainstBlows } from "../items/ArenaGear";
import { navigationRun } from "../objects/NavigationTerrain";
import { MONSTER_DEFINITIONS, type Monster } from "./Monster";
import {
	bodyDistance,
	bodyFitsOn,
	bodySpan,
	bodyTiles,
	bodyTilesAt,
	occupies,
} from "./MonsterFootprint";
import { coordinateKey, protectedFloorLocations } from "./MonsterLocations";
import { actorAttackDamage } from "./MonsterStats";

// Far enough to cross any hall; the charge itself stops at the first wall.
const OVERRUN_LIMIT = 64;
type Body = Pick<Monster, "kind" | "coordinate">;
// The straight direction from a body toward `target`, when the target lies in
// the body's lane (level with one of its rows or columns); otherwise none.
const chargeDirection = (
	body: Body,
	target: Coordinate,
): Coordinate | undefined => {
	const span = bodySpan(body);
	const { row, col } = body.coordinate;
	const inRows = target.row >= row && target.row < row + span;
	const inCols = target.col >= col && target.col < col + span;
	if (inRows === inCols) return undefined;
	return inRows
		? { row: 0, col: Math.sign(target.col - col) }
		: { row: Math.sign(target.row - row), col: 0 };
};
// A point far past `target` in the same lane, for a charge that overruns its mark.
const beyond = (body: Body, target: Coordinate): Coordinate => {
	const direction = chargeDirection(body, target);
	if (!direction) return target;
	return {
		row:
			direction.row === 0
				? target.row
				: body.coordinate.row + direction.row * OVERRUN_LIMIT,
		col:
			direction.col === 0
				? target.col
				: body.coordinate.col + direction.col * OVERRUN_LIMIT,
	};
};
// Each step of a charge: where the body moves, and the tiles its leading edge
// enters. A one-tile charger's steps are the tiles of its line. The charge
// stops before stone.
export const chargeSteps = (
	terrain: readonly (readonly string[])[],
	body: Body,
	target: Coordinate,
	range: number,
): { anchor: Coordinate; leading: Coordinate[] }[] => {
	const direction = chargeDirection(body, target);
	if (!direction) return [];
	const length = Math.min(range, bodyDistance(body, target));
	const steps: { anchor: Coordinate; leading: Coordinate[] }[] = [];
	for (let step = 1; step <= length; step++) {
		const anchor = {
			row: body.coordinate.row + direction.row * step,
			col: body.coordinate.col + direction.col * step,
		};
		const behind = {
			kind: body.kind,
			coordinate: steps.at(-1)?.anchor ?? body.coordinate,
		};
		const leading = bodyTilesAt(body, anchor).filter(
			(tile) => !occupies(behind, tile),
		);
		if (leading.some((tile) => terrain[tile.row]?.[tile.col] !== ".")) break;
		steps.push({ anchor, leading });
	}
	return steps;
};
// The tiles a charge sweeps, for telegraphs: the whole lane up to its target.
export const chargeLine = (
	terrain: readonly (readonly string[])[],
	body: Body,
	target: Coordinate,
	range: number,
): Coordinate[] =>
	chargeSteps(terrain, body, target, range).flatMap((step) => step.leading);
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
			for (const tile of bodyTiles(actor)) blocked.add(coordinateKey(tile));
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
			const body = { kind: monster.kind, coordinate: step };
			const distance = bodyDistance(body, target);
			return (
				bodyFitsOn(run.floors[run.activeFloor - 1], monster, step, (tile) =>
					blocked.has(coordinateKey(tile)),
				) &&
				distance >= 2 &&
				distance <= range &&
				chargeSteps(terrain, body, target, range).length === distance
			);
		});
	const away = (step: Coordinate) =>
		bodyDistance({ kind: monster.kind, coordinate: step }, target);
	return steps.reduce<Coordinate | undefined>(
		(best, step) => (!best || away(step) < away(best) ? step : best),
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
	| {
			monster: Monster;
			events: ActivityEvent[];
			damage?: number;
			stunned?: true;
	  }
	| undefined => {
	const range = MONSTER_DEFINITIONS[monster.kind].chargeRange;
	if (!range) return undefined;
	const intent = monster.intent,
		turn = state.turn;
	if (intent.type === "recovering-charge")
		return { monster: { ...monster, intent: { type: "idle" } }, events: [] };
	if (intent.type === "idle") {
		const distance = bodyDistance(monster, state.run.playerCoordinate);
		const line = chargeSteps(
			state.run.floors[state.run.activeFloor - 1].terrain,
			monster,
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
	const same = (a: Coordinate, b: Coordinate) =>
		a.row === b.row && a.col === b.col;
	const line = overrun
		? chargeSteps(
				navigationRun(state).floors[state.run.activeFloor - 1].terrain,
				monster,
				beyond(monster, intent.target),
				OVERRUN_LIMIT,
			)
		: chargeSteps(
				state.run.floors[state.run.activeFloor - 1].terrain,
				monster,
				intent.target,
				range,
			);
	for (const { anchor, leading } of line) {
		if (
			leading.some(
				(point) =>
					protectedTiles.some((tile) => same(tile, point)) ||
					actors.some(
						(actor) =>
							actor.id !== monster.id &&
							actor.floorNumber === monster.floorNumber &&
							actor.health > 0 &&
							occupies(actor, point),
					),
			)
		)
			return finished("blocked");
		if (leading.some((point) => same(point, state.run.playerCoordinate))) {
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
				// A Juggernaut's Bulwark stops the charge dead: the charger is stunned.
				...(bracesAgainstBlows(state.equipment)
					? { stunned: true as const }
					: {}),
				events: [
					{
						type: "monster-charge-hit",
						monster: monster.kind,
						damage: outcome.damage,
						turn,
					},
					...(bracesAgainstBlows(state.equipment)
						? [{ type: "blow-braced" as const, monster: monster.kind, turn }]
						: []),
				],
			};
		}
		coordinate = anchor;
	}
	if (overrun)
		return finished(line.length < OVERRUN_LIMIT ? "slammed" : "avoided");
	return finished(
		line.length === bodyDistance(monster, intent.target)
			? "avoided"
			: "blocked",
	);
};
