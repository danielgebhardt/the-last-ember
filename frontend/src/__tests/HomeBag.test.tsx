import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as GameState from "../domain/game/GameState";
import { type Bag, createBag } from "../domain/items/Bag";
import { bagWithSpareGear } from "./CarriedGearTestHelpers";
import {
	renderHome as render,
	resetHomeTestState,
	stubDungeonRun,
} from "./HomeTestHelpers";
import Home from "./TestHome";
import { createThreeFloorTraversalRun } from "./testhelpers";

const openBag = async (bag: Bag = bagWithSpareGear()) => {
	if (bag) {
		const create = GameState.createGameState;
		vi.spyOn(GameState, "createGameState").mockImplementationOnce((run) => ({
			...create(run),
			bag,
		}));
	}
	stubDungeonRun(createThreeFloorTraversalRun());
	render(<Home />);
	const user = userEvent.setup();
	await user.click(screen.getByRole("button", { name: "Character" }));
	const panel = within(
		await screen.findByRole("dialog", { name: "The Adventurer's Ledger" }),
	);
	return {
		user,
		panel,
		bagView: within(panel.getByRole("region", { name: "Bag" })),
	};
};
afterEach(resetHomeTestState);

describe("Character bag", () => {
	it("shows carried spares and used/available capacity separately from equipment", async () => {
		const { panel, bagView } = await openBag();
		expect(bagView.getByLabelText("Bag capacity")).toHaveTextContent(
			"2 / 27 slots",
		);
		expect(
			bagView.getByRole("button", { name: "Iron sword, slot 1" }),
		).toBeVisible();
		expect(
			bagView.getByRole("button", { name: "Wooden shield, slot 2" }),
		).toBeVisible();
		expect(
			within(panel.getByRole("region", { name: "Main hand" })).getByText(
				"Short sword",
			),
		).toBeVisible();
		expect(
			within(panel.getByRole("region", { name: "Item details" })).getByText(
				/Select an item in your bag or equipment/,
			),
		).toBeVisible();
	});
	it("shows the selected item's type, description, and contributions without equipping it", async () => {
		const { user, panel, bagView } = await openBag();
		await user.click(
			bagView.getByRole("button", { name: "Iron sword, slot 1" }),
		);
		const details = within(panel.getByRole("region", { name: "Item details" }));
		expect(details.getByText("Iron sword")).toBeVisible();
		expect(details.getByText("Weapon")).toBeVisible();
		expect(details.getByText(/heavier blade/)).toBeVisible();
		expect(details.getByText("Attack bonus +2")).toBeVisible();
		expect(panel.getByLabelText("Character attack")).toHaveTextContent(
			"Attack 1–3",
		);
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
	});
	it("selects item details with the keyboard while gameplay stays paused", async () => {
		const { user, panel, bagView } = await openBag();
		const sword = bagView.getByRole("button", { name: "Iron sword, slot 1" });
		sword.focus();
		await user.keyboard("{Enter}");
		expect(sword).toHaveAttribute("aria-pressed", "true");
		await user.tab();
		const shield = bagView.getByRole("button", {
			name: "Wooden shield, slot 2",
		});
		expect(shield).toHaveFocus();
		await user.keyboard(" ");
		expect(shield).toHaveAttribute("aria-pressed", "true");
		expect(sword).toHaveAttribute("aria-pressed", "false");
		const details = within(panel.getByRole("region", { name: "Item details" }));
		expect(details.getByText("Shield")).toBeVisible();
		expect(details.getByText("Armor 1")).toBeVisible();
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
		expect(screen.getByLabelText("row1col1 - player")).toBeInTheDocument();
	});
	it("shows an explicit empty state and all twenty-seven slots available", async () => {
		const { bagView } = await openBag(createBag());
		expect(bagView.getByText("Your bag is empty.")).toBeVisible();
		expect(bagView.getByLabelText("Bag capacity")).toHaveTextContent(
			"0 / 27 slots",
		);
		expect(bagView.queryByRole("button")).not.toBeInTheDocument();
	});
	it("shows a full bag without counting equipped gear against capacity", async () => {
		const bag = createBag(
			Array.from({ length: 27 }, (_, index) => ({
				id: `sword:${index}`,
				kind: "short-sword",
			})),
		);
		const { bagView } = await openBag(bag);
		expect(bagView.getByLabelText("Bag capacity")).toHaveTextContent(
			"27 / 27 slots",
		);
		expect(bagView.getAllByRole("button")).toHaveLength(27);
	});
	it("lets identical item kinds be inspected individually", async () => {
		const bag = createBag([
			{ id: "sword:1", kind: "short-sword" },
			{ id: "sword:2", kind: "short-sword" },
		]);
		const { user, bagView } = await openBag(bag);
		const first = bagView.getByRole("button", { name: "Short sword, slot 1" });
		const second = bagView.getByRole("button", { name: "Short sword, slot 2" });
		await user.click(first);
		expect(first).toHaveAttribute("aria-pressed", "true");
		await user.click(second);
		expect(second).toHaveAttribute("aria-pressed", "true");
		expect(first).toHaveAttribute("aria-pressed", "false");
	});
});
