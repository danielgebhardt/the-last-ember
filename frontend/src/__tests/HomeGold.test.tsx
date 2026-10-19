import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import * as GameState from "../domain/game/GameState";
import { ThemeProvider } from "../settings/ThemeProvider";
import { resetHomeTestState, stubDungeonRun } from "./HomeTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import Home from "./TestHome";

afterEach(resetHomeTestState);
it("shows coins, collects them by walking and includes the total in Character", async () => {
	stubDungeonRun(createCorridorEncounter());
	const create = GameState.createGameState;
	vi.spyOn(GameState, "createGameState").mockImplementationOnce((run) => ({
		...create(run),
		monsters: [],
		floorItems: [],
		objects: [
			{
				id: "floor:1:object:gold:1",
				kind: "gold",
				floorNumber: 1,
				coordinate: { row: 1, col: 2 },
				activated: false,
			},
		],
	}));
	render(<Home initialFogConfiguration={{ enabled: false, radius: 6 }} />, {
		wrapper: ThemeProvider,
	});
	expect(
		screen.getByRole("cell", { name: "row1col2 - gold coins" }),
	).toBeVisible();
	screen.getByLabelText("Dungeon map", { exact: true }).focus();
	const user = userEvent.setup();
	await user.keyboard("d");
	expect(screen.getByLabelText("Player gold")).toHaveTextContent(
		`Gold ${GameState.STARTING_GOLD + 6}`,
	);
	await user.keyboard("a");
	expect(screen.getByRole("cell", { name: "row1col2 - floor" })).toBeVisible();
	await user.keyboard("i");
	const dialog = await screen.findByRole("dialog", {
		name: "The Adventurer's Ledger",
	});
	expect(
		within(dialog).getByText(
			new RegExp(`Gold ${GameState.STARTING_GOLD + 6} · Turn`),
		),
	).toBeVisible();
});
