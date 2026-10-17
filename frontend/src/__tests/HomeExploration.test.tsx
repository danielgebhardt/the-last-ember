import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as DungeonRun from "../domain/dungeon/DungeonRun.ts";
import type { Coordinate } from "../domain/dungeon/DungeonTypes.ts";
import {
	ENTRANCE,
	FLOOR,
	PLAYER,
	STAIRS_DOWN,
	STAIRS_UP,
	WALL,
} from "../domain/dungeon/Tiles.ts";
import { enterDungeonFromTown } from "./HomeTestHelpers";
import {
	closeSettings,
	openSettings,
	readDungeonCells,
	renderHome as render,
	resetHomeTestState,
	waitForSettingsClosed,
} from "./HomeTestHelpers.tsx";
import Home from "./TestHome";
import {
	createTestDungeonFloor,
	createThreeFloorTraversalRun,
} from "./testhelpers.ts";

afterEach(resetHomeTestState);

describe("Home exploration integration", () => {
	// Give each seed visibly different rooms and stair positions so an old run
	// cannot accidentally satisfy the replay and restart assertions.
	const shiftCoordinate = (
		coordinate: Coordinate,
		horizontalOffset: number,
	) => ({
		row: coordinate.row,
		col: coordinate.col + horizontalOffset,
	});
	const createShiftedTraversalRun = (
		seed: number,
		horizontalOffset: number,
	): DungeonRun.DungeonRun => {
		const original = createThreeFloorTraversalRun();
		const shiftLink = (link: DungeonRun.StairLink | undefined) =>
			link && {
				...link,
				coordinate: shiftCoordinate(link.coordinate, horizontalOffset),
				arrivalCoordinate: shiftCoordinate(
					link.arrivalCoordinate,
					horizontalOffset,
				),
			};
		return {
			...original,
			seed,
			playerCoordinate: shiftCoordinate(
				original.playerCoordinate,
				horizontalOffset,
			),
			floors: original.floors.map((floor) =>
				createTestDungeonFloor({
					floorNumber: floor.floorNumber,
					rows: floor.terrain.length,
					cols: floor.terrain[0].length + horizontalOffset,
					room: {
						...floor.rooms[0],
						startCol: floor.rooms[0].startCol + horizontalOffset,
						endCol: floor.rooms[0].endCol + horizontalOffset,
					},
					upStair: shiftLink(floor.upStair),
					downStair: shiftLink(floor.downStair),
				}),
			),
		};
	};

	it("completes exploration, seed replay, and repeated whole-run restarts without restoring old floors", async () => {
		const user = userEvent.setup();
		const runs = new Map([
			[0, createShiftedTraversalRun(0, 0)],
			[123, createShiftedTraversalRun(123, 1)],
			[456, createShiftedTraversalRun(456, 2)],
		]);
		const originalFixtures = structuredClone(runs);
		const generate = vi
			.spyOn(DungeonRun, "generateDungeonRun")
			.mockImplementation((seed) => {
				const run = runs.get(seed);
				if (!run) throw new Error(`Unexpected seed ${seed}`);
				return structuredClone(run);
			});
		const connect = vi
			.spyOn(DungeonRun, "connectDungeonFloors")
			.mockImplementation((run) => run);

		const expectFloor = (
			seed: number,
			floorNumber: number,
			player: Coordinate,
		) => {
			const floor = runs.get(seed)?.floors[floorNumber - 1];
			if (!floor) throw new Error("Expected a known fixture floor");
			const expected = floor.terrain.map((row) => [...row]);
			for (const [link, glyph] of [
				[floor.upStair, STAIRS_UP],
				[floor.downStair, STAIRS_DOWN],
			] as const) {
				if (link) expected[link.coordinate.row][link.coordinate.col] = glyph;
			}
			if (floorNumber === 1) {
				const entrance = runs.get(seed)?.playerCoordinate;
				if (!entrance) throw new Error("Fixture needs an entrance.");
				expected[entrance.row][entrance.col] = ENTRANCE;
			}
			expected[player.row][player.col] = PLAYER;
			const descriptions: Record<string, string> = {
				[WALL]: "wall",
				[ENTRANCE]: "entrance",
				[FLOOR]: "floor",
				[PLAYER]: "player",
				[STAIRS_UP]: "stairs up",
				[STAIRS_DOWN]: "stairs down",
			};
			const table = screen.getByRole("table", { name: "Dungeon" });
			const actual = readDungeonCells(table);
			expect(actual).toEqual(
				expected.map((row, rowIndex) =>
					row.map(
						(tile, colIndex) =>
							`row${rowIndex}col${colIndex} - ${descriptions[tile]}`,
					),
				),
			);
			expect(
				screen.getByRole("heading", { name: `Floor ${floorNumber} of 3` }),
			).toBeVisible();
		};

		// Explore the initial run, then replay its seed from the settings panel.
		const { rerender } = render(<Home />);
		expectFloor(0, 1, { row: 1, col: 1 });
		await user.keyboard("{ArrowRight}");
		expectFloor(0, 2, { row: 1, col: 1 });
		await user.keyboard("{ArrowRight}{ArrowRight}");
		expectFloor(0, 3, { row: 1, col: 1 });
		// Revisit earlier floors in the final run and verify all fixtures stayed intact.
		await user.keyboard("{ArrowRight}{ArrowLeft}");
		expectFloor(0, 2, { row: 1, col: 3 });
		await user.keyboard("{ArrowLeft}{ArrowLeft}");
		expectFloor(0, 1, { row: 1, col: 2 });

		const input = await openSettings(user);
		await user.clear(input);
		await user.type(input, "0{Enter}");
		await enterDungeonFromTown(user);
		await waitForSettingsClosed();
		expectFloor(0, 1, { row: 1, col: 1 });
		expect(generate).toHaveBeenCalledTimes(2);
		await user.click(screen.getByRole("heading", { name: "Floor 1 of 3" }));
		await user.keyboard("{ArrowRight}{ArrowRight}{ArrowRight}");
		expectFloor(0, 3, { row: 1, col: 1 });

		// Restart twice; each new run must own its terrain and stair links.
		for (const [seed, offset] of [
			[123, 1],
			[456, 2],
		]) {
			vi.spyOn(Math, "random").mockReturnValue(seed / 4294967296);
			await user.click(screen.getByRole("button", { name: "New Dungeon" }));
			await user.click(
				screen.getByRole("button", { name: "Start new dungeon" }),
			);
			await enterDungeonFromTown(user);
			expectFloor(seed, 1, { row: 1, col: 1 + offset });
			expect(await openSettings(user)).toHaveValue(String(seed));
			expect(screen.getByLabelText("Current dungeon seed")).toHaveTextContent(
				String(seed),
			);
			await closeSettings(user);
			await user.keyboard("{ArrowRight}");
			expectFloor(seed, 2, { row: 1, col: 1 + offset });
			await user.keyboard("{ArrowRight}{ArrowRight}");
			expectFloor(seed, 3, { row: 1, col: 1 + offset });
			rerender(<Home />);
			expectFloor(seed, 3, { row: 1, col: 1 + offset });
		}
		// Revisit earlier floors in the final run and verify all fixtures stayed intact.
		await user.keyboard("{ArrowRight}{ArrowLeft}");
		expectFloor(456, 2, { row: 1, col: 5 });
		await user.keyboard("{ArrowLeft}{ArrowLeft}");
		expectFloor(456, 1, { row: 1, col: 4 });
		expect(generate.mock.calls.map(([seed]) => seed)).toEqual([0, 0, 123, 456]);
		expect(connect).toHaveBeenCalledTimes(4);
		expect(runs).toEqual(originalFixtures);
	});
});
