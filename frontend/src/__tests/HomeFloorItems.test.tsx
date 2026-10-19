import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as GameState from "../domain/game/GameState";
import { bagWithSpareGear } from "./CarriedGearTestHelpers";
import {
	renderHome as render,
	resetHomeTestState,
	stubDungeonRun,
} from "./HomeTestHelpers";
import Home from "./TestHome";
import { createThreeFloorTraversalRun } from "./testhelpers";

afterEach(resetHomeTestState);
describe("Picking up and dropping from Character", () => {
	it("drops then picks up the same item with one turn each and leaves background gameplay paused", async () => {
		stubDungeonRun(createThreeFloorTraversalRun());
		const create = GameState.createGameState;
		vi.spyOn(GameState, "createGameState").mockImplementationOnce((run) => ({
			...create(run),
			bag: bagWithSpareGear(),
		}));
		render(<Home />);
		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "Character" }));
		const panel = within(
			await screen.findByRole("dialog", { name: "The Adventurer's Ledger" }),
		);
		await user.click(panel.getByRole("button", { name: "Iron sword, slot 1" }));
		await user.click(panel.getByRole("button", { name: "Drop item" }));
		expect(panel.getByLabelText("Bag capacity")).toHaveTextContent("1 / 27");
		expect(
			panel.getByRole("button", { name: "Pick up Iron sword, item 1" }),
		).toBeVisible();
		expect(
			panel.getByRole("status", { name: "Character activity" }),
		).toHaveTextContent("You drop Iron sword.");
		await user.click(
			panel.getByRole("button", { name: "Pick up Iron sword, item 1" }),
		);
		expect(panel.getByLabelText("Bag capacity")).toHaveTextContent("2 / 27");
		expect(panel.getByText("No items on this tile.")).toBeVisible();
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 2");
	});
	it("offers all items at the player's tile without revealing items on another floor", async () => {
		const create = GameState.createGameState;
		vi.spyOn(GameState, "createGameState").mockImplementationOnce((run) => ({
			...create(run),
			floorItems: [
				{
					item: { id: "loot:1", kind: "short-sword" },
					floorNumber: 1,
					coordinate: { row: 1, col: 1 },
				},
				{
					item: { id: "loot:2", kind: "wooden-shield" },
					floorNumber: 1,
					coordinate: { row: 1, col: 1 },
				},
				{
					item: { id: "loot:3", kind: "iron-sword" },
					floorNumber: 2,
					coordinate: { row: 1, col: 1 },
				},
			],
		}));
		stubDungeonRun(createThreeFloorTraversalRun());
		render(<Home />);
		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "Character" }));
		const panel = within(
			await screen.findByRole("dialog", { name: "The Adventurer's Ledger" }),
		);
		const ground = within(panel.getByRole("region", { name: "On your tile" }));
		expect(ground.getAllByRole("button")).toHaveLength(2);
		expect(ground.queryByText("Iron sword")).not.toBeInTheDocument();
		await user.click(
			ground.getByRole("button", { name: "Pick up Short sword, item 1" }),
		);
		expect(ground.getAllByRole("button")).toHaveLength(1);
		await user.keyboard("{Escape}");
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
		);
	});
});
