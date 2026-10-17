import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import * as GameState from "../domain/game/GameState";
import {
	enterDungeonFromTown,
	renderHome as render,
	resetHomeTestState,
	stubDungeonRun,
} from "./HomeTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import Home from "./TestHome";

afterEach(resetHomeTestState);
it("returns focus to gameplay after New Dungeon so G works without clicking the map", async () => {
	stubDungeonRun(createCorridorEncounter());
	const create = GameState.createGameState;
	vi.spyOn(GameState, "createGameState").mockImplementation((run) => ({
		...create(run),
		floorItems: [
			{
				item: { id: "loot", kind: "healing-potion" },
				floorNumber: 1,
				coordinate: { row: 1, col: 2 },
			},
		],
	}));
	render(<Home />);
	const user = userEvent.setup();
	await user.click(screen.getByRole("button", { name: "New Dungeon" }));
	await user.click(screen.getByRole("button", { name: "Start new dungeon" }));
	await enterDungeonFromTown(user);
	expect(screen.getByLabelText("Dungeon map", { exact: true })).toHaveFocus();
	await user.keyboard("{ArrowRight}g");
	expect(screen.getByRole("log")).toHaveTextContent(
		"You pick up Healing potion.",
	);
	expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 2");
});
