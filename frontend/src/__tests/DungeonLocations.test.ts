// @vitest-environment node

import { describe, expect, it } from "vitest";
import { generateDungeon } from "../domain/dungeon/DungeonGeneration.ts";
import {
	selectPlayerStart,
	selectStairLocation,
} from "../domain/dungeon/DungeonLocations.ts";
import type {
	Coordinate,
	Dungeon,
	LocationSelectionSource,
} from "../domain/dungeon/DungeonTypes.ts";
import type { Room } from "../domain/dungeon/Room.ts";
import type { DungeonConfig } from "../domain/dungeon/RunConfiguration.ts";
import { FLOOR, WALL } from "../domain/dungeon/Tiles.ts";
import { makeLocationSelectionSource, rect } from "./testhelpers.ts";

describe("Dungeon location selection", () => {
	describe("Player safe start tests", () => {
		it("should return the center coordinate of an eligible room", () => {
			const config: DungeonConfig = {
				rows: 5,
				cols: 7,
				minPartitionSize: 5,
				roomPadding: 1,
			};

			const dungeon = generateDungeon(config);

			const expectedStart: Coordinate = { row: 2, col: 3 };

			expect(selectPlayerStart(dungeon)).toStrictEqual(expectedStart);
		});

		it("should handle an offset room correctly", () => {
			const room: Room = rect([5, 9, 10, 14]);

			const dungeon = makeLocationSelectionSource([room]);

			const expectedStart: Coordinate = { row: 7, col: 12 };

			expect(selectPlayerStart(dungeon)).toStrictEqual(expectedStart);
		});

		it("should handle even-sized rooms deterministically", () => {
			const rooms: Room[] = [
				rect([5, 8, 10, 14]),
				rect([5, 9, 10, 13]),
				rect([5, 8, 10, 13]),
			];

			const expectedStarts: Coordinate[] = [
				{ row: 6, col: 12 },
				{ row: 7, col: 11 },
				{ row: 6, col: 11 },
			];

			for (let index = 0; index < rooms.length; index++) {
				const dungeon = makeLocationSelectionSource([rooms[index]]);

				expect(selectPlayerStart(dungeon)).toStrictEqual(expectedStarts[index]);
			}
		});

		it("should select from the intended room when multiple rooms exist", () => {
			const room1: Room = rect([1, 3, 1, 5]);

			const room2: Room = rect([5, 7, 1, 5]);

			const dungeon = makeLocationSelectionSource([room1, room2]);

			const expectedStart: Coordinate = { row: 2, col: 3 };

			expect(selectPlayerStart(dungeon)).toStrictEqual(expectedStart);
		});

		it("should throw when there are no eligible rooms", () => {
			const dungeon = makeLocationSelectionSource([]);

			expect(() => selectPlayerStart(dungeon)).toThrow(
				"No eligible rooms for starting point",
			);
		});

		it("should select a FLOOR tile in a generated dungeon", () => {
			const config: DungeonConfig = {
				rows: 4,
				cols: 4,
				minPartitionSize: 5,
				roomPadding: 1,
			};

			const dungeon = generateDungeon(config);
			const startingPoint = selectPlayerStart(dungeon);

			expect(dungeon.terrain[startingPoint.row][startingPoint.col]).toBe(FLOOR);
		});

		it("should throw an error when starting location is not a FLOOR", () => {
			const config: DungeonConfig = {
				rows: 4,
				cols: 4,
				minPartitionSize: 5,
				roomPadding: 1,
			};

			const badTerrain = [
				[WALL, WALL, WALL, WALL],
				[WALL, WALL, WALL, WALL],
				[WALL, WALL, WALL, WALL],
				[WALL, WALL, WALL, WALL],
			];

			const dungeon: LocationSelectionSource = {
				rooms: generateDungeon(config).rooms,
				terrain: badTerrain,
			};

			expect(() => selectPlayerStart(dungeon)).toThrow("Invalid start point");
		});

		it("should not modify the original generated dungeon", () => {
			const config: DungeonConfig = {
				rows: 4,
				cols: 4,
				minPartitionSize: 5,
				roomPadding: 1,
			};

			const dungeon = generateDungeon(config);
			const original = structuredClone(dungeon);

			selectPlayerStart(dungeon);

			expect(dungeon).toStrictEqual(original);
		});
	});

	describe("Stair location tests", () => {
		it("should select the center of a different room when one is available", () => {
			const room1: Room = rect([1, 3, 1, 3]);

			const room2: Room = rect([1, 3, 5, 7]);

			const terrain: Dungeon = [
				[WALL, WALL, WALL, WALL, WALL, WALL, WALL, WALL, WALL],
				[WALL, FLOOR, FLOOR, FLOOR, WALL, FLOOR, FLOOR, FLOOR, WALL],
				[WALL, FLOOR, FLOOR, FLOOR, FLOOR, FLOOR, FLOOR, FLOOR, WALL],
				[WALL, FLOOR, FLOOR, FLOOR, WALL, FLOOR, FLOOR, FLOOR, WALL],
				[WALL, WALL, WALL, WALL, WALL, WALL, WALL, WALL, WALL],
			];

			const dungeon: LocationSelectionSource = {
				rooms: [room1, room2],
				terrain,
			};

			const entry: Coordinate = { row: 2, col: 2 };

			expect(selectStairLocation(dungeon, entry)).toStrictEqual({
				row: 2,
				col: 6,
			});
		});

		it("should select the last eligible different room when multiple rooms exist", () => {
			const room1: Room = rect([1, 3, 1, 3]);

			const room2: Room = rect([1, 3, 5, 7]);

			const room3: Room = rect([5, 7, 5, 7]);

			const terrain: Dungeon = [
				[WALL, WALL, WALL, WALL, WALL, WALL, WALL, WALL, WALL],
				[WALL, FLOOR, FLOOR, FLOOR, WALL, FLOOR, FLOOR, FLOOR, WALL],
				[WALL, FLOOR, FLOOR, FLOOR, FLOOR, FLOOR, FLOOR, FLOOR, WALL],
				[WALL, FLOOR, FLOOR, FLOOR, WALL, FLOOR, FLOOR, FLOOR, WALL],
				[WALL, WALL, WALL, WALL, WALL, WALL, FLOOR, WALL, WALL],
				[WALL, WALL, WALL, WALL, WALL, FLOOR, FLOOR, FLOOR, WALL],
				[WALL, WALL, WALL, WALL, WALL, FLOOR, FLOOR, FLOOR, WALL],
				[WALL, WALL, WALL, WALL, WALL, FLOOR, FLOOR, FLOOR, WALL],
				[WALL, WALL, WALL, WALL, WALL, WALL, WALL, WALL, WALL],
			];

			const dungeon: LocationSelectionSource = {
				rooms: [room1, room2, room3],
				terrain,
			};

			const entry: Coordinate = { row: 2, col: 2 };

			expect(selectStairLocation(dungeon, entry)).toStrictEqual({
				row: 6,
				col: 6,
			});
		});

		it("should select the last eligible different room when multiple rooms exist and starting room is not first room", () => {
			const room1: Room = rect([1, 3, 1, 3]);

			const room2: Room = rect([1, 3, 5, 7]);

			const room3: Room = rect([5, 7, 5, 7]);

			const terrain: Dungeon = [
				[WALL, WALL, WALL, WALL, WALL, WALL, WALL, WALL, WALL],
				[WALL, FLOOR, FLOOR, FLOOR, WALL, FLOOR, FLOOR, FLOOR, WALL],
				[WALL, FLOOR, FLOOR, FLOOR, FLOOR, FLOOR, FLOOR, FLOOR, WALL],
				[WALL, FLOOR, FLOOR, FLOOR, WALL, FLOOR, FLOOR, FLOOR, WALL],
				[WALL, WALL, WALL, WALL, WALL, WALL, FLOOR, WALL, WALL],
				[WALL, WALL, WALL, WALL, WALL, FLOOR, FLOOR, FLOOR, WALL],
				[WALL, WALL, WALL, WALL, WALL, FLOOR, FLOOR, FLOOR, WALL],
				[WALL, WALL, WALL, WALL, WALL, FLOOR, FLOOR, FLOOR, WALL],
				[WALL, WALL, WALL, WALL, WALL, WALL, WALL, WALL, WALL],
			];

			const dungeon: LocationSelectionSource = {
				rooms: [room1, room2, room3],
				terrain,
			};

			const entry: Coordinate = { row: 2, col: 6 };

			expect(selectStairLocation(dungeon, entry)).toStrictEqual({
				row: 6,
				col: 6,
			});
		});

		it("should select deterministically when called repeatedly with the same dungeon and entry", () => {
			const room1: Room = rect([1, 3, 1, 3]);

			const room2: Room = rect([1, 3, 5, 7]);

			const terrain: Dungeon = [
				[WALL, WALL, WALL, WALL, WALL, WALL, WALL, WALL, WALL],
				[WALL, FLOOR, FLOOR, FLOOR, WALL, FLOOR, FLOOR, FLOOR, WALL],
				[WALL, FLOOR, FLOOR, FLOOR, FLOOR, FLOOR, FLOOR, FLOOR, WALL],
				[WALL, FLOOR, FLOOR, FLOOR, WALL, FLOOR, FLOOR, FLOOR, WALL],
				[WALL, WALL, WALL, WALL, WALL, WALL, WALL, WALL, WALL],
			];

			const dungeon: LocationSelectionSource = {
				rooms: [room1, room2],
				terrain,
			};

			const entry: Coordinate = { row: 2, col: 2 };

			const firstResult = selectStairLocation(dungeon, entry);
			const secondResult = selectStairLocation(dungeon, entry);

			expect(secondResult).toStrictEqual(firstResult);
		});

		it("should use another floor coordinate in the entry room when only one room exists", () => {
			const room: Room = rect([1, 3, 1, 3]);

			const dungeon = makeLocationSelectionSource([room]);
			const entry: Coordinate = { row: 2, col: 2 };

			expect(selectStairLocation(dungeon, entry)).toStrictEqual({
				row: 1,
				col: 1,
			});
		});

		it("should never select the entry coordinate as the stair location", () => {
			const room: Room = rect([1, 3, 1, 3]);

			const dungeon = makeLocationSelectionSource([room]);
			const entry: Coordinate = { row: 1, col: 1 };

			const stair = selectStairLocation(dungeon, entry);

			expect(stair).not.toStrictEqual(entry);
		});

		it("should select a floor coordinate within dungeon bounds", () => {
			const config: DungeonConfig = {
				rows: 12,
				cols: 20,
				minPartitionSize: 5,
				roomPadding: 1,
			};

			const dungeon = generateDungeon(config, 123);
			const entry = selectPlayerStart(dungeon);

			const stair = selectStairLocation(dungeon, entry);

			expect(stair.row).toBeGreaterThanOrEqual(0);
			expect(stair.row).toBeLessThan(dungeon.terrain.length);
			expect(stair.col).toBeGreaterThanOrEqual(0);
			expect(stair.col).toBeLessThan(dungeon.terrain[stair.row].length);
			expect(dungeon.terrain[stair.row][stair.col]).toBe(FLOOR);
		});

		it("should correctly select the center of an offset rectangular room", () => {
			const entryRoom: Room = rect([1, 3, 1, 3]);

			const stairRoom: Room = rect([5, 7, 8, 14]);

			const terrain: string[][] = Array.from({ length: 9 }, () =>
				Array.from({ length: 16 }, () => WALL),
			);

			for (const room of [entryRoom, stairRoom]) {
				for (let row = room.startRow; row <= room.endRow; row++) {
					for (let col = room.startCol; col <= room.endCol; col++) {
						terrain[row][col] = FLOOR;
					}
				}
			}

			for (let row = 2; row <= 6; row++) {
				terrain[row][2] = FLOOR;
			}

			for (let col = 2; col <= 11; col++) {
				terrain[6][col] = FLOOR;
			}

			const dungeon: LocationSelectionSource = {
				rooms: [entryRoom, stairRoom],
				terrain,
			};

			const entry: Coordinate = { row: 2, col: 2 };

			expect(selectStairLocation(dungeon, entry)).toStrictEqual({
				row: 6,
				col: 11,
			});
		});

		it("should handle an even-sized destination room deterministically", () => {
			const entryRoom: Room = rect([1, 3, 1, 3]);

			const stairRoom: Room = rect([5, 8, 10, 13]);

			const terrain: string[][] = Array.from({ length: 10 }, () =>
				Array.from({ length: 15 }, () => WALL),
			);

			for (const room of [entryRoom, stairRoom]) {
				for (let row = room.startRow; row <= room.endRow; row++) {
					for (let col = room.startCol; col <= room.endCol; col++) {
						terrain[row][col] = FLOOR;
					}
				}
			}

			const dungeon: LocationSelectionSource = {
				rooms: [entryRoom, stairRoom],
				terrain,
			};

			const entry: Coordinate = { row: 2, col: 2 };

			expect(selectStairLocation(dungeon, entry)).toStrictEqual({
				row: 6,
				col: 11,
			});
		});

		it("should throw when the entry is outside the dungeon bounds", () => {
			const room: Room = rect([1, 2, 1, 2]);

			const dungeon = makeLocationSelectionSource([room]);

			expect(() => selectStairLocation(dungeon, { row: -1, col: 1 })).toThrow(
				new RangeError("Invalid start point"),
			);

			expect(() => selectStairLocation(dungeon, { row: 100, col: 1 })).toThrow(
				new RangeError("Invalid start point"),
			);
		});

		it("should throw when the entry coordinate is not floor", () => {
			const room: Room = rect([1, 2, 1, 2]);

			const dungeon = makeLocationSelectionSource([room]);

			expect(() => selectStairLocation(dungeon, { row: 0, col: 0 })).toThrow(
				new RangeError("Invalid start point"),
			);
		});

		it("should throw when there is no valid distinct floor coordinate", () => {
			const room: Room = rect([1, 1, 1, 1]);

			const dungeon = makeLocationSelectionSource([room]);
			const entry: Coordinate = { row: 1, col: 1 };

			expect(() => selectStairLocation(dungeon, entry)).toThrow(
				new RangeError("No valid coordinate available for staircase"),
			);
		});

		it("should throw when the entry is floor but does not belong to a room", () => {
			const room1: Room = rect([1, 2, 1, 2]);

			const room2: Room = rect([1, 2, 4, 5]);

			const terrain: Dungeon = [
				[WALL, WALL, WALL, WALL, WALL, WALL, WALL],
				[WALL, FLOOR, FLOOR, WALL, FLOOR, FLOOR, WALL],
				[WALL, FLOOR, FLOOR, FLOOR, FLOOR, FLOOR, WALL],
				[WALL, WALL, WALL, WALL, WALL, WALL, WALL],
			];

			const dungeon: LocationSelectionSource = {
				rooms: [room1, room2],
				terrain,
			};

			const corridorEntry: Coordinate = { row: 2, col: 3 };

			expect(() => selectStairLocation(dungeon, corridorEntry)).toThrow(
				new RangeError("Invalid start point. Starting point is not in a room."),
			);
		});

		it("should not modify the generated dungeon or entry coordinate", () => {
			const config: DungeonConfig = {
				rows: 12,
				cols: 20,
				minPartitionSize: 5,
				roomPadding: 1,
			};

			const dungeon = generateDungeon(config, 123);
			const entry = selectPlayerStart(dungeon);

			const originalDungeon = structuredClone(dungeon);
			const originalEntry = structuredClone(entry);

			selectStairLocation(dungeon, entry);

			expect(dungeon).toStrictEqual(originalDungeon);
			expect(entry).toStrictEqual(originalEntry);
		});
	});
});
