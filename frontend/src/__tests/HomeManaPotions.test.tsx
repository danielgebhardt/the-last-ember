import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as GameState from "../domain/game/GameState";
import {
	renderHome,
	resetHomeTestState,
	stubDungeonRun,
} from "./HomeTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import Home from "./TestHome";

afterEach(resetHomeTestState);
describe("Mana potion controls", () => {
	it("picks up, assigns, inspects and uses a mana potion with the normal shortcut", async () => {
		const run = createCorridorEncounter();
		stubDungeonRun(
			run,
			[],
			[
				{
					item: { id: "mana", kind: "mana-potion" },
					floorNumber: 1,
					coordinate: run.playerCoordinate,
				},
			],
		);
		const create = GameState.createGameState;
		vi.spyOn(GameState, "createGameState").mockImplementationOnce((run) => ({
			...create(run),
			mana: 2,
			floorItems: [
				{
					item: { id: "mana", kind: "mana-potion" },
					floorNumber: 1,
					coordinate: run.playerCoordinate,
				},
			],
		}));
		renderHome(<Home />);
		screen.getByLabelText("Dungeon map", { exact: true }).focus();
		const user = userEvent.setup();
		await user.keyboard("gi");
		const dialog = await screen.findByRole("dialog", {
			name: "The Adventurer's Ledger",
		});
		await user.click(
			within(dialog).getByRole("button", { name: "Mana potion, slot 2" }),
		);
		expect(within(dialog).getByText("Recovery up to 5 mana")).toBeVisible();
		await user.keyboard("i2");
		expect(screen.getByLabelText("Player mana")).toHaveTextContent(
			"Mana 7 / 10",
		);
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 2");
		expect(screen.getByRole("log")).toHaveTextContent(
			"Mana potion and recover 5 mana",
		);
		expect(
			screen.getByRole("button", {
				name: "Potion slot 2: Mana potion, 1 carried",
			}),
		).toBeVisible();
	});
});
