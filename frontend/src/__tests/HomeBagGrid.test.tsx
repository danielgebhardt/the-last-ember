import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as GameState from "../domain/game/GameState";
import { createBag } from "../domain/items/Bag";
import { bagWithSpareGear } from "./CarriedGearTestHelpers";
import {
	renderHome as render,
	resetHomeTestState,
	stubDungeonRun,
} from "./HomeTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import Home from "./TestHome";

const setup = async (bag = bagWithSpareGear()) => {
	const create = GameState.createGameState;
	vi.spyOn(GameState, "createGameState").mockImplementationOnce((run) => ({
		...create(run),
		bag,
	}));
	stubDungeonRun(createCorridorEncounter());
	render(<Home />);
	const user = userEvent.setup();
	await user.click(screen.getByRole("button", { name: "Character" }));
	return {
		user,
		panel: within(
			await screen.findByRole("dialog", { name: "The Adventurer's Ledger" }),
		),
	};
};
afterEach(resetHomeTestState);
describe("Visual bag and shared item details", () => {
	it("shows all 27 slots with occupied item buttons and non-interactive empty slots", async () => {
		const { panel } = await setup();
		const bag = within(panel.getByRole("region", { name: "Bag" }));
		expect(bag.getAllByRole("listitem")).toHaveLength(27);
		expect(bag.getAllByRole("button")).toHaveLength(2);
		expect(bag.getByLabelText("Empty bag slot 3")).toBeVisible();
		expect(bag.getByLabelText("Empty bag slot 27")).toBeVisible();
	});
	it("shows two bottles in one slot and keeps the remaining bottle after dropping one", async () => {
		const { user, panel } = await setup(
			createBag([
				{ id: "heal:1", kind: "healing-potion" },
				{ id: "heal:2", kind: "healing-potion" },
			]),
		);
		const bag = within(panel.getByRole("region", { name: "Bag" }));
		expect(bag.getByLabelText("Bag capacity")).toHaveTextContent(
			"1 / 27 slots",
		);
		const stack = bag.getByRole("button", { name: "Healing potion, slot 1" });
		expect(stack).toHaveAccessibleDescription(/^2 carried/);
		expect(bag.getAllByRole("button")).toHaveLength(1);
		await user.click(stack);
		await user.click(panel.getByRole("button", { name: "Drop item" }));
		expect(
			bag.getByRole("button", { name: "Healing potion, slot 1" }),
		).toBeVisible();
		expect(bag.getByLabelText("Bag capacity")).toHaveTextContent(
			"1 / 27 slots",
		);
	});
	it("uses one details area and only one selection across bag and equipped gear", async () => {
		const { user, panel } = await setup();
		const carried = panel.getByRole("button", { name: "Iron sword, slot 1" });
		const equipped = panel.getByRole("button", {
			name: "Main hand: Short sword",
		});
		await user.click(carried);
		expect(carried).toHaveAttribute("aria-pressed", "true");
		await user.click(equipped);
		expect(carried).toHaveAttribute("aria-pressed", "false");
		expect(equipped).toHaveAttribute("aria-pressed", "true");
		expect(panel.getAllByRole("region", { name: "Item details" })).toHaveLength(
			1,
		);
		const details = within(panel.getByRole("region", { name: "Item details" }));
		expect(details.getByText("Short sword")).toBeVisible();
		expect(
			details.getByRole("button", { name: "Unequip main hand" }),
		).toBeVisible();
		expect(
			details.queryByRole("button", { name: "Drop item" }),
		).not.toBeInTheDocument();
		await user.click(carried);
		expect(equipped).toHaveAttribute("aria-pressed", "false");
		expect(
			details.queryByRole("button", { name: "Unequip main hand" }),
		).not.toBeInTheDocument();
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
	});
	it("does not show stale details or highlight a swapped item that has a different identity", async () => {
		const { user, panel } = await setup();
		await user.click(panel.getByRole("button", { name: "Iron sword, slot 1" }));
		await user.click(panel.getByRole("button", { name: "Equip on main hand" }));
		expect(
			panel.queryByRole("region", { name: "Item details" }),
		).not.toBeInTheDocument();
		expect(
			panel.getByRole("button", { name: "Short sword, slot 1" }),
		).toHaveAttribute("aria-pressed", "false");
		expect(panel.getByRole("heading", { name: "Bag" })).toHaveFocus();
	});
});
