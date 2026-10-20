import { expect } from "vitest";
import type {
	DungeonFloor,
	DungeonRun,
	StairLink,
} from "../domain/dungeon/DungeonRun.ts";
import type {
	Coordinate,
	Dungeon,
	LocationSelectionSource,
} from "../domain/dungeon/DungeonTypes.ts";
import type { PartitionNode, Region } from "../domain/dungeon/Partitioning.ts";
import type { Room } from "../domain/dungeon/Room.ts";
import { FLOOR, WALL } from "../domain/dungeon/Tiles.ts";

// Compact region literal for tests: [startRow, endRow, startCol, endCol], all inclusive.
export const rect = ([
	startRow,
	endRow,
	startCol,
	endCol,
]: readonly number[]): Region => ({
	startRow,
	endRow,
	startCol,
	endCol,
});

export const getTerminalRegions = (node: PartitionNode): Region[] => {
	if (!node.children) {
		return [node.region];
	}

	return node.children.flatMap(getTerminalRegions);
};

export const getRegionArea = (region: Region): number => {
	const rowCount = region.endRow - region.startRow + 1;
	const colCount = region.endCol - region.startCol + 1;

	return rowCount * colCount;
};

export const makeLocationSelectionSource = (
	rooms: Room[],
): LocationSelectionSource => {
	if (rooms.length === 0) {
		return {
			rooms: [],
			terrain: [],
		};
	}

	const maxRow = Math.max(...rooms.map((room) => room.endRow));
	const maxCol = Math.max(...rooms.map((room) => room.endCol));

	const terrain: string[][] = Array.from({ length: maxRow + 1 }, () =>
		Array.from({ length: maxCol + 1 }, () => WALL),
	);

	for (const room of rooms) {
		for (let row = room.startRow; row <= room.endRow; row++) {
			for (let col = room.startCol; col <= room.endCol; col++) {
				terrain[row][col] = FLOOR;
			}
		}
	}

	return {
		rooms,
		terrain,
	};
};

const coordinateKey = ({ row, col }: Coordinate): string => `${row},${col}`;

type ReachableTile = { coordinate: Coordinate; previous?: string };

// Record each tile once when adding it to the queue. An index avoids shifting
// the queue for every tile, and the predecessor supports path reconstruction.
const traverseFloorTiles = (terrain: Dungeon, start: Coordinate) => {
	expect(terrain[start.row]?.[start.col]).toBe(FLOOR);
	const tiles = new Map<string, ReachableTile>([
		[coordinateKey(start), { coordinate: start }],
	]);
	const queue = [start];
	for (let index = 0; index < queue.length; index++) {
		const current = queue[index];
		for (const [rowChange, colChange] of [
			[-1, 0],
			[1, 0],
			[0, -1],
			[0, 1],
		]) {
			const neighbor = {
				row: current.row + rowChange,
				col: current.col + colChange,
			};
			const key = coordinateKey(neighbor);
			if (terrain[neighbor.row]?.[neighbor.col] !== FLOOR || tiles.has(key))
				continue;
			tiles.set(key, {
				coordinate: neighbor,
				previous: coordinateKey(current),
			});
			queue.push(neighbor);
		}
	}
	return tiles;
};

export const getReachableFloorTiles = (
	terrain: Dungeon,
	start: Coordinate,
): Set<string> => new Set(traverseFloorTiles(terrain, start).keys());

export const expectAllFloorTilesReachable = (
	terrain: Dungeon,
	start: Coordinate,
) => {
	const reachable = getReachableFloorTiles(terrain, start);
	const floorTileCount = terrain.reduce(
		(count, row) => count + row.filter((tile) => tile === FLOOR).length,
		0,
	);
	// Traversal visits only floor tiles, so equal counts mean none are disconnected.
	expect(reachable.size).toBe(floorTileCount);
};

export const findFloorPath = (
	terrain: Dungeon,
	start: Coordinate,
	target: Coordinate,
): Coordinate[] => {
	const tiles = traverseFloorTiles(terrain, start);
	const path: Coordinate[] = [];
	let key: string | undefined = coordinateKey(target);
	while (key !== undefined) {
		const tile = tiles.get(key);
		if (!tile) throw new Error("Test fixture has no floor path to the target");
		path.push(tile.coordinate);
		key = tile.previous;
	}
	return path.reverse();
};

type TestDungeonFloorOptions = {
	floorNumber: number;
	rows: number;
	cols: number;
	room: Room;
	upStair?: StairLink;
	downStair?: StairLink;
};

export const createTestDungeonFloor = ({
	floorNumber,
	rows,
	cols,
	room,
	upStair,
	downStair,
}: TestDungeonFloorOptions): DungeonFloor => {
	// These traversal fixtures describe one room, with no corridors or RNG.
	const terrain: string[][] = Array.from({ length: rows }, (_, row) =>
		Array.from({ length: cols }, (_, col) =>
			row >= room.startRow &&
			row <= room.endRow &&
			col >= room.startCol &&
			col <= room.endCol
				? FLOOR
				: WALL,
		),
	);

	return {
		floorNumber,
		terrain,
		rooms: [{ ...room }],
		corridors: [],
		partitions: {
			region: { startRow: 0, endRow: rows - 1, startCol: 0, endCol: cols - 1 },
			room: { ...room },
		},
		upStair,
		downStair,
	};
};

export const START_COORDINATE: Coordinate = { row: 1, col: 1 };

export const fixedDungeon: Dungeon = [
	[WALL, WALL, WALL, WALL, WALL],
	[WALL, FLOOR, FLOOR, FLOOR, WALL],
	[WALL, FLOOR, WALL, FLOOR, WALL],
	[WALL, FLOOR, FLOOR, FLOOR, WALL],
	[WALL, WALL, WALL, WALL, WALL],
];

export const createThreeFloorTraversalRun = (): DungeonRun => {
	const floor1 = createTestDungeonFloor({
		floorNumber: 1,
		rows: 3,
		cols: 4,
		room: { startRow: 1, endRow: 1, startCol: 1, endCol: 2 },
		downStair: {
			coordinate: { row: 1, col: 2 },
			destinationFloor: 2,
			arrivalCoordinate: { row: 1, col: 1 },
		},
	});

	const floor2 = createTestDungeonFloor({
		floorNumber: 2,
		rows: 3,
		cols: 5,
		room: { startRow: 1, endRow: 1, startCol: 1, endCol: 3 },
		upStair: {
			coordinate: { row: 1, col: 1 },
			destinationFloor: 1,
			arrivalCoordinate: { row: 1, col: 2 },
		},
		downStair: {
			coordinate: { row: 1, col: 3 },
			destinationFloor: 3,
			arrivalCoordinate: { row: 1, col: 1 },
		},
	});

	const floor3 = createTestDungeonFloor({
		floorNumber: 3,
		rows: 4,
		cols: 4,
		room: { startRow: 1, endRow: 2, startCol: 1, endCol: 2 },
		upStair: {
			coordinate: { row: 1, col: 1 },
			destinationFloor: 2,
			arrivalCoordinate: { row: 1, col: 3 },
		},
	});

	return {
		seed: 123,
		floors: [floor1, floor2, floor3],
		activeFloor: 1,
		playerCoordinate: { row: 1, col: 1 },
	};
};

// A single step right enters floor 1's down stair. Floor 2's arrival stair is
// at (1, 1), leaving room to move away before returning to ascend.
export const createTwoFloorTraversalRun = (
	destination: Pick<TestDungeonFloorOptions, "rows" | "cols" | "room"> = {
		rows: 4,
		cols: 5,
		room: { startRow: 1, endRow: 2, startCol: 1, endCol: 3 },
	},
): DungeonRun => ({
	seed: 123,
	activeFloor: 1,
	playerCoordinate: { row: 1, col: 1 },
	floors: [
		createTestDungeonFloor({
			floorNumber: 1,
			rows: 3,
			cols: 3,
			room: { startRow: 1, endRow: 1, startCol: 1, endCol: 2 },
			downStair: {
				coordinate: { row: 1, col: 2 },
				destinationFloor: 2,
				arrivalCoordinate: { row: 1, col: 1 },
			},
		}),
		createTestDungeonFloor({
			...destination,
			floorNumber: 2,
			upStair: {
				coordinate: { row: 1, col: 1 },
				destinationFloor: 1,
				arrivalCoordinate: { row: 1, col: 2 },
			},
		}),
	],
});
