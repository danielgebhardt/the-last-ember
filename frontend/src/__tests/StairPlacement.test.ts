// @vitest-environment node

import { describe, expect, it } from "vitest";
import { createCorridor } from "../domain/dungeon/Corridor.ts";
import {
	selectPlayerStart,
	selectStairLocation,
} from "../domain/dungeon/DungeonLocations.ts";
import {
	connectAdjacentFloors,
	connectDungeonFloors,
	createDungeonRun,
	type DungeonFloor,
	generateDungeonFloor,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun.ts";
import { DEFAULT_RUN_CONFIGURATION } from "../domain/dungeon/RunConfiguration.ts";
import { createSeededRandom } from "../domain/dungeon/Seed.ts";
import {
	carveCorridors,
	carveRooms,
	makeDungeon,
} from "../domain/dungeon/Terrain.ts";
import { FLOOR } from "../domain/dungeon/Tiles.ts";
import {
	createTestDungeonFloor,
	expectAllFloorTilesReachable,
	rect,
} from "./testhelpers.ts";

const rooms = [rect([1, 3, 1, 3]), rect([1, 3, 5, 7]), rect([1, 5, 9, 13])];

const makeSource = () => ({
	rooms: structuredClone(rooms),
	terrain: carveCorridors(carveRooms(makeDungeon(7, 15), rooms), [
		createCorridor(rooms[0], rooms[1]),
		createCorridor(rooms[1], rooms[2]),
	]),
});

describe("Seeded stair links", () => {
	const config = { rows: 12, cols: 20, minPartitionSize: 5, roomPadding: 1 };
	const fixedGeometry = () => {
		const floors = [1, 2, 3].map((floorNumber) =>
			generateDungeonFloor(123, floorNumber, config),
		);
		return createDungeonRun(123, floors);
	};
	const geometryOf = ({
		upStair: _up,
		downStair: _down,
		...geometry
	}: DungeonFloor) => geometry;

	it("varies links from the run seed even when every floor's geometry is fixed", () => {
		const run = fixedGeometry();
		const coordinates = Array.from({ length: 20 }, (_, seed) =>
			connectDungeonFloors({ ...run, seed }).floors.map(
				(floor) => floor.downStair?.coordinate,
			),
		);
		expect(
			new Set(coordinates.map((coordinates) => JSON.stringify(coordinates)))
				.size,
		).toBeGreaterThan(1);
	});

	it("varies upstairs rooms and tiles while leaving downstairs independent", () => {
		const run = fixedGeometry();
		const floor = run.floors[1];
		const roomIndices = new Set<number>();
		const tiles = new Set<string>();
		for (let seed = 0; seed < 30; seed++) {
			const linked = connectDungeonFloors({ ...run, seed });
			const up = linked.floors[1].upStair?.coordinate;
			expect(up).toBeDefined();
			if (!up) throw new Error("Missing upstairs");
			roomIndices.add(
				floor.rooms.findIndex(
					(room) =>
						up.row >= room.startRow &&
						up.row <= room.endRow &&
						up.col >= room.startCol &&
						up.col <= room.endCol,
				),
			);
			tiles.add(JSON.stringify(up));
		}
		expect(roomIndices.size).toBeGreaterThan(1);
		expect(roomIndices.has(-1)).toBe(false);
		expect(tiles.size).toBeGreaterThan(1);
	});
	it("reproduces complete links despite intervening connections with another seed", () => {
		const run = fixedGeometry();
		const first = connectDungeonFloors(run);
		connectDungeonFloors({ ...run, seed: 456 });
		expect(connectDungeonFloors(run)).toEqual(first);
	});

	it("preserves terrain and geometry across different stair seeds without modifying the run", () => {
		const run = fixedGeometry();
		const before = structuredClone(run);
		for (const seed of [0, 123, 456]) {
			const linked = connectDungeonFloors({ ...run, seed });
			expect(linked.floors.map(geometryOf)).toEqual(run.floors.map(geometryOf));
		}
		expect(run).toEqual(before);
		expect(generateDungeonRun(123, 3, config)).toEqual(before);
	});

	it("reproduces links when floors are generated in another order", () => {
		const individuallyGenerated = [3, 1, 2].map((floorNumber) =>
			generateDungeonFloor(123, floorNumber, config),
		);
		const orderedFloors = individuallyGenerated.sort(
			(a, b) => a.floorNumber - b.floorNumber,
		);
		const run = createDungeonRun(123, orderedFloors);
		expect(connectDungeonFloors(run)).toEqual(
			connectDungeonFloors(generateDungeonRun(123, 3, config)),
		);
	});

	it("produces the same complete links when adjacent pairs are connected in reverse order", () => {
		const run = fixedGeometry();
		const before = structuredClone(run);
		const floors = [...run.floors];
		for (const index of [1, 0]) {
			[floors[index], floors[index + 1]] = connectAdjacentFloors(
				run.seed,
				floors[index],
				floors[index + 1],
			);
		}
		expect({ ...run, floors }).toEqual(connectDungeonFloors(run));
		expect(run).toEqual(before);
	});

	it("uses floor identity as well as the run seed for stair randomness", () => {
		const [first, second] = fixedGeometry().floors;
		const stairs = Array.from({ length: 10 }, (_, index) => {
			const [linked] = connectAdjacentFloors(
				123,
				{ ...first, floorNumber: index + 1 },
				{ ...second, floorNumber: index + 2 },
			);
			return linked.downStair?.coordinate;
		});
		expect(
			new Set(stairs.map((stair) => JSON.stringify(stair))).size,
		).toBeGreaterThan(1);
	});

	it("keeps existing stair placement stable when the run is extended", () => {
		const shortRun = connectDungeonFloors(generateDungeonRun(123, 3, config));
		const longRun = connectDungeonFloors(generateDungeonRun(123, 5, config));
		expect(longRun.floors.slice(0, 2)).toEqual(shortRun.floors.slice(0, 2));
	});

	it("preserves reciprocal, distinct stairs when each floor has only two floor tiles", () => {
		const floors = [1, 2, 3].map((floorNumber) =>
			createTestDungeonFloor({
				floorNumber,
				rows: 3,
				cols: 4,
				room: rect([1, 1, 1, 2]),
			}),
		);
		const baseline = connectDungeonFloors(createDungeonRun(0, floors));
		for (const seed of [0, 123, 456]) {
			const linked = connectDungeonFloors(createDungeonRun(seed, floors));
			expect(linked.floors).toEqual(baseline.floors);
			for (let index = 0; index < floors.length - 1; index++) {
				const down = linked.floors[index].downStair;
				const up = linked.floors[index + 1].upStair;
				expect(down?.coordinate).toEqual({ row: 1, col: 2 });
				expect(up?.coordinate).toEqual({ row: 1, col: 1 });
				expect(down?.arrivalCoordinate).toEqual(up?.coordinate);
				expect(up?.arrivalCoordinate).toEqual(down?.coordinate);
				expectAllFloorTilesReachable(linked.floors[index].terrain, {
					row: 1,
					col: 1,
				});
			}
		}
	});

	it("rejects links between nonadjacent floors without modifying either floor", () => {
		const run = fixedGeometry();
		const before = structuredClone(run);
		expect(() =>
			connectAdjacentFloors(run.seed, run.floors[0], run.floors[2]),
		).toThrow(new RangeError("Stair links must connect adjacent floors"));
		expect(run).toEqual(before);
	});

	it("keeps stairs distinct, reachable, and reciprocal across known seeds", () => {
		for (let seed = 0; seed < 20; seed++) {
			const run = connectDungeonFloors(generateDungeonRun(seed, 3, config));
			for (const floor of run.floors) {
				const entry = selectPlayerStart(floor);
				if (floor.downStair) {
					expect(floor.downStair.coordinate).not.toEqual(entry);
					const entryRoom = floor.rooms.find(
						(room) =>
							entry.row >= room.startRow &&
							entry.row <= room.endRow &&
							entry.col >= room.startCol &&
							entry.col <= room.endCol,
					);
					const stair = floor.downStair.coordinate;
					expect(entryRoom).toBeDefined();
					if (entryRoom && floor.rooms.length > 1) {
						expect(
							stair.row < entryRoom.startRow ||
								stair.row > entryRoom.endRow ||
								stair.col < entryRoom.startCol ||
								stair.col > entryRoom.endCol,
						).toBe(true);
					}
					expectAllFloorTilesReachable(floor.terrain, stair);
					const deeper = run.floors[floor.downStair.destinationFloor - 1];
					expect(deeper.upStair?.coordinate).toEqual(
						floor.downStair.arrivalCoordinate,
					);
					expect(deeper.upStair?.arrivalCoordinate).toEqual(stair);
					expect(deeper.upStair?.destinationFloor).toBe(floor.floorNumber);
				}
				if (floor.upStair) {
					if (floor.downStair)
						expect(floor.upStair.coordinate).not.toEqual(
							floor.downStair.coordinate,
						);
					expectAllFloorTilesReachable(floor.terrain, floor.upStair.coordinate);
				}
			}
		}
	});
});

describe("Random stair selection", () => {
	it.each([
		{ value: 0, expected: { row: 1, col: 5 } },
		{ value: 0.99, expected: { row: 5, col: 13 } },
	])(
		"can choose different eligible rooms and tiles with random $value",
		({ value, expected }) => {
			const source = makeSource();
			expect(
				selectStairLocation(source, selectPlayerStart(source), () => value),
			).toEqual(expected);
		},
	);

	it("reproduces a stair with the same geometry, entry, and seed", () => {
		const source = makeSource();
		const entry = selectPlayerStart(source);
		expect(selectStairLocation(source, entry, createSeededRandom(123))).toEqual(
			selectStairLocation(source, entry, createSeededRandom(123)),
		);
	});

	it("varies stairs across seeds without changing geometry or entry", () => {
		const source = makeSource();
		const entry = selectPlayerStart(source);
		const stairs = Array.from({ length: 20 }, (_, seed) =>
			selectStairLocation(source, entry, createSeededRandom(seed)),
		);
		expect(
			new Set(stairs.map((stair) => JSON.stringify(stair))).size,
		).toBeGreaterThan(1);
	});

	it("keeps every seeded selection reachable and outside the entry room", () => {
		const source = makeSource();
		const entry = selectPlayerStart(source);
		const before = structuredClone({ source, entry });
		for (let seed = 0; seed < 20; seed++) {
			const stair = selectStairLocation(
				source,
				entry,
				createSeededRandom(seed),
			);
			expect(stair).not.toEqual(entry);
			expect(stair.col).toBeGreaterThan(rooms[0].endCol);
			expect(source.terrain[stair.row]?.[stair.col]).toBe(FLOOR);
			expectAllFloorTilesReachable(source.terrain, stair);
		}
		expect({ source, entry }).toEqual(before);
	});

	it("uses a stable single-room fallback regardless of the random source", () => {
		const room = rooms[0];
		const source = {
			rooms: [room],
			terrain: carveRooms(makeDungeon(5, 5), [room]),
		};
		const entry = selectPlayerStart(source);
		expect(selectStairLocation(source, entry, () => 0)).toEqual({
			row: 1,
			col: 1,
		});
		expect(selectStairLocation(source, entry, () => 0.99)).toEqual({
			row: 1,
			col: 1,
		});
	});

	it("uses the only distinct room tile on a constrained floor", () => {
		const room = rect([1, 1, 1, 2]);
		const source = {
			rooms: [room],
			terrain: carveRooms(makeDungeon(3, 4), [room]),
		};
		expect(
			selectStairLocation(source, { row: 1, col: 1 }, createSeededRandom(123)),
		).toEqual({ row: 1, col: 2 });
	});

	it("fails clearly when there is no distinct stair tile", () => {
		const room = rect([1, 1, 1, 1]);
		const source = {
			rooms: [room],
			terrain: carveRooms(makeDungeon(3, 3), [room]),
		};
		expect(() =>
			selectStairLocation(source, { row: 1, col: 1 }, createSeededRandom(123)),
		).toThrow(new RangeError("No valid coordinate available for staircase"));
	});
});

describe("Stairs leave corridor entrances clear", () => {
	it.each([20, 30, 40])(
		"keeps both stairs away from room mouths for reported seed at size %i",
		(size) => {
			const config = { ...DEFAULT_RUN_CONFIGURATION, rows: size, cols: size };
			const run = connectDungeonFloors(
				generateDungeonRun(241547927, 20, config),
			);
			for (const floor of run.floors) {
				for (const stair of [floor.upStair, floor.downStair]) {
					if (!stair) continue;
					const { row, col } = stair.coordinate;
					const room = floor.rooms.find(
						(room) =>
							row >= room.startRow &&
							row <= room.endRow &&
							col >= room.startCol &&
							col <= room.endCol,
					);
					if (!room) throw new Error("Stair outside rooms");
					const outsideNeighbors = [
						{ row: row - 1, col },
						{ row: row + 1, col },
						{ row, col: col - 1 },
						{ row, col: col + 1 },
					].filter(
						(tile) =>
							tile.row < room.startRow ||
							tile.row > room.endRow ||
							tile.col < room.startCol ||
							tile.col > room.endCol,
					);
					for (const tile of outsideNeighbors) {
						expect(
							floor.terrain[tile.row]?.[tile.col],
							`floor ${floor.floorNumber}: stair ${row},${col} faces corridor ${tile.row},${tile.col}`,
						).not.toBe(FLOOR);
					}
				}
			}
		},
	);

	it("excludes entrances on all four sides while retaining other room-edge tiles", () => {
		const room = rooms[1];
		const source = {
			rooms: [rooms[0], room],
			terrain: carveRooms(makeDungeon(5, 9), [rooms[0], room]).map((row) => [
				...row,
			]),
		};
		for (const tile of [
			{ row: 0, col: 6 },
			{ row: 4, col: 6 },
			{ row: 2, col: 4 },
			{ row: 2, col: 8 },
		]) {
			source.terrain[tile.row][tile.col] = FLOOR;
		}
		const selected = new Set<string>();
		for (let index = 0; index < 100; index++) {
			const stair = selectStairLocation(
				source,
				{ row: 2, col: 2 },
				() => index / 100,
			);
			selected.add(`${stair.row},${stair.col}`);
		}
		expect([...selected].sort()).toEqual(["1,5", "1,7", "2,6", "3,5", "3,7"]);
	});

	it("skips a room whose only tile is a corridor entrance when another room is clear", () => {
		const narrowRoom = rect([1, 1, 9, 9]);
		const source = {
			rooms: [rooms[0], rooms[1], narrowRoom],
			terrain: carveRooms(makeDungeon(5, 11), [
				rooms[0],
				rooms[1],
				narrowRoom,
			]).map((row) => [...row]),
		};
		source.terrain[2][9] = FLOOR;
		for (const random of [undefined, () => 0, () => 0.99]) {
			const stair = selectStairLocation(source, { row: 2, col: 2 }, random);
			expect(stair.col).toBeGreaterThanOrEqual(5);
			expect(stair.col).toBeLessThanOrEqual(7);
		}
	});

	it("still links a tiny authored room when its only distinct tile is an entrance", () => {
		const room = rect([1, 1, 1, 2]);
		const source = {
			rooms: [room],
			terrain: carveRooms(makeDungeon(3, 4), [room]).map((row) => [...row]),
		};
		source.terrain[1][3] = FLOOR;
		expect(selectStairLocation(source, { row: 1, col: 1 })).toEqual({
			row: 1,
			col: 2,
		});
	});

	it("keeps the deterministic single-room fallback off a corridor mouth", () => {
		const room = rooms[0];
		const source = {
			rooms: [room],
			terrain: carveRooms(makeDungeon(5, 5), [room]).map((row) => [...row]),
		};
		source.terrain[0][1] = FLOOR;
		expect(selectStairLocation(source, { row: 2, col: 2 })).toEqual({
			row: 1,
			col: 2,
		});
	});
});
