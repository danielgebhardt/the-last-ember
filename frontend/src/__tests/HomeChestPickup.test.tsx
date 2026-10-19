import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as GameState from "../domain/game/GameState";
import { createBag } from "../domain/items/Bag";
import type { DungeonObject } from "../domain/objects/DungeonObject";
import {
	renderHome,
	resetHomeTestState,
	stubDungeonRun,
} from "./HomeTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import Home from "./TestHome";

const chest: DungeonObject = {
	id: "floor:1:object:chest:1",
	kind: "chest",
	floorNumber: 1,
	coordinate: { row: 1, col: 1 },
	activated: false,
};
const setup = (overrides: Partial<GameState.GameState> = {}) => {
	stubDungeonRun(createCorridorEncounter());
	const create = GameState.createGameState;
	vi.spyOn(GameState, "createGameState").mockImplementationOnce((run) => ({
		...create(run),
		objects: [chest],
		...overrides,
	}));
	renderHome(<Home />);
	screen.getByLabelText("Dungeon map", { exact: true }).focus();
	return userEvent.setup();
};
const waitForPickupClosed = () =>
	waitFor(() =>
		expect(
			screen.queryByRole("dialog", { name: "Pick up items" }),
		).not.toBeInTheDocument(),
	);
afterEach(resetHomeTestState);

describe("Chest loot through E", () => {
	it.each(["keyboard", "mouse"])(
		"opens once and selects its reward through %s without G",
		async (method) => {
			const user = setup();
			await user.keyboard("e");
			expect(
				await screen.findByRole("dialog", { name: "Pick up items" }),
			).toBeVisible();
			expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 1");
			await user.keyboard("{Escape}");
			await waitForPickupClosed();
			expect(
				screen.getByLabelText("Dungeon map", { exact: true }),
			).toHaveFocus();
			await user.keyboard("e");
			await screen.findByRole("dialog", { name: "Pick up items" });
			await waitFor(() =>
				expect(
					screen.getByRole("heading", { name: "Pick up items" }),
				).toHaveFocus(),
			);
			expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 1");
			if (method === "keyboard") await user.keyboard("1");
			else await user.click(screen.getByRole("button", { name: /^Pick up / }));
			await waitForPickupClosed();
			expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 2");
			expect(screen.getByRole("log")).toHaveTextContent(/pick up|equip/i);
			expect(
				screen.getByRole("log").textContent?.match(/You open the chest/g),
			).toHaveLength(1);
		},
	);
	it("offers remaining chest loot alongside an adjacent door and browses without a turn", async () => {
		const user = setup({
			objects: [
				{ ...chest, activated: true },
				{
					id: "door",
					kind: "door",
					activated: false,
					floorNumber: 1,
					coordinate: { row: 1, col: 2 },
				},
			],
			floorItems: [
				{
					item: { id: "remaining", kind: "healing-potion" },
					floorNumber: 1,
					coordinate: chest.coordinate,
				},
			],
		});
		await user.keyboard("e");
		await screen.findByRole("dialog", { name: "Interact with surroundings" });
		await waitFor(() =>
			expect(
				screen.getByRole("heading", { name: "Interact with surroundings" }),
			).toHaveFocus(),
		);
		await user.keyboard("2"); // The reachable door precedes a spent chest.
		expect(
			await screen.findByRole("dialog", { name: "Pick up items" }),
		).toBeVisible();
		await waitFor(() =>
			expect(
				screen.getByRole("heading", { name: "Pick up items" }),
			).toHaveFocus(),
		);
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
		expect(
			screen.getByRole("button", { name: "Pick up Healing potion, item 1" }),
		).toBeVisible();
	});
	it("opens an adjacent chest without remote pickup, then browses after moving onto its tile", async () => {
		const user = setup({
			objects: [{ ...chest, coordinate: { row: 1, col: 2 } }],
		});
		await user.keyboard("e");
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 1");
		await user.keyboard("de");
		expect(
			await screen.findByRole("dialog", { name: "Pick up items" }),
		).toBeVisible();
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 2");
	});
	it("keeps remaining chest loot when a full bag rejects pickup", async () => {
		const user = setup({
			objects: [{ ...chest, activated: true }],
			floorItems: [
				{
					item: { id: "remaining", kind: "short-sword" },
					floorNumber: 1,
					coordinate: chest.coordinate,
				},
			],
			bag: createBag(
				Array.from({ length: 27 }, (_, i) => ({
					id: `full:${i}`,
					kind: "short-sword",
				})),
			),
		});
		await user.keyboard("e");
		await screen.findByRole("dialog", { name: "Pick up items" });
		await waitFor(() =>
			expect(
				screen.getByRole("heading", { name: "Pick up items" }),
			).toHaveFocus(),
		);
		await user.keyboard("1");
		expect(screen.getByRole("alert")).toHaveTextContent(/bag.*full/i);
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
		expect(
			screen.getByRole("button", { name: "Pick up Short sword, item 1" }),
		).toBeVisible();
	});
	it("does not open pickup when the chest-opening turn kills the player", async () => {
		const user = setup({
			player: { health: 1, maxHealth: 10 },
			monsters: [
				{
					id: "1:1",
					kind: "goblin",
					floorNumber: 1,
					coordinate: { row: 1, col: 2 },
					health: 4,
					intent: { type: "idle" },
				},
			],
		});
		await user.keyboard("e");
		expect(
			await screen.findByRole("dialog", { name: "You died" }),
		).toBeVisible();
		expect(
			screen.queryByRole("dialog", { name: "Pick up items" }),
		).not.toBeInTheDocument();
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 1");
	});
});
