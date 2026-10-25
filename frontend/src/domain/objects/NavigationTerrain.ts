import type { DungeonFloor, DungeonRun } from "../dungeon/DungeonRun";
import { WALL } from "../dungeon/Tiles";
import { blocksPassage, type DungeonObject } from "./DungeonObject";

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
		if (!closed.length) {
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
		};
		floors.set(floor, result);
		return result;
	});
	return { ...state.run, floors: navigation };
};
