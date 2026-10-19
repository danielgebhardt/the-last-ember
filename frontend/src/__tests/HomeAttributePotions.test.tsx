import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import * as GameState from "../domain/game/GameState";
import { ThemeProvider } from "../settings/ThemeProvider";
import { resetHomeTestState, stubDungeonRun } from "./HomeTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import Home from "./TestHome";

afterEach(resetHomeTestState);
it("uses a boost potion from a numbered shortcut and displays boosted mana and character attributes", async () => {
	stubDungeonRun(createCorridorEncounter());
	const create = GameState.createGameState;
	vi.spyOn(GameState, "createGameState").mockImplementationOnce((run) => ({
		...create(run),
		monsters: [],
		objects: [],
		floorItems: [],
		bag: { items: [{ id: "bag:intelligence", kind: "intelligence-potion" }] },
		potionHotbar: ["intelligence-potion", null, null, null],
	}));
	render(<Home />, { wrapper: ThemeProvider });
	const map = screen.getByLabelText("Dungeon map", { exact: true });
	map.focus();
	const user = userEvent.setup();
	await user.keyboard("1");
	expect(screen.getByLabelText("Player mana")).toHaveTextContent("10 / 10");
	expect(screen.getByRole("log")).toHaveTextContent(
		/Intelligence permanently increases by 1/,
	);
	await user.keyboard("c");
	await screen.findByRole("dialog", { name: "The Adventurer's Ledger" });
	expect(screen.getByLabelText("Character Intelligence")).toHaveTextContent(
		"Intelligence 11",
	);
	expect(screen.getByLabelText("Permanent potion gains")).toHaveTextContent(
		"INT +1",
	);
	expect(screen.getByLabelText("Character mana")).toHaveTextContent("10 / 10");
	await user.keyboard("{Escape}");
	await waitFor(() => expect(map).toHaveFocus());
});
