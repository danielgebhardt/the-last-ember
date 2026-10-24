import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import * as GameState from "../domain/game/GameState";
import { ThemeProvider } from "../settings/ThemeProvider";
import { resetHomeTestState, stubDungeonRun } from "./HomeTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import Home from "./TestHome";

afterEach(resetHomeTestState);
it("shows the offering price and XP before committing one keyboard-selected bargain", async () => {
	stubDungeonRun(createCorridorEncounter());
	const create = GameState.createGameState;
	vi.spyOn(GameState, "createGameState").mockImplementationOnce((run) => ({
		...create(run),
		gold: 20,
		monsters: [],
		floorItems: [],
		objects: [
			{
				id: "floor:1:object:shrine:1",
				kind: "shrine",
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
	const dialog = await screen.findByRole("dialog", {
		name: "Shrine of insight",
	});
	expect(
		within(dialog).getByRole("button", { name: /Offer 15 gold/ }),
	).toBeVisible();
	expect(within(dialog).getByText("24 experience")).toBeVisible();
	expect(screen.getByLabelText("Player gold")).toHaveTextContent("Gold 20");
	expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
	await user.keyboard("1");
	await waitFor(() => expect(map).toHaveFocus());
	expect(screen.getByLabelText("Player gold")).toHaveTextContent("Gold 5");
	expect(screen.getByLabelText("Player level")).toHaveTextContent("Level 2");
	expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 1");
	expect(screen.getByRole("log")).toHaveTextContent("You offer 15 gold");
	await user.keyboard("e");
	expect(
		screen.queryByRole("dialog", { name: "Shrine of insight" }),
	).not.toBeInTheDocument();
	expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 1");
});
