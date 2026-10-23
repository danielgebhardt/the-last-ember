import type { DungeonRun } from "../dungeon/DungeonRun";
import type { Coordinate } from "../dungeon/DungeonTypes";
import { FLOOR } from "../dungeon/Tiles";
import { hasLineOfSight } from "../dungeon/Visibility";
import { MONSTER_DEFINITIONS, type Monster } from "./Monster";
import {
	coordinateKey,
	orthogonalDistance,
	protectedFloorLocations,
} from "./MonsterLocations";

import { PURSUIT_RULES, type PursuitRules } from "./PursuitRules";

// The cure can be sensed through walls; this grants pursuit, never attack sight.
export const sensesCure = (
	run: DungeonRun,
	monster: Monster,
	rules: Readonly<PursuitRules>,
): boolean =>
	monster.floorNumber === run.activeFloor &&
	orthogonalDistance(monster.coordinate, run.playerCoordinate) <=
		(rules.cureSenseRadius ?? -1);

export const detectsPlayer = (
	run: DungeonRun,
	monster: Monster,
	rules: Readonly<PursuitRules> = PURSUIT_RULES,
): boolean => {
	if (monster.floorNumber !== run.activeFloor) return false;
	const row = run.playerCoordinate.row - monster.coordinate.row;
	const col = run.playerCoordinate.col - monster.coordinate.col;
	// Stealth never hides you from a monster right beside you.
	const radius = Math.max(
		1,
		MONSTER_DEFINITIONS[monster.kind].detectionRadius + rules.detectionBonus,
	);
	return (
		row * row + col * col <= radius * radius &&
		hasLineOfSight(
			run.floors[run.activeFloor - 1].terrain,
			monster.coordinate,
			run.playerCoordinate,
		)
	);
};

// Neighbor order is also the deterministic tie-breaker for equal shortest paths.
const offsets: readonly Coordinate[] = [
	{ row: -1, col: 0 },
	{ row: 0, col: 1 },
	{ row: 1, col: 0 },
	{ row: 0, col: -1 },
];
export const selectPursuitStep = (
	run: DungeonRun,
	monster: Monster,
	actors: readonly Monster[],
	target: Coordinate = run.playerCoordinate,
	exactTarget = false,
): Coordinate | undefined => {
	const terrain = run.floors[run.activeFloor - 1].terrain;
	const blocked = new Set(
		protectedFloorLocations(run, run.activeFloor).map(coordinateKey),
	);
	blocked.add(coordinateKey(run.playerCoordinate));
	for (const actor of actors) {
		if (
			actor.health > 0 &&
			actor.floorNumber === run.activeFloor &&
			actor.id !== monster.id
		)
			blocked.add(coordinateKey(actor.coordinate));
	}
	// Every pursuit path must end beside the player. If those tiles are all
	// blocked, avoid searching the entire floor for a destination that cannot exist.
	if (
		!exactTarget &&
		!offsets.some((offset) => {
			const goal = {
				row: target.row + offset.row,
				col: target.col + offset.col,
			};
			return (
				terrain[goal.row]?.[goal.col] === FLOOR &&
				!blocked.has(coordinateKey(goal))
			);
		})
	)
		return undefined;
	const visited = new Set([coordinateKey(monster.coordinate)]);
	const queue: { coordinate: Coordinate; firstStep?: Coordinate }[] = [
		{ coordinate: monster.coordinate },
	];
	// A queue cursor avoids the repeated array shifts of a large-map search.
	for (let cursor = 0; cursor < queue.length; cursor++) {
		const { coordinate, firstStep } = queue[cursor];
		if (orthogonalDistance(coordinate, target) === (exactTarget ? 0 : 1))
			return firstStep;
		for (const offset of offsets) {
			const next = {
				row: coordinate.row + offset.row,
				col: coordinate.col + offset.col,
			};
			const key = coordinateKey(next);
			if (
				visited.has(key) ||
				blocked.has(key) ||
				terrain[next.row]?.[next.col] !== FLOOR
			)
				continue;
			visited.add(key);
			queue.push({ coordinate: next, firstStep: firstStep ?? next });
		}
	}
	return undefined;
};
