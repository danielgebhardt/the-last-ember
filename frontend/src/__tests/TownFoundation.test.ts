// @vitest-environment node
import { describe, expect, it } from "vitest";
import { generateDungeonRun } from "../domain/dungeon/DungeonRun";
import type { Coordinate } from "../domain/dungeon/DungeonTypes";
import { resolveTownAction } from "../domain/town/TownActions";
import { isTownWalkable, TOWN } from "../domain/town/TownDefinition";
import {
	createTownLocation,
	dungeonLocation,
	isAdventureLocation,
	restoreTownLocation,
	snapshotTownLocation,
} from "../domain/town/TownLocation";

const neighbors = (row: number, col: number) => [
	{ row: row - 1, col },
	{ row: row + 1, col },
	{ row, col: col - 1 },
	{ row, col: col + 1 },
];

describe("fixed level-zero town", () => {
	it("has its own fixed dimensions, safe arrival and reachable closed destinations", () => {
		expect(TOWN.level).toBe(0);
		expect(TOWN.terrain).toHaveLength(21);
		expect(TOWN.terrain.every((row) => row.length === 25)).toBe(true);
		expect(TOWN.arrival).toEqual({ row: 17, col: 12 });
		const distances = new Map([["17,12", 0]]);
		const queue: Coordinate[] = [TOWN.arrival];
		for (let index = 0; index < queue.length; index++) {
			const current = queue[index];
			for (const next of neighbors(current.row, current.col)) {
				const key = `${next.row},${next.col}`;
				if (isTownWalkable(next) && !distances.has(key)) {
					distances.set(
						key,
						(distances.get(`${current.row},${current.col}`) ?? 0) + 1,
					);
					queue.push(next);
				}
			}
		}
		expect(TOWN.buildings).toHaveLength(10);
		for (const building of TOWN.buildings) {
			expect(building.status).toBe(
				[
					"potions",
					"armor",
					"weapons",
					"rag-and-bone",
					"sanctuary",
					"forge",
					"library",
				].includes(building.id)
					? "open"
					: "closed",
			);
			expect(TOWN.terrain[building.entry.row][building.entry.col]).toBe("D");
			expect(
				distances.get(`${building.entry.row},${building.entry.col}`),
			).toBeLessThanOrEqual(30);
		}
		expect(distances.has(`${TOWN.gate.row},${TOWN.gate.col}`)).toBe(true);
		for (const coordinate of neighbors(TOWN.arrival.row, TOWN.arrival.col))
			expect(isTownWalkable(coordinate)).toBe(true);
		expect(Object.isFrozen(TOWN)).toBe(true);
		expect(Object.isFrozen(TOWN.buildings[0].entry)).toBe(true);
	});
	it("keeps dungeon seeds, counts and coordinates separate from town", () => {
		const config = { rows: 30, cols: 40, minPartitionSize: 8, roomPadding: 1 };
		// Generation remains repeatable; town creation consumes no dungeon random stream.
		const before = generateDungeonRun(123, 2, config);
		const town = createTownLocation();
		const after = generateDungeonRun(123, 2, config);
		expect(after).toEqual(before);
		expect(after.floors.map((floor) => floor.floorNumber)).toEqual([1, 2]);
		expect(isAdventureLocation(town, after)).toBe(true);
		expect(isAdventureLocation(dungeonLocation(after), after)).toBe(true);
		expect(
			isAdventureLocation(
				{ kind: "dungeon", floorNumber: 0, coordinate: town.coordinate },
				after,
			),
		).toBe(false);
		expect(
			isAdventureLocation(
				{ kind: "dungeon", floorNumber: 3, coordinate: town.coordinate },
				after,
			),
		).toBe(false);
		expect(
			isAdventureLocation(
				{ kind: "dungeon", floorNumber: 1, coordinate: { row: -1, col: 0 } },
				after,
			),
		).toBe(false);
	});
	it.each([
		{ row: -1, col: 0 },
		{ row: 21, col: 1 },
		{ row: 1, col: 29 },
		{ row: 1.5, col: 12 },
		{ row: NaN, col: 1 },
		{ row: 0, col: 12 },
		{ row: 2, col: 2 },
		{ row: 8, col: 12 },
	])("blocks invalid or solid town coordinates %j", (coordinate) => {
		expect(isTownWalkable(coordinate)).toBe(false);
		expect(isAdventureLocation({ ...createTownLocation(), coordinate })).toBe(
			false,
		);
	});
	it("moves through the domain boundary without a turn and cannot enter roofs or leave town", () => {
		const start = createTownLocation();
		const moved = resolveTownAction(start, { type: "move", direction: "down" });
		expect(moved.location.coordinate).toEqual({ row: 18, col: 12 });
		expect(start.coordinate).toEqual({ row: 17, col: 12 });
		expect(moved.turnAdvanced).toBe(false);
		const gate = resolveTownAction(moved.location, {
			type: "move",
			direction: "down",
		});
		expect(gate.location.kind).toBe("town");
		expect(
			resolveTownAction(gate.location, { type: "inspect" }).message,
		).toMatch(/not connected/i);
		expect(
			resolveTownAction(gate.location, { type: "move", direction: "down" })
				.location,
		).toBe(gate.location);
		const roof = { ...start, coordinate: { row: 13, col: 2 } };
		expect(
			resolveTownAction(roof, { type: "move", direction: "down" }).location,
		).toBe(roof);
	});
	it("inspects a closed threshold without opening a shop or mutating ownership", () => {
		const location = {
			...createTownLocation(),
			coordinate: { row: 13, col: 3 },
		};
		const result = resolveTownAction(location, { type: "inspect" });
		expect(result.location).toBe(location);
		expect(result.message).toMatch(/Potions.*Open/);
		expect(result.turnAdvanced).toBe(false);
	});
	it.each([
		null,
		{ type: "cast" },
		{ type: "move", direction: "diagonal" },
		{ type: "move", direction: "toString" },
	])("rejects invalid actions %j", (action) => {
		const location = createTownLocation();
		const result = resolveTownAction(location, action);
		expect(result.location).toBe(location);
		expect(result.error).toBeDefined();
		expect(result.turnAdvanced).toBe(false);
	});
	it("rejects town actions from dungeon and malformed town locations", () => {
		const dungeon = {
			kind: "dungeon" as const,
			floorNumber: 1,
			coordinate: { row: 1, col: 1 },
		};
		expect(
			resolveTownAction(dungeon, { type: "move", direction: "up" }),
		).toMatchObject({
			location: dungeon,
			turnAdvanced: false,
			error: expect.any(String),
		});
		const invalid = { ...createTownLocation(), coordinate: { row: 0, col: 0 } };
		expect(resolveTownAction(invalid, { type: "inspect" }).error).toBeDefined();
	});
	it("round trips exact town location and layout identity without sharing mutable snapshot objects", () => {
		const location = resolveTownAction(createTownLocation(), {
			type: "move",
			direction: "left",
		}).location;
		if (location.kind !== "town") throw new Error("Expected town");
		const snapshot = snapshotTownLocation(location);
		expect(restoreTownLocation(JSON.parse(JSON.stringify(snapshot)))).toEqual(
			location,
		);
		snapshot.location.coordinate.col = 1;
		expect(location.coordinate.col).toBe(11);
	});
	it.each([
		null,
		{},
		{ version: 2, location: createTownLocation() },
		{ version: 1, location: { ...createTownLocation(), layoutId: "obsolete" } },
		{
			version: 1,
			location: {
				kind: "dungeon",
				floorNumber: 0,
				coordinate: { row: 17, col: 12 },
			},
		},
		{
			version: 1,
			location: { ...createTownLocation(), coordinate: { row: 0, col: 0 } },
		},
	])(
		"rejects malformed snapshots without silently relocating %j",
		(snapshot) => {
			expect(restoreTownLocation(snapshot)).toBeNull();
		},
	);
});
