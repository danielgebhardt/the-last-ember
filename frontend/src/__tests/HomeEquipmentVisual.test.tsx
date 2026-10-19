import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import {
	renderHome as render,
	resetHomeTestState,
	stubDungeonRun,
} from "./HomeTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import Home from "./TestHome";

const setup = async () => {
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
describe("Visual equipment inspection", () => {
	it("selects equipped gear for free and shows its contribution and unequip action", async () => {
		const { user, panel } = await setup();
		expect(
			panel.queryByRole("button", { name: "Unequip main hand" }),
		).not.toBeInTheDocument();
		const weapon = panel.getByRole("button", {
			name: "Main hand: Short sword",
		});
		await user.click(weapon);
		expect(weapon).toHaveAttribute("aria-pressed", "true");
		expect(panel.getByText(/simple, dependable blade/)).toBeVisible();
		expect(panel.getByText("Attack bonus +1")).toBeVisible();
		expect(
			panel.getByRole("button", { name: "Unequip main hand" }),
		).toBeEnabled();
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
		await user.click(
			panel.getByRole("button", { name: "Off hand: Wooden shield" }),
		);
		expect(weapon).toHaveAttribute("aria-pressed", "false");
		expect(
			panel.getByRole("button", { name: "Unequip off hand" }),
		).toBeEnabled();
	});
	it("shows an explicit empty slot after unequipping without leaving a stale action", async () => {
		const { user, panel } = await setup();
		await user.click(
			panel.getByRole("button", { name: "Main hand: Short sword" }),
		);
		await user.click(panel.getByRole("button", { name: "Unequip main hand" }));
		expect(panel.getByText("Main hand empty")).toBeVisible();
		expect(
			panel.queryByRole("button", { name: "Unequip main hand" }),
		).not.toBeInTheDocument();
		await user.click(panel.getByRole("button", { name: "Main hand: empty" }));
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 1");
	});
});
