import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import * as GameState from "../domain/game/GameState";
import { ThemeProvider } from "../settings/ThemeProvider";
import { resetHomeTestState, stubDungeonRun } from "./HomeTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import Home from "./TestHome";

afterEach(resetHomeTestState);
it("E opens explicit fountain choices, Escape cancels freely, and 1 drinks while potion shortcuts are paused", async () => {
	stubDungeonRun(createCorridorEncounter());
	const create = GameState.createGameState;
	vi.spyOn(GameState, "createGameState").mockImplementationOnce((run) => ({
		...create(run),
		monsters: [],
		floorItems: [],
		player: { health: 4, maxHealth: 10 },
		mana: 4,
		objects: [
			{
				id: "floor:1:object:fountain:1",
				kind: "fountain",
				floorNumber: 1,
				coordinate: { row: 1, col: 2 },
				activated: false,
			},
		],
	}));
	render(<Home />, { wrapper: ThemeProvider });
	const map = screen.getByLabelText("Dungeon map", { exact: true });
	map.focus();
	const user = userEvent.setup();
	await user.keyboard("e");
	await screen.findByRole("dialog", { name: "Ancient fountain" });
	expect(screen.getByText("3 damage and Poison")).toBeVisible();
	await user.keyboard("{Escape}");
	await waitFor(() => expect(map).toHaveFocus());
	expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
	await user.keyboard("e");
	await screen.findByRole("dialog", { name: "Ancient fountain" });
	await user.keyboard("d");
	expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
	await user.keyboard("1");
	await waitFor(() => expect(map).toHaveFocus());
	expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 1");
	expect(screen.getByLabelText("Player health")).toHaveTextContent(
		"Health 10 / 10",
	);
	expect(
		screen.getByRole("cell", { name: "row1col2 - dry fountain" }),
	).toBeVisible();
});
