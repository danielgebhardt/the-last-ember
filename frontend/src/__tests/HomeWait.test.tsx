import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as GameState from "../domain/game/GameState";
import { ThemeProvider } from "../settings/ThemeProvider";
import {
	closeNewAdventure,
	inspectEndedRun,
	openCustomAdventure,
	readDungeonCells,
	resetHomeTestState,
	stubDungeonRun,
} from "./HomeTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import Home from "./TestHome";

const renderWaitingRun = (monster = true) => {
	stubDungeonRun(
		createCorridorEncounter(),
		monster
			? [
					{
						intent: { type: "idle" as const },
						id: "1:1",
						kind: "goblin",
						floorNumber: 1,
						coordinate: { row: 1, col: 3 },
						health: 4,
					},
				]
			: [],
	);
	render(<Home initialFogConfiguration={{ enabled: true, radius: 1 }} />, {
		wrapper: ThemeProvider,
	});
	return userEvent.setup();
};
afterEach(resetHomeTestState);

describe("Waiting on the play screen", () => {
	it("lets one goblin approach then hit without a player attack or movement", async () => {
		const user = renderWaitingRun();
		await user.keyboard(" ");
		expect(screen.getByLabelText("row1col2 - goblin")).toBeVisible();
		expect(screen.getByLabelText("Player health")).toHaveTextContent(
			"Health 10 / 10",
		);
		expect(
			within(screen.getByRole("log")).getByRole("heading", {
				name: "Turn 1",
			}),
		).toBeVisible();
		expect(
			within(screen.getByRole("log")).getByText("The goblin begins pursuit."),
		).toBeVisible();
		await user.keyboard(" ");
		expect(screen.getByLabelText("row1col1 - player")).toBeVisible();
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 2");
		expect(screen.getByLabelText("Player health")).toHaveTextContent(
			"Health 9 / 10",
		);
		expect(screen.getByLabelText("row1col4 - undiscovered")).toBeVisible();
		expect(
			within(screen.getByRole("log"))
				.getAllByRole("listitem")
				.map(
					(item) => item.querySelector("[data-activity-message]")?.textContent,
				),
		).toEqual([
			"The goblin begins pursuit.",
			"The goblin hits you for 1 damage.",
		]);
		expect(
			within(screen.getByRole("log")).getByRole("heading", {
				name: "Turn 2",
			}),
		).toBeVisible();
	});
	it("leaves Spacebar to Settings and log focus, then waits only when gameplay is focused", async () => {
		const user = renderWaitingRun(false);
		const before = readDungeonCells();
		const input = await openCustomAdventure(user);
		await user.click(input);
		await user.keyboard(" ");
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
		await closeNewAdventure(user);
		// Dismissal returns to gameplay; explicitly focusing the toolbar still gives Space to its button.
		expect(screen.getByLabelText("Dungeon map", { exact: true })).toHaveFocus();
		screen.getByRole("button", { name: "Settings" }).focus();
		expect(screen.getByRole("button", { name: "Settings" })).toHaveFocus();
		await user.keyboard(" ");
		expect(screen.getByRole("dialog", { name: "Settings" })).toBeVisible();
		await closeNewAdventure(user);
		screen.getByRole("log").focus();
		await user.keyboard(" ");
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
		screen.getByLabelText("Dungeon map", { exact: true }).focus();
		await user.keyboard(" ");
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 1");
		expect(readDungeonCells()).toEqual(before);
	});
	it("allows a fatal monster hit while waiting and ignores further Spacebar presses", async () => {
		const create = GameState.createGameState;
		vi.spyOn(GameState, "createGameState").mockImplementationOnce((run) => ({
			...create(run),
			player: { health: 1, maxHealth: 10 },
		}));
		const user = renderWaitingRun();
		await user.keyboard("  ");
		await inspectEndedRun(user);
		expect(screen.getByRole("alert")).toHaveTextContent("You died.");
		expect(screen.getByLabelText("Player health")).toHaveTextContent(
			"Health 0 / 10",
		);
		const map = readDungeonCells();
		const log = screen.getByRole("log").textContent;
		await user.keyboard("  ");
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 2");
		expect(readDungeonCells()).toEqual(map);
		expect(screen.getByRole("log")).toHaveTextContent(log ?? "");
	});
});
