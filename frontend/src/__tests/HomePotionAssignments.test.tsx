import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as GameState from "../domain/game/GameState";
import { createBag } from "../domain/items/Bag";
import {
	enterDungeonFromTown,
	renderHome as render,
	resetHomeTestState,
	stubDungeonRun,
} from "./HomeTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import Home from "./TestHome";

const setup = async (assignedSlot?: 1 | 2 | 3 | 4) => {
	stubDungeonRun(createCorridorEncounter());
	const create = GameState.createGameState;
	vi.spyOn(GameState, "createGameState").mockImplementationOnce((run) => ({
		...create(run),
		player: { health: 7, maxHealth: 10 },
		potionHotbar: [
			assignedSlot === 1 ? "healing-potion" : null,
			assignedSlot === 2 ? "healing-potion" : null,
			assignedSlot === 3 ? "healing-potion" : null,
			assignedSlot === 4 ? "healing-potion" : null,
		],
		bag: createBag([
			{ id: "potion:1", kind: "healing-potion" },
			{ id: "potion:2", kind: "healing-potion" },
		]),
		monsters: [
			{
				intent: { type: "idle" as const },
				id: "1:1",
				kind: "goblin",
				floorNumber: 1,
				coordinate: { row: 1, col: 2 },
				health: 4,
			},
		],
	}));
	render(<Home />);
	const user = userEvent.setup();
	await user.click(screen.getByRole("button", { name: "Character" }));
	const panel = within(
		await screen.findByRole("dialog", { name: "The Adventurer's Ledger" }),
	);
	await user.click(
		panel.getByRole("button", { name: "Healing potion, slot 1" }),
	);
	return { user, panel };
};
afterEach(resetHomeTestState);
describe("Assigning potion shortcuts in Character", () => {
	it("reflects an existing assignment when inspecting a carried potion", async () => {
		const { panel } = await setup(3);
		expect(
			panel.getByRole("button", { name: "Assign to potion slot 3" }),
		).toHaveAttribute("aria-pressed", "true");
		expect(
			panel.getByRole("button", { name: "Assign to potion slot 2" }),
		).toHaveAttribute("aria-pressed", "false");
		expect(panel.getByLabelText("Potion slot 3 assignment")).toHaveTextContent(
			"Healing potion · Slot 3 · 2 carried",
		);
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
	});
	it("assigns, moves, and clears a kind for free while showing the carried count", async () => {
		const { user, panel } = await setup();
		const assign = panel.getByRole("button", {
			name: "Assign to potion slot 2",
		});
		assign.focus();
		await user.keyboard("{Enter}");
		expect(assign).toHaveAttribute("aria-pressed", "true");
		expect(assign).toHaveFocus();
		const summary = within(
			panel.getByRole("region", { name: "Potion shortcuts" }),
		);
		expect(
			summary.getByLabelText("Potion slot 2 assignment"),
		).toHaveTextContent("Healing potion · Slot 2 · 2 carried");
		await user.click(
			panel.getByRole("button", { name: "Assign to potion slot 4" }),
		);
		expect(
			summary.getByLabelText("Potion slot 2 assignment"),
		).toHaveTextContent("Empty");
		expect(
			summary.getByLabelText("Potion slot 4 assignment"),
		).toHaveTextContent("Healing potion · Slot 4 · 2 carried");
		await user.click(
			summary.getByRole("button", { name: "Clear potion slot 4" }),
		);
		expect(
			summary.getByLabelText("Potion slot 4 assignment"),
		).toHaveTextContent("Empty");
		expect(panel.getByLabelText("Bag capacity")).toHaveTextContent("1 / 27");
		expect(panel.getByLabelText("Character health")).toHaveTextContent(
			"Health 7 / 10",
		);
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
	});
	it("retains an unavailable assignment after dropping the last copy and restores it on pickup", async () => {
		const { user, panel } = await setup();
		await user.click(
			panel.getByRole("button", { name: "Assign to potion slot 1" }),
		);
		await user.click(panel.getByRole("button", { name: "Drop item" }));
		await user.click(
			panel.getByRole("button", { name: "Healing potion, slot 1" }),
		);
		await user.click(panel.getByRole("button", { name: "Drop item" }));
		expect(panel.getByLabelText("Potion slot 1 assignment")).toHaveTextContent(
			"Healing potion · Slot 1 · 0 carried",
		);
		await user.click(
			panel.getByRole("button", { name: "Pick up Healing potion, item 1" }),
		);
		expect(panel.getByLabelText("Potion slot 1 assignment")).toHaveTextContent(
			"Healing potion · Slot 1 · 1 carried",
		);
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 3");
	});
	it("resets assignments on New Dungeon and offers no assignment actions on gear", async () => {
		const { user, panel } = await setup();
		await user.click(
			panel.getByRole("button", { name: "Assign to potion slot 3" }),
		);
		await user.keyboard("{Escape}");
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
		);
		await user.click(screen.getByRole("button", { name: "New Dungeon" }));
		await user.click(screen.getByRole("button", { name: "Start new dungeon" }));
		await enterDungeonFromTown(user);
		await user.keyboard("i");
		const fresh = within(
			await screen.findByRole("dialog", { name: "The Adventurer's Ledger" }),
		);
		expect(fresh.getByLabelText("Potion slot 3 assignment")).toHaveTextContent(
			"Greater healing potion · Slot 3 · 0 carried",
		);
		await user.click(
			fresh.getByRole("button", { name: "Main hand: Short sword" }),
		);
		expect(
			fresh.queryByRole("button", { name: /Assign to potion slot/ }),
		).not.toBeInTheDocument();
	});
});
