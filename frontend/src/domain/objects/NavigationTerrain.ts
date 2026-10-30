import type { DungeonFloor, DungeonRun } from "../dungeon/DungeonRun";
import { WALL } from "../dungeon/Tiles";
import { blocksPassage, type DungeonObject } from "./DungeonObject";

// Objects a 2×2 body walks around, though one-tile creatures, spells and sight
// pass over them: the hall features you strike, which its drawing would hide.
const BODY_OBSTACLE_KINDS: readonly string[] = ["egg-sac", "phylactery"];
export const bodyObstacles = (
	objects: readonly DungeonObject[],
	floorNumber: number,
): string[] =>
	objects
		.filter(
			(object) =>
				object.floorNumber === floorNumber &&
				BODY_OBSTACLE_KINDS.includes(object.kind),
		)
		.map(({ coordinate }) => `${coordinate.row}:${coordinate.col}`);

const cache = new WeakMap<
	readonly DungeonObject[],
	WeakMap<DungeonFloor, DungeonFloor>
>();
export const navigationRun = (state: {
	run: DungeonRun;
	objects: readonly DungeonObject[];
}): DungeonRun => {
	let floors = cache.get(state.objects);
	if (!floors) {
		floors = new WeakMap();
		cache.set(state.objects, floors);
	}
	const navigation = state.run.floors.map((floor) => {
		const cached = floors.get(floor);
		if (cached) return cached;
		const closed = state.objects.filter(
			(object) =>
				blocksPassage(object) && object.floorNumber === floor.floorNumber,
		);
		const obstacles = bodyObstacles(state.objects, floor.floorNumber);
		if (!closed.length && !obstacles.length) {
			floors.set(floor, floor);
			return floor;
		}
		const changed = new Map<number, string[]>();
		for (const door of closed) {
			const row = changed.get(door.coordinate.row) ?? [
				...floor.terrain[door.coordinate.row],
			];
			row[door.coordinate.col] = WALL;
			changed.set(door.coordinate.row, row);
		}
		const result = {
			...floor,
			terrain: floor.terrain.map((row, index) => changed.get(index) ?? row),
			...(obstacles.length ? { bodyObstacles: obstacles } : {}),
		};
		floors.set(floor, result);
		return result;
	});
	return { ...state.run, floors: navigation };
};
