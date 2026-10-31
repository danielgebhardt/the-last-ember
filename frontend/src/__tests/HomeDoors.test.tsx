import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import * as GameState from "../domain/game/GameState";
import { ThemeProvider } from "../settings/ThemeProvider";
import { resetHomeTestState, stubDungeonRun } from "./HomeTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import Home from "./TestHome";

afterEach(resetHomeTestState);
it("E opens an adjacent door for one turn and updates sight without moving the player", async () => {
	stubDungeonRun(createCorridorEncounter());
	const create = GameState.createGameState;
	vi.spyOn(GameState, "createGameState").mockImplementationOnce((run) => ({
		...create(run),
		monsters: [],
		floorItems: [],
		objects: [
			{
				id: "floor:1:object:door:1",
				kind: "door",
				floorNumber: 1,
				coordinate: { row: 1, col: 2 },
				activated: false,
			},
		],
	}));
	render(<Home />, { wrapper: ThemeProvider });
	screen.getByLabelText("Dungeon map", { exact: true }).focus();
	expect(
		screen.getByRole("cell", { name: "row1col2 - closed door" }),
	).toBeVisible();
	expect(screen.getByRole("cell", { name: /row1col3/ })).toHaveAttribute(
		"data-visibility",
		"unknown",
	);
	const user = userEvent.setup();
	await user.keyboard("e");
	expect(
		screen.getByRole("cell", { name: "row1col2 - open door" }),
	).toBeVisible();
	expect(screen.getByRole("cell", { name: /row1col3/ })).toHaveAttribute(
		"data-visibility",
		"visible",
	);
	expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 1");
	expect(screen.getByLabelText("row1col1 - player")).toBeVisible();
	await user.keyboard("e");
	expect(screen.getByRole("cell", { name: /row1col3/ })).toHaveAttribute(
		"data-visibility",
		"remembered",
	);
	await user.click(screen.getByRole("button", { name: "Help" }));
	await screen.findByRole("dialog", { name: "Help" });
	await user.keyboard("e");
	expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 2");
	await user.keyboard("{Escape}");
	await waitFor(() =>
		expect(screen.getByLabelText("Dungeon map", { exact: true })).toHaveFocus(),
	);
	await user.keyboard("e");
	expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 3");
});
