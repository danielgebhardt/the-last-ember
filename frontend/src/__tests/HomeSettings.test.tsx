import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as DungeonRun from "../domain/dungeon/DungeonRun.ts";
import {
	closeSettings,
	openSettings,
	readDungeonCells,
	renderHome as render,
	resetHomeTestState,
} from "./HomeTestHelpers.tsx";
import Home from "./TestHome";
import { createThreeFloorTraversalRun } from "./testhelpers.ts";

afterEach(resetHomeTestState);

describe("Home settings and appearance", () => {
	it("changes appearance with mouse and keyboard without losing exploration", async () => {
		const run = createThreeFloorTraversalRun();
		const generate = vi
			.spyOn(DungeonRun, "generateDungeonRun")
			.mockReturnValue(run);
		vi.spyOn(DungeonRun, "connectDungeonFloors").mockReturnValue(run);
		const user = userEvent.setup();
		render(<Home />);
		await user.keyboard("{ArrowRight}{ArrowRight}");
		expect(screen.getByRole("heading", { name: "Floor 2 of 3" })).toBeVisible();
		const board = screen.getByRole("table");
		const terrain = readDungeonCells(board);
		await openSettings(user);
		expect(
			screen.getByRole("button", { name: "Dark", pressed: true }),
		).toBeVisible();
		await user.click(screen.getByRole("button", { name: "Light" }));
		expect(document.documentElement).not.toHaveClass("dark");
		expect(
			screen.getByRole("button", { name: "Light", pressed: true }),
		).toHaveFocus();
		await user.keyboard("{ArrowRight} ");
		expect(
			screen.getByRole("button", { name: "Dark", pressed: true }),
		).toHaveFocus();
		expect(document.documentElement).toHaveClass("dark");
		expect(readDungeonCells(board)).toEqual(terrain);
		await closeSettings(user);
		expect(screen.getByRole("heading", { name: "Floor 2 of 3" })).toBeVisible();
		await openSettings(user);
		expect(
			screen.getByRole("button", { name: "Dark", pressed: true }),
		).toBeVisible();
		await closeSettings(user);
		await user.keyboard("{ArrowLeft}{ArrowLeft}");
		expect(screen.getByRole("heading", { name: "Floor 1 of 3" })).toBeVisible();
		expect(generate).toHaveBeenCalledTimes(1);
	});

	it("opens settings from the header with only preferences, and restores focus on dismissal", async () => {
		const run = createThreeFloorTraversalRun();
		const generate = vi
			.spyOn(DungeonRun, "generateDungeonRun")
			.mockReturnValue(run);
		vi.spyOn(DungeonRun, "connectDungeonFloors").mockReturnValue(run);
		const user = userEvent.setup();
		render(<Home />);
		const trigger = within(screen.getByRole("banner")).getByRole("button", {
			name: "Settings",
		});
		await user.click(trigger);
		const panel = await screen.findByRole("dialog", { name: "Settings" });
		await waitFor(() =>
			expect(panel).toContainElement(document.activeElement as HTMLElement),
		);
		// Run setup and sight are chosen when an adventure starts, not here.
		expect(within(panel).queryByRole("textbox")).toBeNull();
		expect(within(panel).queryByText(/seed|fog/i)).toBeNull();
		expect(within(panel).getByRole("button", { name: "Light" })).toBeVisible();
		expect(
			within(panel).getByRole("slider", { name: "Map tile size" }),
		).toBeVisible();
		expect(
			within(panel).getByRole("checkbox", {
				name: "Show hints for new mechanics",
			}),
		).toBeVisible();
		expect(within(panel).getByText("Adventurer Avatar")).toBeVisible();
		expect(within(panel).getByText("Accounts & privacy")).toBeVisible();
		await user.keyboard("{Escape}");
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
		);
		expect(screen.getByLabelText("Dungeon map", { exact: true })).toHaveFocus();
		expect(generate).toHaveBeenCalledTimes(1);
		await user.click(trigger);
		await user.click(
			within(await screen.findByRole("dialog", { name: "Settings" })).getByRole(
				"button",
				{ name: "Close" },
			),
		);
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
		);
		expect(screen.getByLabelText("Dungeon map", { exact: true })).toHaveFocus();
		expect(generate).toHaveBeenCalledTimes(1);
	});

	it("opens settings with the keyboard without restarting or moving the player", async () => {
		const run = createThreeFloorTraversalRun();
		const generate = vi
			.spyOn(DungeonRun, "generateDungeonRun")
			.mockReturnValue(run);
		vi.spyOn(DungeonRun, "connectDungeonFloors").mockReturnValue(run);
		const user = userEvent.setup();
		render(<Home />);
		screen.getByRole("button", { name: "New Dungeon" }).focus();
		expect(screen.getByRole("button", { name: "New Dungeon" })).toHaveFocus();
		await user.tab();
		expect(screen.getByRole("button", { name: "Character" })).toHaveFocus();
		await user.tab();
		expect(screen.getByRole("button", { name: "Save/Load" })).toHaveFocus();
		await user.tab();
		expect(screen.getByRole("button", { name: "Settings" })).toHaveFocus();
		await user.keyboard("{Enter}");
		expect(
			await screen.findByRole("dialog", { name: "Settings" }),
		).toBeVisible();
		const panel = screen.getByRole("dialog", { name: "Settings" });
		await waitFor(() =>
			expect(panel).toContainElement(document.activeElement as HTMLElement),
		);
		await closeSettings(user);
		expect(
			screen.getByRole("cell", { name: "row1col1 - player" }),
		).toBeVisible();
		expect(generate).toHaveBeenCalledTimes(1);
	});
});
