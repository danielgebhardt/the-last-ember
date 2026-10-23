// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { createGameState } from "../domain/game/GameState";
import {
	merchantFloors,
	placeMerchants,
} from "../domain/merchant/MerchantPlacement";
import {
	coordinateKey,
	protectedFloorLocations,
} from "../domain/monsters/MonsterLocations";
import { sealedTiles } from "../domain/objects/OptionalEliteRooms";
import { COMPACT_TEST_CONFIGURATION } from "./TestRunConfiguration";

describe("Wandering merchant placement", () => {
	it.each([
		[5, []],
		[10, [5]],
		[15, [5, 10]],
		[20, [5, 10, 15]],
		[13, [5, 10]],
	])("uses every fifth floor below a %i-floor goal", (count, expected) =>
		expect(merchantFloors(count as number)).toEqual(expected),
	);
	it("is deterministic, reachable, collision free and idempotent without changing stock", () => {
		const state = createGameState(
			connectDungeonFloors(
				generateDungeonRun(123, 20, COMPACT_TEST_CONFIGURATION),
			),
		);
		const objects = placeMerchants(state, true);
		expect(placeMerchants(state, true)).toEqual(objects);
		expect(placeMerchants({ ...state, objects }, true)).toEqual(objects);
		const vendors = objects.filter((o) => o.kind === "merchant");
		expect(vendors.map((o) => o.floorNumber)).toEqual([5, 10, 15]);
		for (const vendor of vendors) {
			const floor = state.run.floors[vendor.floorNumber - 1];
			expect(
				floor.rooms.some(
					(r) =>
						vendor.coordinate.row >= r.startRow &&
						vendor.coordinate.row <= r.endRow &&
						vendor.coordinate.col >= r.startCol &&
						vendor.coordinate.col <= r.endCol,
				),
			).toBe(true);
			expect(
				protectedFloorLocations(state.run, vendor.floorNumber),
			).not.toContainEqual(vendor.coordinate);
			expect(
				sealedTiles(floor, objects).has(coordinateKey(vendor.coordinate)),
			).toBe(false);
			expect(
				[
					...state.monsters,
					...state.floorItems,
					...state.objects.filter((o) => o.kind !== "merchant"),
				].some(
					(e) =>
						e.floorNumber === vendor.floorNumber &&
						coordinateKey(e.coordinate) === coordinateKey(vendor.coordinate),
				),
			).toBe(false);
		}
		expect(state.merchantStock["mana-potion"]).toBe(10);
	});
	it("does not place new vendors when disabled and preserves stored locations", () => {
		const state = createGameState(
			connectDungeonFloors(
				generateDungeonRun(123, 10, COMPACT_TEST_CONFIGURATION),
			),
		);
		const ordinary = {
			...state,
			objects: state.objects.filter((o) => o.kind !== "merchant"),
		};
		expect(placeMerchants(ordinary, false)).toBe(ordinary.objects);
		expect(placeMerchants(state, false)).toBe(state.objects);
	});
	it("keeps merchants outside an elite chamber even when its gate was previously opened", () => {
		const original = createGameState(
			connectDungeonFloors(
				generateDungeonRun(123, 15, COMPACT_TEST_CONFIGURATION),
			),
		);
		const terrain = Array.from({ length: 10 }, () =>
			Array<string>(18).fill("#"),
		);
		const chamber = { startRow: 3, endRow: 5, startCol: 3, endCol: 5 },
			main = { startRow: 3, endRow: 5, startCol: 12, endCol: 14 };
		for (const room of [chamber, main])
			for (let row = room.startRow; row <= room.endRow; row++)
				for (let col = room.startCol; col <= room.endCol; col++)
					terrain[row][col] = ".";
		for (let col = 6; col <= 11; col++) terrain[4][col] = ".";
		const floor = {
			...original.run.floors[9],
			terrain,
			rooms: [chamber, main],
			upStair: {
				coordinate: { row: 4, col: 13 },
				destinationFloor: 9,
				arrivalCoordinate: { row: 1, col: 1 },
			},
			downStair: {
				coordinate: { row: 5, col: 14 },
				destinationFloor: 11,
				arrivalCoordinate: { row: 1, col: 1 },
			},
		};
		// Every main-room tile is occupied; the opened optional chamber is the only
		// remaining room space, and must still not become a required shopping stop.
		const loot = [];
		for (let row = 3; row <= 5; row++)
			for (let col = 12; col <= 14; col++)
				loot.push({
					item: { id: `test:${row}:${col}`, kind: "healing-potion" as const },
					floorNumber: 10,
					coordinate: { row, col },
				});
		const source = {
			...original,
			run: {
				...original.run,
				floors: original.run.floors.map((f) =>
					f.floorNumber === 10 ? floor : f,
				),
			},
			monsters: original.monsters.filter((m) => m.floorNumber !== 10),
			floorItems: [
				...original.floorItems.filter((i) => i.floorNumber !== 10),
				...loot,
			],
			objects: [
				...original.objects.filter((o) => o.floorNumber !== 10),
				{
					id: "floor:10:object:elite-door:1",
					kind: "elite-door" as const,
					floorNumber: 10,
					coordinate: { row: 4, col: 6 },
					activated: true,
				},
			],
		};
		expect(
			placeMerchants(source, true).some(
				(o) => o.kind === "merchant" && o.floorNumber === 10,
			),
		).toBe(false);
	});
});
