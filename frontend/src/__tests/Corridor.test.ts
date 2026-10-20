// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
	type Corridor,
	connectPartitionRooms,
	createCorridor,
	getRoomEndpoint,
} from "../domain/dungeon/Corridor.ts";
import {
	type Region,
	recursivePartition,
} from "../domain/dungeon/Partitioning.ts";
import {
	assignRoomsToPartition,
	getTerminalRooms,
	type Room,
} from "../domain/dungeon/Room.ts";
import { rect } from "./testhelpers";

describe("Corridor tests", () => {
	it("should select an endpoint inside each room", () => {
		const room1: Room = rect([1, 2, 1, 2]);

		const room2: Room = rect([1, 2, 4, 5]);

		expect(getRoomEndpoint(room1)).toStrictEqual({ row: 1, col: 1 });
		expect(getRoomEndpoint(room2)).toStrictEqual({ row: 1, col: 4 });
	});

	it("should create a straight horizontal line corridor between aligned rooms", () => {
		const room1: Room = rect([1, 2, 1, 2]);

		const room2: Room = rect([1, 2, 4, 5]);

		const corridor: Corridor = createCorridor(room1, room2);
		expect(corridor).toStrictEqual([
			{ row: 1, col: 1 },
			{ row: 1, col: 2 },
			{ row: 1, col: 3 },
			{ row: 1, col: 4 },
		]);
	});

	it("should create a straight vertical line corridor between aligned rooms", () => {
		const room1: Room = rect([1, 2, 1, 2]);

		const room2: Room = rect([4, 5, 1, 2]);

		const corridor: Corridor = createCorridor(room1, room2);
		expect(corridor).toStrictEqual([
			{ row: 1, col: 1 },
			{ row: 2, col: 1 },
			{ row: 3, col: 1 },
			{ row: 4, col: 1 },
		]);
	});

	it("should create a horizontal corridor when the second room is left of the first room", () => {
		const room1: Room = rect([1, 2, 1, 2]);

		const room2: Room = rect([1, 2, 4, 5]);

		const corridor: Corridor = createCorridor(room2, room1);
		expect(corridor).toStrictEqual([
			{ row: 1, col: 4 },
			{ row: 1, col: 3 },
			{ row: 1, col: 2 },
			{ row: 1, col: 1 },
		]);
	});

	it("should create a vertical corridor when the second room is above the first room", () => {
		const room1: Room = rect([1, 2, 1, 2]);

		const room2: Room = rect([4, 5, 1, 2]);

		const corridor: Corridor = createCorridor(room2, room1);
		expect(corridor).toStrictEqual([
			{ row: 4, col: 1 },
			{ row: 3, col: 1 },
			{ row: 2, col: 1 },
			{ row: 1, col: 1 },
		]);
	});

	it("should create a corridor with one right-angle bend between offset rooms", () => {
		const room1: Room = rect([1, 2, 1, 2]);

		const room2: Room = rect([4, 5, 4, 5]);

		const corridor: Corridor = createCorridor(room1, room2);

		expect(corridor).toStrictEqual([
			{ row: 1, col: 1 },
			{ row: 1, col: 2 },
			{ row: 1, col: 3 },
			{ row: 1, col: 4 },
			{ row: 2, col: 4 },
			{ row: 3, col: 4 },
			{ row: 4, col: 4 },
		]);
	});

	it("should include both room endpoints", () => {
		const room1: Room = rect([1, 2, 1, 2]);

		const room2: Room = rect([1, 2, 4, 5]);

		const corridor: Corridor = createCorridor(room1, room2);
		expect(corridor).toContainEqual({ row: 1, col: 1 });
		expect(corridor).toContainEqual({ row: 1, col: 4 });
	});

	it("should produce only cardinally adjacent consecutive coordinates (no diagonal)", () => {
		const room1: Room = rect([5, 6, 5, 6]);

		const room2: Room = rect([1, 2, 1, 2]);

		const corridor = createCorridor(room1, room2);

		for (let index = 1; index < corridor.length; index++) {
			const previous = corridor[index - 1];
			const current = corridor[index];

			const distance =
				Math.abs(current.row - previous.row) +
				Math.abs(current.col - previous.col);

			expect(distance).toBe(1);
		}
	});

	it("should not modify the rooms when creating a corridor", () => {
		const room1: Room = rect([1, 2, 1, 2]);

		const room2: Room = rect([4, 5, 4, 5]);

		const originalRoom1 = structuredClone(room1);
		const originalRoom2 = structuredClone(room2);

		createCorridor(room1, room2);

		expect(room1).toStrictEqual(originalRoom1);
		expect(room2).toStrictEqual(originalRoom2);
	});

	describe("connectPartitionRooms tests", () => {
		it("should return no corridors for a terminal partition", () => {
			const region: Region = rect([0, 3, 0, 3]);

			const partition = assignRoomsToPartition(
				recursivePartition(region, 4),
				1,
			);

			expect(connectPartitionRooms(partition)).toHaveLength(0);
		});

		it("should create one corridor between two terminal child rooms", () => {
			const region: Region = rect([0, 2, 0, 5]);

			const partition = assignRoomsToPartition(
				recursivePartition(region, 3),
				1,
			);

			const expectedCorridors: Corridor[] = [
				[
					{ row: 1, col: 1 },
					{ row: 1, col: 2 },
					{ row: 1, col: 3 },
					{ row: 1, col: 4 },
				],
			];

			expect(connectPartitionRooms(partition)).toStrictEqual(expectedCorridors);
		});

		it("should recursively create corridors for a multi-level partition tree", () => {
			const region: Region = rect([0, 5, 0, 5]);

			const partition = assignRoomsToPartition(
				recursivePartition(region, 3),
				1,
			);

			const expectedCorridors: Corridor[] = [
				[
					{ row: 1, col: 1 },
					{ row: 2, col: 1 },
					{ row: 3, col: 1 },
					{ row: 4, col: 1 },
				],
				[
					{ row: 1, col: 4 },
					{ row: 2, col: 4 },
					{ row: 3, col: 4 },
					{ row: 4, col: 4 },
				],
				[
					{ row: 1, col: 1 },
					{ row: 1, col: 2 },
					{ row: 1, col: 3 },
					{ row: 1, col: 4 },
				],
			];

			expect(connectPartitionRooms(partition)).toStrictEqual(expectedCorridors);
		});

		it("should create one fewer corridor than the number of terminal rooms", () => {
			const region: Region = rect([0, 11, 0, 11]);

			const partition = assignRoomsToPartition(
				recursivePartition(region, 3),
				1,
			);
			const terminalRooms = getTerminalRooms(partition);

			const corridors = connectPartitionRooms(partition);

			expect(corridors).toHaveLength(terminalRooms.length - 1);
		});

		it("should include every terminal room in the corridor network", () => {
			const region: Region = rect([0, 5, 0, 5]);

			const partition = assignRoomsToPartition(
				recursivePartition(region, 3),
				1,
			);
			const terminalRooms = getTerminalRooms(partition);

			const corridors = connectPartitionRooms(partition);
			const corridorCoordinateKeys = new Set(
				corridors.flat().map(({ row, col }) => `${row},${col}`),
			);

			for (const room of terminalRooms) {
				const endpoint = getRoomEndpoint(room);

				expect(
					corridorCoordinateKeys.has(`${endpoint.row},${endpoint.col}`),
				).toBe(true);
			}
		});

		it("should throw when a required terminal partition has no room", () => {
			const region: Region = rect([0, 2, 0, 5]);

			const partitionWithoutRooms = recursivePartition(region, 3);

			expect(() => connectPartitionRooms(partitionWithoutRooms)).toThrow(
				new Error("Terminal partition does not contain a room"),
			);
		});

		it("should not modify the partition tree or its rooms", () => {
			const region: Region = rect([0, 5, 0, 5]);

			const partition = assignRoomsToPartition(
				recursivePartition(region, 3),
				1,
			);
			const originalPartition = structuredClone(partition);

			connectPartitionRooms(partition);

			expect(partition).toStrictEqual(originalPartition);
		});
	});
});
