// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	connectPartitionRooms,
	createCorridor,
} from "../domain/dungeon/Corridor";
import { createRoomLoops } from "../domain/dungeon/CorridorLoops";
import { generateDungeon } from "../domain/dungeon/DungeonGeneration";
import { floorDistances } from "../domain/dungeon/FloorTopology";
import { DEFAULT_RUN_CONFIGURATION } from "../domain/dungeon/RunConfiguration";
import { createSeededRandom } from "../domain/dungeon/Seed";
import {
	carveCorridors,
	carveRooms,
	makeDungeon,
} from "../domain/dungeon/Terrain";
import { expectAllFloorTilesReachable } from "./testhelpers";

const upper = { startRow: 1, endRow: 3, startCol: 1, endCol: 3 };
const lower = { startRow: 9, endRow: 11, startCol: 1, endCol: 3 };
const right = { startRow: 1, endRow: 3, startCol: 9, endCol: 11 };
const base = () =>
	carveCorridors(carveRooms(makeDungeon(15, 15), [upper, lower, right]), [
		createCorridor(upper, right),
		createCorridor(lower, right),
	]);
describe("Bounded nearby-room loops", () => {
	it("opens a short alternate route around a long room detour without changing the input", () => {
		const terrain = base(),
			snapshot = structuredClone(terrain);
		const loops = createRoomLoops(
			terrain,
			[upper, lower, right],
			createSeededRandom(123),
		);
		expect(loops).toHaveLength(1);
		const after = carveCorridors(terrain, loops);
		expect(floorDistances(terrain, { row: 2, col: 2 })[10 * 15 + 2]).toBe(24);
		expect(floorDistances(after, { row: 2, col: 2 })[10 * 15 + 2]).toBe(8);
		expect(terrain).toEqual(snapshot);
		expectAllFloorTilesReachable(after, { row: 2, col: 2 });
	});
	it("does not add a redundant route or loops to a single room", () => {
		const direct = carveCorridors(base(), [createCorridor(upper, lower)]);
		expect(
			createRoomLoops(direct, [upper, lower], createSeededRandom(1)),
		).toEqual([]);
		expect(createRoomLoops(base(), [upper], createSeededRandom(1))).toEqual([]);
	});
	it("is reproducible and keeps all new paths short and inside the boundary", () => {
		const one = createRoomLoops(
			base(),
			[upper, lower, right],
			createSeededRandom(456),
		);
		expect(one).toEqual(
			createRoomLoops(base(), [upper, lower, right], createSeededRandom(456)),
		);
		for (const path of one) {
			expect(path.length - 1).toBeLessThanOrEqual(18);
			for (const cell of path) {
				expect(cell.row).toBeGreaterThan(0);
				expect(cell.row).toBeLessThan(14);
				expect(cell.col).toBeGreaterThan(0);
				expect(cell.col).toBeLessThan(14);
			}
		}
	});
	it("appends shortcuts to the original BSP connections in generated floors", () => {
		const dungeon = generateDungeon(DEFAULT_RUN_CONFIGURATION, 123);
		const original = connectPartitionRooms(dungeon.partitions);
		expect(dungeon.corridors.slice(0, original.length)).toEqual(original);
		expect(dungeon.corridors.length).toBeGreaterThan(original.length);
	});
	it.each([10, 25, 40])(
		"keeps generated %i-square floors connected, bounded and deterministic",
		(size) => {
			for (const seed of [0, 1, 123]) {
				const config = { ...DEFAULT_RUN_CONFIGURATION, rows: size, cols: size };
				const dungeon = generateDungeon(config, seed);
				expect(dungeon).toEqual(generateDungeon(config, seed));
				expectAllFloorTilesReachable(dungeon.terrain, {
					row: dungeon.rooms[0].startRow,
					col: dungeon.rooms[0].startCol,
				});
				expect(dungeon.corridors.length).toBeLessThanOrEqual(
					dungeon.rooms.length - 1 + 6,
				);
				expect(dungeon.terrain[0].every((t) => t === "#")).toBe(true);
				expect(dungeon.terrain[size - 1].every((t) => t === "#")).toBe(true);
				expect(
					dungeon.terrain.every(
						(row) => row[0] === "#" && row[size - 1] === "#",
					),
				).toBe(true);
			}
		},
	);
});
