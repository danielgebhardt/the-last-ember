// @vitest-environment node

import { describe, expect, it } from "vitest";
import { generateDungeon } from "../domain/dungeon/DungeonGeneration.ts";
import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun.ts";
import { createRoom } from "../domain/dungeon/Room.ts";
import { MAX_SEED } from "../domain/dungeon/Seed.ts";
import { FLOOR } from "../domain/dungeon/Tiles.ts";
import { getReachableFloorTiles } from "./testhelpers.ts";

describe("Room proportions", () => {
	it("applies configured room sizing to every generated room", () => {
		const dungeon = generateDungeon(
			{
				rows: 40,
				cols: 40,
				minPartitionSize: 10,
				roomPadding: 1,
				minRoomSize: 4,
				maxRoomAspectRatio: 2,
			},
			123,
		);
		for (const room of dungeon.rooms) {
			const roomHeight = room.endRow - room.startRow + 1;
			const roomWidth = room.endCol - room.startCol + 1;
			expect(Math.min(roomHeight, roomWidth)).toBeGreaterThanOrEqual(4);
			expect(
				Math.max(roomHeight, roomWidth) / Math.min(roomHeight, roomWidth),
			).toBeLessThanOrEqual(2);
		}
	});
	it.each([
		{ minRoomSize: 0, maxRoomAspectRatio: 3 },
		{ minRoomSize: 1.5, maxRoomAspectRatio: 3 },
		{ minRoomSize: 3, maxRoomAspectRatio: 0.5 },
		{ minRoomSize: 3, maxRoomAspectRatio: Number.POSITIVE_INFINITY },
	])("rejects invalid room rules: %o", (rules) => {
		expect(() =>
			createRoom(
				{ startRow: 0, endRow: 19, startCol: 0, endCol: 19 },
				1,
				() => 0,
				rules,
			),
		).toThrow(RangeError);
	});
	it("fits a constrained interior when configured size and ratio cannot both reach the minimum", () => {
		const room = createRoom(
			{ startRow: 0, endRow: 21, startCol: 0, endCol: 2 },
			1,
			() => 0,
			{ minRoomSize: 5, maxRoomAspectRatio: 2 },
		);
		expect(room).toEqual({ startRow: 1, endRow: 2, startCol: 1, endCol: 1 });
	});
	it.each([
		[0, 0],
		[0, 0.999999],
		[0.999999, 0],
		[0.999999, 0.999999],
		[0.5, 0.5],
	])(
		"keeps room dimensions usable with random choices %s and %s",
		(heightChoice, widthChoice) => {
			for (const [height, width] of [
				[8, 30],
				[30, 8],
				[3, 3],
			]) {
				const region = {
					startRow: 10,
					endRow: 10 + height + 1,
					startCol: 20,
					endCol: 20 + width + 1,
				};
				const choices = [heightChoice, widthChoice, 0.999999, 0.999999];
				const room = createRoom(region, 1, () => choices.shift() ?? 0);
				const roomHeight = room.endRow - room.startRow + 1;
				const roomWidth = room.endCol - room.startCol + 1;
				expect(roomHeight).toBeGreaterThanOrEqual(3);
				expect(roomWidth).toBeGreaterThanOrEqual(3);
				expect(
					Math.max(roomHeight, roomWidth) / Math.min(roomHeight, roomWidth),
				).toBeLessThanOrEqual(3);
				expect(room.startRow).toBeGreaterThanOrEqual(11);
				expect(room.endRow).toBeLessThanOrEqual(region.endRow - 1);
				expect(room.startCol).toBeGreaterThanOrEqual(21);
				expect(room.endCol).toBeLessThanOrEqual(region.endCol - 1);
			}
		},
	);

	it.each([
		[1, 20],
		[20, 1],
		[2, 20],
		[20, 2],
		[1, 1],
	])(
		"fits constrained %s by %s interiors deterministically without excessive elongation",
		(height, width) => {
			const region = {
				startRow: 0,
				endRow: height + 1,
				startCol: 0,
				endCol: width + 1,
			};
			for (const random of [undefined, () => 0, () => 0.999999]) {
				const room = createRoom(region, 1, random);
				expect(createRoom(region, 1, random)).toEqual(room);
				const roomHeight = room.endRow - room.startRow + 1;
				const roomWidth = room.endCol - room.startCol + 1;
				expect(roomHeight).toBeGreaterThanOrEqual(Math.min(3, height));
				expect(roomWidth).toBeGreaterThanOrEqual(Math.min(3, width));
				expect(
					Math.max(roomHeight, roomWidth) / Math.min(roomHeight, roomWidth),
				).toBeLessThanOrEqual(3);
				expect(room.startRow).toBeGreaterThanOrEqual(1);
				expect(room.endRow).toBeLessThanOrEqual(height);
				expect(room.startCol).toBeGreaterThanOrEqual(1);
				expect(room.endCol).toBeLessThanOrEqual(width);
			}
		},
	);

	it.each([
		[30, 40, 3],
		[40, 40, 3],
		[10, 10, 1],
		[10, 10, 3],
		[10, 40, 3],
		[40, 10, 3],
		[5, 5, 1],
		[5, 5, 3],
		[5, 40, 3],
		[40, 5, 3],
	])(
		"keeps %s by %s runs with %s floors repeatable and connected",
		(rows, cols, floors) => {
			for (const seed of [0, 123, MAX_SEED]) {
				const config = { rows, cols, minPartitionSize: 8, roomPadding: 1 };
				const run = connectDungeonFloors(
					generateDungeonRun(seed, floors, config),
				);
				expect(
					connectDungeonFloors(generateDungeonRun(seed, floors, config)),
				).toEqual(run);
				for (const floor of run.floors) {
					for (const room of floor.rooms) {
						const roomHeight = room.endRow - room.startRow + 1;
						const roomWidth = room.endCol - room.startCol + 1;
						expect(Math.min(roomHeight, roomWidth)).toBeGreaterThanOrEqual(3);
						expect(
							Math.max(roomHeight, roomWidth) / Math.min(roomHeight, roomWidth),
						).toBeLessThanOrEqual(3);
					}
					const firstRoom = floor.rooms[0];
					const reachableTiles = getReachableFloorTiles(floor.terrain, {
						row: firstRoom.startRow,
						col: firstRoom.startCol,
					});
					const floorTileCount = floor.terrain.reduce(
						(count, row) => count + row.filter((tile) => tile === FLOOR).length,
						0,
					);
					expect(reachableTiles.size).toBe(floorTileCount);
					for (const [link, reciprocalKey] of [
						[floor.downStair, "upStair"],
						[floor.upStair, "downStair"],
					] as const) {
						if (!link) continue;
						expect(
							reachableTiles.has(
								`${link.coordinate.row},${link.coordinate.col}`,
							),
						).toBe(true);
						const reciprocal =
							run.floors[link.destinationFloor - 1][reciprocalKey];
						expect(reciprocal?.destinationFloor).toBe(floor.floorNumber);
						expect(reciprocal?.coordinate).toEqual(link.arrivalCoordinate);
						expect(reciprocal?.arrivalCoordinate).toEqual(link.coordinate);
					}
					if (floor.upStair && floor.downStair)
						expect(floor.upStair.coordinate).not.toEqual(
							floor.downStair.coordinate,
						);
				}
				expect(
					run.floors[0].terrain[run.playerCoordinate.row][
						run.playerCoordinate.col
					],
				).toBe(FLOOR);
			}
		},
	);
});
