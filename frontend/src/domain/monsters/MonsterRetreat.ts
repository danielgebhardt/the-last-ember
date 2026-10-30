import type { DungeonRun } from "../dungeon/DungeonRun";
import type { Monster } from "./Monster";
import { bodyDistance, bodyFitsAt, bodyTiles } from "./MonsterFootprint";
import { protectedFloorLocations } from "./MonsterLocations";

// Cardinal tie order matches pursuit. Fear cannot cross stairs, allies or the player.
export const selectRetreatStep = (
	run: DungeonRun,
	monster: Monster,
	actors: readonly Monster[],
) => {
	const blocked = [
		run.playerCoordinate,
		...protectedFloorLocations(run, monster.floorNumber),
		...actors
			.filter(
				(actor) =>
					actor.id !== monster.id &&
					actor.health > 0 &&
					actor.floorNumber === monster.floorNumber,
			)
			.flatMap((actor) => bodyTiles(actor)),
	];
	const terrain = run.floors[monster.floorNumber - 1].terrain;
	// A large body flees as a whole: all of it must fit, and its nearest tile
	// must end farther from you.
	const distance = bodyDistance(monster, run.playerCoordinate);
	return [
		{ row: -1, col: 0 },
		{ row: 0, col: 1 },
		{ row: 1, col: 0 },
		{ row: 0, col: -1 },
	]
		.map((offset) => ({
			row: monster.coordinate.row + offset.row,
			col: monster.coordinate.col + offset.col,
		}))
		.find(
			(point) =>
				bodyFitsAt(terrain, monster, point, (tile) =>
					blocked.some(
						(other) => other.row === tile.row && other.col === tile.col,
					),
				) &&
				bodyDistance(
					{ kind: monster.kind, coordinate: point },
					run.playerCoordinate,
				) > distance,
		);
};
