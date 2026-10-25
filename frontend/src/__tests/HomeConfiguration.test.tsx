import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as DungeonRun from "../domain/dungeon/DungeonRun.ts";
import * as GameState from "../domain/game/GameState.ts";
import { enterDungeonFromTown } from "./HomeTestHelpers";
import {
	closeSettings,
	DEFAULT_DUNGEON_CONFIG,
	editConfiguration,
	movementKeysTo,
	openSettings,
	readDungeonCells,
	renderHome as render,
	resetHomeTestState,
	waitForSettingsClosed,
} from "./HomeTestHelpers.tsx";
import Home from "./TestHome";
import { createThreeFloorTraversalRun } from "./testhelpers.ts";

afterEach(resetHomeTestState);

describe("Home dungeon configuration", () => {
	it("rejects invalid configuration without losing exploration or drafts and clears corrected field feedback", async () => {
		const run = createThreeFloorTraversalRun();
		const generate = vi
			.spyOn(DungeonRun, "generateDungeonRun")
			.mockReturnValue(run);
		vi.spyOn(DungeonRun, "connectDungeonFloors").mockReturnValue(run);
		const user = userEvent.setup();
		render(<Home />);
		await user.keyboard("{ArrowRight}{ArrowRight}");
		const board = screen.getByRole("table");
		const original = readDungeonCells(board);
		await openSettings(user);
		await editConfiguration(user, { rows: "4", columns: "101", floors: "4" });
		await user.click(screen.getByRole("button", { name: "Start from seed" }));
		expect(screen.getAllByRole("alert")).toHaveLength(3);
		for (const name of ["Rows", "Columns", "Floors"])
			expect(screen.getByRole("textbox", { name })).toHaveAttribute(
				"aria-invalid",
				"true",
			);
		expect(
			screen.getByRole("textbox", { name: "Rows" }),
		).toHaveAccessibleDescription(/Enter a whole number from 10 to 40/);
		expect(
			screen.getByRole("textbox", { name: "Floors" }),
		).toHaveAccessibleDescription(/Enter a whole number from 5 to 20/);
		expect(readDungeonCells(board)).toEqual(original);
		expect(generate).toHaveBeenCalledTimes(1);
		await closeSettings(user);
		expect(screen.getByRole("heading", { name: "Floor 2 of 3" })).toBeVisible();
		await openSettings(user);
		expect(screen.getByRole("textbox", { name: "Columns" })).toHaveValue("101");
		await user.clear(screen.getByRole("textbox", { name: "Rows" }));
		await user.type(screen.getByRole("textbox", { name: "Rows" }), "10");
		expect(screen.getByRole("textbox", { name: "Rows" })).toHaveAttribute(
			"aria-invalid",
			"false",
		);
		expect(screen.getAllByRole("alert")).toHaveLength(2);
	});

	it.each(["terrain", "stairs", "content"])(
		"preserves the run and active configuration when %s generation fails, then allows retry",
		async (stage) => {
			const run = createThreeFloorTraversalRun();
			const generate = vi
				.spyOn(DungeonRun, "generateDungeonRun")
				.mockReturnValue(run);
			const connect = vi
				.spyOn(DungeonRun, "connectDungeonFloors")
				.mockReturnValue(run);
			const content = vi.spyOn(GameState, "createGameState");
			const user = userEvent.setup();
			render(<Home />);
			await user.keyboard("{ArrowRight}");
			const board = screen.getByRole("table");
			const original = readDungeonCells(board);
			await openSettings(user);
			await editConfiguration(user, { rows: "10", columns: "10", floors: "6" });
			(stage === "terrain"
				? generate
				: stage === "stairs"
					? connect
					: content
			).mockImplementationOnce(() => {
				throw new Error("generation failed");
			});
			await user.click(screen.getByRole("button", { name: "Start from seed" }));
			expect(screen.getByRole("alert")).toHaveTextContent(
				"Try a different seed or larger dimensions",
			);
			expect(readDungeonCells(board)).toEqual(original);
			expect(screen.getByRole("textbox", { name: "Rows" })).toHaveValue("10");
			expect(
				screen.getByLabelText("Current dungeon configuration"),
			).toHaveTextContent("15 rows × 15 columns · 5 floors");
			await closeSettings(user);
			expect(
				screen.getByRole("heading", { name: "Floor 2 of 3" }),
			).toBeVisible();
			await user.click(screen.getByRole("button", { name: "New Dungeon" }));
			await user.click(
				screen.getByRole("button", { name: "Start new dungeon" }),
			);
			expect(generate).toHaveBeenLastCalledWith(
				expect.any(Number),
				5,
				DEFAULT_DUNGEON_CONFIG,
			);
			await openSettings(user);
			expect(screen.getByRole("textbox", { name: "Rows" })).toHaveValue("15");
			expect(screen.queryByRole("alert")).not.toBeInTheDocument();
		},
	);

	it("replays configured floors and stairs, resets exploration, and reuses active settings for random restarts", async () => {
		const originalGenerate = DungeonRun.generateDungeonRun;
		const generate = vi
			.spyOn(DungeonRun, "generateDungeonRun")
			.mockImplementation(originalGenerate)
			.mockReturnValueOnce(createThreeFloorTraversalRun());
		const expected = DungeonRun.connectDungeonFloors(
			originalGenerate(123, 6, {
				rows: 10,
				cols: 15,
				minPartitionSize: 8,
				roomPadding: 1,
				minRoomSize: 3,
				maxRoomAspectRatio: 3,
			}),
		);
		const user = userEvent.setup();
		render(<Home />);
		await user.keyboard("{ArrowRight}");
		const seed = await openSettings(user);
		await user.clear(seed);
		await user.type(seed, "123");
		await editConfiguration(user, { rows: "10", columns: "15", floors: "6" });
		await user.click(screen.getByRole("button", { name: "Start from seed" }));
		await enterDungeonFromTown(user);
		await waitForSettingsClosed();
		expect(screen.getByRole("heading", { name: "Floor 1 of 6" })).toBeVisible();
		const firstBoard = readDungeonCells(screen.getByRole("table"));
		const first = expected.floors[0];
		if (!first.downStair) throw new Error("Fixture must have a down stair");
		const keys = movementKeysTo(
			first.terrain,
			expected.playerCoordinate,
			first.downStair.coordinate,
		);
		await user.keyboard(keys);
		expect(screen.getByRole("heading", { name: "Floor 2 of 6" })).toBeVisible();
		const secondBoard = readDungeonCells(screen.getByRole("table"));
		await openSettings(user);
		await user.click(screen.getByRole("button", { name: "Start from seed" }));
		await enterDungeonFromTown(user);
		await waitForSettingsClosed();
		expect(screen.getByRole("heading", { name: "Floor 1 of 6" })).toBeVisible();
		expect(readDungeonCells(screen.getByRole("table"))).toEqual(firstBoard);
		await user.keyboard(keys);
		expect(readDungeonCells(screen.getByRole("table"))).toEqual(secondBoard);
		await openSettings(user);
		await editConfiguration(user, { rows: "20", columns: "25", floors: "7" });
		await closeSettings(user);
		vi.spyOn(Math, "random").mockReturnValue(0);
		await user.click(screen.getByRole("button", { name: "New Dungeon" }));
		await user.click(screen.getByRole("button", { name: "Start new dungeon" }));
		await enterDungeonFromTown(user);
		expect(generate).toHaveBeenLastCalledWith(0, 6, {
			...DEFAULT_DUNGEON_CONFIG,
			rows: 10,
			cols: 15,
		});
		expect(screen.getByRole("heading", { name: "Floor 1 of 6" })).toBeVisible();
		expect(within(screen.getByRole("table")).getAllByRole("cell")).toHaveLength(
			150,
		);
		await openSettings(user);
		expect(screen.getByRole("textbox", { name: "Rows" })).toHaveValue("10");
		expect(screen.getByRole("textbox", { name: "Floors" })).toHaveValue("6");
		expect(screen.getByRole("textbox", { name: "Dungeon seed" })).toHaveValue(
			"0",
		);
	});

	it("keeps configuration edits as drafts and applies a rectangular five-floor run explicitly", async () => {
		const user = userEvent.setup();
		render(<Home />);
		const board = screen.getByRole("table");
		const original = readDungeonCells(board);
		await openSettings(user);
		expect(screen.getByRole("textbox", { name: "Rows" })).toHaveValue("15");
		expect(screen.getByRole("textbox", { name: "Columns" })).toHaveValue("15");
		expect(screen.getByRole("textbox", { name: "Floors" })).toHaveValue("5");
		for (const [name, value] of [
			["Rows", "10"],
			["Columns", "15"],
			["Floors", "5"],
		]) {
			const field = screen.getByRole("textbox", { name });
			await user.clear(field);
			await user.type(field, value);
		}
		expect(readDungeonCells(board)).toEqual(original);
		await closeSettings(user);
		expect(screen.getByRole("heading", { name: "Floor 1 of 5" })).toBeVisible();
		await openSettings(user);
		expect(screen.getByRole("textbox", { name: "Rows" })).toHaveValue("10");
		await user.click(screen.getByRole("button", { name: "Start from seed" }));
		await waitForSettingsClosed();
		await enterDungeonFromTown(user);
		expect(screen.getByRole("heading", { name: "Floor 1 of 5" })).toBeVisible();
		expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(
			10,
		);
		expect(within(screen.getByRole("table")).getAllByRole("cell")).toHaveLength(
			150,
		);
		await openSettings(user);
		expect(
			screen.getByLabelText("Current dungeon configuration"),
		).toHaveTextContent("10 rows × 15 columns · 5 floors");
	});
});
