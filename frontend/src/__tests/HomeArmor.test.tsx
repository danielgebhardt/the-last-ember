import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as GameState from "../domain/game/GameState";
import { createBag } from "../domain/items/Bag";
import {
	renderHome,
	resetHomeTestState,
	stubDungeonRun,
} from "./HomeTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import Home from "./TestHome";

afterEach(resetHomeTestState);
describe("Character armor slots", () => {
	it.each([
		["Leather armor", "Chest", "chest", "Chain armor"],
		["Leather cap", "Head", "head", "Iron helmet"],
	] as const)(
		"equips and upgrades %s using the shared details",
		async (name, label, slot, upgrade) => {
			const run = createCorridorEncounter();
			stubDungeonRun(run);
			const create = GameState.createGameState;
			vi.spyOn(GameState, "createGameState").mockImplementationOnce((run) => ({
				...create(run),
				monsters: [],
				bag: createBag([
					{
						id: "leather",
						kind: slot === "chest" ? "leather-armor" : "leather-cap",
					},
					{
						id: "metal",
						kind: slot === "chest" ? "chain-armor" : "iron-helmet",
					},
				]),
			}));
			renderHome(<Home />);
			const user = userEvent.setup();
			await user.keyboard("i");
			const dialog = within(
				await screen.findByRole("dialog", { name: "The Adventurer's Ledger" }),
			);
			expect(
				dialog.getByRole("button", { name: `${label}: empty` }),
			).toBeVisible();
			await user.click(dialog.getByRole("button", { name: `${name}, slot 1` }));
			await user.click(
				dialog.getByRole("button", { name: `Equip on ${slot}` }),
			);
			expect(
				dialog.getByRole("button", { name: `${label}: ${name}` }),
			).toBeVisible();
			expect(dialog.getByLabelText("Character armor")).toHaveTextContent(
				"Armor 2",
			);
			await user.click(
				dialog.getByRole("button", { name: `${upgrade}, slot 1` }),
			);
			await user.click(
				dialog.getByRole("button", { name: `Equip on ${slot}` }),
			);
			expect(
				dialog.getByRole("button", { name: `${label}: ${upgrade}` }),
			).toBeVisible();
			expect(dialog.getByLabelText("Character armor")).toHaveTextContent(
				"Armor 3",
			);
			await user.click(
				dialog.getByRole("button", { name: `${label}: ${upgrade}` }),
			);
			await user.click(dialog.getByRole("button", { name: `Unequip ${slot}` }));
			expect(
				dialog.getByRole("button", { name: `${label}: empty` }),
			).toBeVisible();
			expect(
				dialog.getByRole("status", { name: "Character activity" }),
			).toHaveTextContent("Turn 3");
		},
	);
});
