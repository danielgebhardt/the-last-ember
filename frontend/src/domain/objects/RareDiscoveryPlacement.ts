import { selectWeighted } from "../content/WeightedSelection";
import { type DungeonRun, hashStringToUint32 } from "../dungeon/DungeonRun";
import type { Coordinate } from "../dungeon/DungeonTypes";
import { createSeededRandom } from "../dungeon/Seed";
import { FLOOR } from "../dungeon/Tiles";
import type { FloorItem } from "../items/FloorItems";
import { availableItemLocations } from "../items/ItemPlacement";
import type { Monster } from "../monsters/Monster";
import { coordinateKey } from "../monsters/MonsterLocations";
import { type DungeonObject, OBJECT_DEFINITIONS } from "./DungeonObject";
import { navigationRun } from "./NavigationTerrain";

// Future epic children join this pool, never roll a second per-floor budget.
// At most one discovery per adventure; each kind keeps its own floor band.
export const RARE_DISCOVERY_CHANCE = 0.4;
const pool = [
	{ value: "sarcophagus" as const, weight: 1 },
	{ value: "forge" as const, weight: 1 },
];
export const rareDiscoverySelection = (
	run: Pick<DungeonRun, "seed" | "floors">,
) => {
	const random = createSeededRandom(
		hashStringToUint32(`${run.seed}:rare-discovery:selection`),
	);
	if (random() >= RARE_DISCOVERY_CHANCE) return undefined;
	const kind = selectWeighted(pool, random);
	if (!kind) return undefined;
	const definition = OBJECT_DEFINITIONS[kind];
	const floors = run.floors.filter(
		(f) =>
			f.floorNumber >= definition.minFloor &&
			f.floorNumber <= definition.maxFloor,
	);
	if (!floors.length) return undefined;
	return {
		kind,
		floorNumber: floors[Math.floor(random() * floors.length)].floorNumber,
	};
};
export const neighbors = ({ row, col }: Coordinate): Coordinate[] => [
	{ row: row - 1, col },
	{ row, col: col + 1 },
	{ row: row + 1, col },
	{ row, col: col - 1 },
];
// Breadth-first order gives nearest reachable tiles, with stable N/E/S/W ties.
export const reachableRoomTiles = (
	run: DungeonRun,
	floorNumber: number,
	origin: Coordinate,
	objects: readonly DungeonObject[],
): Coordinate[] => {
	const floor = navigationRun({ run, objects }).floors[floorNumber - 1];
	const queue = [origin],
		visited = new Set([coordinateKey(origin)]),
		result: Coordinate[] = [];
	for (let index = 0; index < queue.length; index++) {
		const point = queue[index];
		if (
			floor.terrain[point.row]?.[point.col] === FLOOR &&
			floor.rooms.some(
				(r) =>
					point.row >= r.startRow &&
					point.row <= r.endRow &&
					point.col >= r.startCol &&
					point.col <= r.endCol,
			)
		)
			result.push(point);
		for (const next of neighbors(point)) {
			const key = coordinateKey(next);
			if (visited.has(key) || floor.terrain[next.row]?.[next.col] !== FLOOR)
				continue;
			visited.add(key);
			queue.push(next);
		}
	}
	return result;
};
export const placeRareDiscovery = (
	run: DungeonRun,
	monsters: readonly Monster[],
	items: readonly FloorItem[],
	objects: readonly DungeonObject[],
): DungeonObject[] => {
	const selected = rareDiscoverySelection(run);
	if (!selected) return [];
	const floor = run.floors[selected.floorNumber - 1];
	if (!floor.rooms.length) return [];
	// Interior positions cannot occupy a room entrance. Objects remain walkable.
	const candidates = availableItemLocations(run, floor, monsters, [
		...items,
		...objects,
	]).filter((p) =>
		floor.rooms.some(
			(r) =>
				p.row > r.startRow &&
				p.row < r.endRow &&
				p.col > r.startCol &&
				p.col < r.endCol,
		),
	);
	if (!candidates.length) return [];
	const random = createSeededRandom(
		hashStringToUint32(`${run.seed}:rare-discovery:position`),
	);
	return [
		{
			id: `floor:${selected.floorNumber}:object:${selected.kind}:1`,
			...selected,
			coordinate: candidates[Math.floor(random() * candidates.length)],
			activated: false,
		},
	];
};
