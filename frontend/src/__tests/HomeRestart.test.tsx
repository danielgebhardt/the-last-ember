import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as DungeonGeneration from "../domain/dungeon/DungeonGeneration.ts";
import * as DungeonRun from "../domain/dungeon/DungeonRun.ts";
import { FLOOR } from "../domain/dungeon/Tiles.ts";
import { enterDungeonFromTown } from "./HomeTestHelpers";
import {
	renderHome as render,
	resetHomeTestState,
	stubDungeonRun,
} from "./HomeTestHelpers.tsx";
import Home from "./TestHome";
import { createThreeFloorTraversalRun } from "./testhelpers.ts";

afterEach(resetHomeTestState);

describe("Home run restart", () => {
	it("replaces the rendered dungeon and resets the player when New Dungeon is clicked", async () => {
		const user = userEvent.setup();

		const firstRun = DungeonRun.connectDungeonFloors(
			DungeonRun.generateDungeonRun(123, 3, {
				rows: 7,
				cols: 11,
				minPartitionSize: 8,
				roomPadding: 1,
				minRoomSize: 3,
				maxRoomAspectRatio: 3,
			}),
		);

		const secondRun = DungeonRun.connectDungeonFloors(
			DungeonRun.generateDungeonRun(456, 3, {
				rows: 5,
				cols: 7,
				minPartitionSize: 8,
				roomPadding: 1,
				minRoomSize: 3,
				maxRoomAspectRatio: 3,
			}),
		);

		const generateSpy = vi
			.spyOn(DungeonRun, "generateDungeonRun")
			.mockReturnValue(firstRun);

		vi.spyOn(DungeonRun, "connectDungeonFloors").mockImplementation(
			(run) => run,
		);

		render(<Home />);

		const firstFloor = firstRun.floors[firstRun.activeFloor - 1];
		const firstStart = firstRun.playerCoordinate;

		const movedPosition = {
			row: firstStart.row,
			col: firstStart.col + 1,
		};

		expect(firstFloor.terrain[movedPosition.row][movedPosition.col]).toBe(
			FLOOR,
		);

		await user.keyboard("{ArrowRight}");

		expect(
			screen.getByRole("cell", {
				name: `row${movedPosition.row}col${movedPosition.col} - player`,
			}),
		).toBeVisible();

		const callsBeforeClick = generateSpy.mock.calls.length;

		generateSpy.mockReturnValue(secondRun);

		await user.click(screen.getByRole("button", { name: "New Dungeon" }));

		await user.click(
			screen.getByRole("button", { name: "Start standard adventure" }),
		);
		await enterDungeonFromTown(user);

		expect(generateSpy).toHaveBeenCalledTimes(callsBeforeClick + 1);

		const dungeon = screen.getByRole("table", { name: "Dungeon" });
		const rows = within(dungeon).getAllByRole("row");

		expect(rows).toHaveLength(5);

		for (const row of rows) {
			expect(within(row).getAllByRole("cell")).toHaveLength(7);
		}

		const secondStart = secondRun.playerCoordinate;

		expect(
			screen.getByRole("cell", {
				name: `row${secondStart.row}col${secondStart.col} - player`,
			}),
		).toBeVisible();
	});

	it("resets the player on every new dungeon even when the seed and starting position repeat", async () => {
		const user = userEvent.setup();
		const generated = DungeonGeneration.generateDungeon({
			rows: 5,
			cols: 7,
			minPartitionSize: 8,
			roomPadding: 1,
			minRoomSize: 3,
			maxRoomAspectRatio: 3,
		});

		vi.spyOn(DungeonGeneration, "generateDungeon").mockReturnValue(generated);
		vi.spyOn(Math, "random").mockReturnValue(0.5);

		render(<Home />);

		for (let generation = 0; generation < 2; generation++) {
			await user.keyboard("{ArrowRight}");

			expect(
				screen.getByRole("cell", { name: "row2col4 - player" }),
			).toBeVisible();

			await user.click(screen.getByRole("button", { name: "New Dungeon" }));

			await user.click(
				screen.getByRole("button", { name: "Start standard adventure" }),
			);
			await enterDungeonFromTown(user);

			expect(
				screen.getByRole("cell", { name: "row2col3 - player" }),
			).toBeVisible();
			expect(
				screen.getByRole("cell", { name: "row2col4 - floor" }),
			).toBeVisible();
		}
	});

	it("should show correct floor number after descending, then reset to floor 1 after starting new dungeon", async () => {
		const user = userEvent.setup();
		const run = createThreeFloorTraversalRun();

		stubDungeonRun(run);

		render(<Home />);

		expect(screen.getByRole("heading", { name: "Floor 1 of 3" })).toBeVisible();

		// Floor 1 -> Floor 2.
		await user.keyboard("{ArrowRight}");
		expect(screen.getByRole("heading", { name: "Floor 2 of 3" })).toBeVisible();

		await user.click(screen.getByRole("button", { name: "New Dungeon" }));

		await user.click(
			screen.getByRole("button", { name: "Start standard adventure" }),
		);
		await enterDungeonFromTown(user);

		expect(screen.getByRole("heading", { name: "Floor 1 of 3" })).toBeVisible();
	});
});
