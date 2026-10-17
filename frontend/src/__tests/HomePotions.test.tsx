import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as GameState from "../domain/game/GameState";
import { createBag } from "../domain/items/Bag";
import {
	inspectEndedRun,
	renderHome as render,
	resetHomeTestState,
	stubDungeonRun,
} from "./HomeTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import Home from "./TestHome";

const renderPotionRun = (health: number, withMonster = false) => {
	stubDungeonRun(createCorridorEncounter());
	const create = GameState.createGameState;
	vi.spyOn(GameState, "createGameState").mockImplementationOnce((run) => ({
		...create(run),
		player: { health, maxHealth: 10 },
		bag: createBag([
			{ id: "potion:1", kind: "healing-potion" },
			{ id: "potion:2", kind: "healing-potion" },
		]),
		monsters: withMonster
			? [
					{
						intent: { type: "idle" as const },
						id: "1:1",
						kind: "goblin",
						floorNumber: 1,
						coordinate: { row: 1, col: 2 },
						health: 4,
					},
				]
			: [],
	}));
	render(<Home />);
	return userEvent.setup();
};
const selectPotion = async (user: ReturnType<typeof userEvent.setup>) => {
	await user.click(screen.getByRole("button", { name: "Character" }));
	const panel = within(
		await screen.findByRole("dialog", { name: "Character" }),
	);
	await waitFor(() =>
		expect(
			panel.getByRole("heading", { name: "Character", level: 2 }),
		).toHaveFocus(),
	);
	await user.click(
		panel.getByRole("button", { name: "Healing potion, slot 1" }),
	);
	return panel;
};
afterEach(resetHomeTestState);

describe("Healing potions in Character", () => {
	it("explains the potion, drinks one copy, and shows recovery before retaliation", async () => {
		const user = renderPotionRun(8, true);
		const panel = await selectPotion(user);
		expect(panel.getByText(/Restores up to 5 health/)).toBeVisible();
		expect(
			panel.queryByRole("button", { name: /Equip on/ }),
		).not.toBeInTheDocument();
		await user.click(panel.getByRole("button", { name: "Drink potion" }));
		expect(panel.getByLabelText("Character health")).toHaveTextContent(
			"Health 9 / 10",
		);
		expect(panel.getByLabelText("Bag capacity")).toHaveTextContent("1 / 27");
		const feedback = panel.getByRole("status", { name: "Character activity" });
		expect(feedback).toHaveTextContent("Turn 1");
		expect(feedback.textContent).toMatch(
			/recover 2 health.*hits you for 1 damage/,
		);
		expect(panel.getByRole("heading", { name: "Bag" })).toHaveFocus();
		await user.keyboard("{Escape}");
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
		);
		expect(screen.getByRole("log")).toHaveTextContent(
			"You drink Healing potion and recover 2 health.",
		);
		await user.click(screen.getByRole("button", { name: "New Dungeon" }));
		await user.click(screen.getByRole("button", { name: "Start new dungeon" }));
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
		expect(screen.getByRole("log")).not.toHaveTextContent("You drink");
		await user.click(screen.getByRole("button", { name: "Character" }));
		const fresh = within(
			await screen.findByRole("dialog", { name: "Character" }),
		);
		expect(fresh.getByLabelText("Character health")).toHaveTextContent(
			"Health 10 / 10",
		);
		expect(
			fresh.getByRole("button", { name: "Healing potion, slot 1" }),
		).toBeVisible();
	});
	it("shows a full-health rejection while retaining both potions and turn count", async () => {
		const user = renderPotionRun(10);
		const panel = await selectPotion(user);
		await user.click(panel.getByRole("button", { name: "Drink potion" }));
		expect(panel.getByRole("alert")).toHaveTextContent(
			"already at full health",
		);
		expect(panel.getByLabelText("Bag capacity")).toHaveTextContent("1 / 27");
		expect(
			panel.getByRole("status", { name: "Character activity" }),
		).toHaveTextContent("Turn 0");
	});
	it("allows inspection after death but disables drinking and dropping", async () => {
		const user = renderPotionRun(0);
		await inspectEndedRun(user);
		const panel = await selectPotion(user);
		expect(panel.getByRole("button", { name: "Drink potion" })).toBeDisabled();
		expect(panel.getByRole("button", { name: "Drop item" })).toBeDisabled();
	});
});
