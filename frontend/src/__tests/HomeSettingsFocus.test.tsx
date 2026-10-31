import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import * as GameState from "../domain/game/GameState";
import {
	enterDungeonFromTown,
	openCustomAdventure,
	renderHome,
	resetHomeTestState,
	stubDungeonRun,
	waitForNewAdventureClosed,
} from "./HomeTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import Home from "./TestHome";

afterEach(resetHomeTestState);

it("returns all gameplay shortcuts to the map after starting a custom adventure with Enter", async () => {
	stubDungeonRun(createCorridorEncounter());
	const create = GameState.createGameState;
	vi.spyOn(GameState, "createGameState").mockImplementation((run) => ({
		...create(run),
		player: { health: 2, maxHealth: 10 },
		floorItems: [
			{
				item: { id: "potion", kind: "healing-potion" },
				floorNumber: 1,
				coordinate: { row: 1, col: 2 },
			},
		],
	}));
	renderHome(<Home />);
	const user = userEvent.setup();
	await openCustomAdventure(user);
	const rows = screen.getByRole("textbox", { name: "Rows" });
	await user.clear(rows);
	await user.type(rows, "20{Enter}");
	await enterDungeonFromTown(user);
	await waitForNewAdventureClosed();
	await waitFor(() =>
		expect(screen.getByLabelText("Dungeon map", { exact: true })).toHaveFocus(),
	);
	await user.keyboard("{ArrowRight}g1h ");
	expect(screen.getByRole("log")).toHaveTextContent(
		"You pick up Healing potion.",
	);
	expect(screen.getByRole("log")).toHaveTextContent(/heal/i);
	expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 5");
});

it("keeps an invalid configuration in the New adventure dialog instead of restoring gameplay focus", async () => {
	stubDungeonRun(createCorridorEncounter());
	renderHome(<Home />);
	const user = userEvent.setup();
	await openCustomAdventure(user);
	const rows = screen.getByRole("textbox", { name: "Rows" });
	await user.clear(rows);
	await user.type(rows, "1{Enter}");
	expect(screen.getByRole("dialog", { name: "New adventure" })).toBeVisible();
	expect(rows).toHaveFocus();
	expect(screen.getByRole("alert")).toHaveTextContent(
		"Enter a whole number from 10 to 40",
	);
});
