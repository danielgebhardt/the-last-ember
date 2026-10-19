import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as GameState from "../domain/game/GameState";
import { createBag } from "../domain/items/Bag";
import { renderEncounter } from "./HomeEncounterTestHelpers";
import {
	inspectEndedRun,
	renderHome as render,
	resetHomeTestState,
	stubDungeonRun,
} from "./HomeTestHelpers";
import Home from "./TestHome";
import { createThreeFloorTraversalRun } from "./testhelpers";

afterEach(resetHomeTestState);
const openCharacter = async (user: ReturnType<typeof userEvent.setup>) => {
	await user.click(screen.getByRole("button", { name: "Character" }));
	const panel = await screen.findByRole("dialog", {
		name: "The Adventurer's Ledger",
	});
	await waitFor(() =>
		expect(
			within(panel).getByRole("heading", { name: "The Adventurer's Ledger" }),
		).toHaveFocus(),
	);
	return within(panel);
};

describe("Changing gear in Character", () => {
	it("equips selected gear, updates values, and shows the monster response without closing", async () => {
		const { user } = renderEncounter();
		const panel = await openCharacter(user);
		await user.click(panel.getByRole("button", { name: "Iron sword, slot 1" }));
		await user.click(panel.getByRole("button", { name: "Equip on main hand" }));
		expect(
			screen.getByRole("dialog", { name: "The Adventurer's Ledger" }),
		).toBeVisible();
		expect(
			within(panel.getByRole("region", { name: "Main hand" })).getByText(
				"Iron sword",
			),
		).toBeVisible();
		expect(
			panel.getByRole("button", { name: "Short sword, slot 1" }),
		).toBeVisible();
		expect(panel.getByLabelText("Character attack")).toHaveTextContent(
			"Attack 2–4",
		);
		expect(panel.getByLabelText("Character health")).toHaveTextContent(
			"Health 9 / 10",
		);
		const feedback = panel.getByRole("status", { name: "Character activity" });
		expect(feedback).toHaveTextContent("Turn 1");
		expect(feedback).toHaveTextContent("You equip Iron sword");
		expect(feedback).toHaveTextContent("returning Short sword to your bag");
		expect(feedback).toHaveTextContent("The goblin hits you for 1 damage.");
		expect(panel.getByRole("heading", { name: "Bag" })).toHaveFocus();
		await user.keyboard("{ArrowRight} ");
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 1");
	});
	it("unequips and re-equips using the keyboard, with one turn per successful action", async () => {
		stubDungeonRun(createThreeFloorTraversalRun());
		render(<Home />);
		const user = userEvent.setup();
		const panel = await openCharacter(user);
		await user.click(
			panel.getByRole("button", { name: "Main hand: Short sword" }),
		);
		const unequip = panel.getByRole("button", { name: "Unequip main hand" });
		unequip.focus();
		await user.keyboard("{Enter}");
		expect(panel.getByText("Main hand empty")).toBeVisible();
		expect(panel.getByLabelText("Character attack")).toHaveTextContent(
			"Attack 1–2",
		);
		expect(panel.getByLabelText("Bag capacity")).toHaveTextContent("3 / 27");
		expect(panel.getByRole("heading", { name: "Equipment" })).toHaveFocus();
		expect(
			panel.getByRole("status", { name: "Character activity" }),
		).toHaveTextContent("You put Short sword in your bag.");
		await user.click(
			panel.getByRole("button", { name: "Short sword, slot 3" }),
		);
		const equip = panel.getByRole("button", { name: "Equip on main hand" });
		equip.focus();
		await user.keyboard(" ");
		expect(panel.getByLabelText("Character attack")).toHaveTextContent(
			"Attack 1–3",
		);
		expect(panel.getByLabelText("Bag capacity")).toHaveTextContent("2 / 27");
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 2");
	});
	it("explains a full-bag rejection without changing values or the turn", async () => {
		const create = GameState.createGameState;
		vi.spyOn(GameState, "createGameState").mockImplementationOnce((run) => ({
			...create(run),
			bag: createBag(
				Array.from({ length: 27 }, (_, index) => ({
					id: `sword:${index}`,
					kind: "short-sword",
				})),
			),
		}));
		stubDungeonRun(createThreeFloorTraversalRun());
		render(<Home />);
		const user = userEvent.setup();
		const panel = await openCharacter(user);
		await user.click(
			panel.getByRole("button", { name: "Main hand: Short sword" }),
		);
		await user.click(panel.getByRole("button", { name: "Unequip main hand" }));
		expect(panel.getByRole("alert")).toHaveTextContent("Your bag is full");
		expect(panel.getByLabelText("Character attack")).toHaveTextContent(
			"Attack 1–3",
		);
		expect(panel.getByLabelText("Bag capacity")).toHaveTextContent("27 / 27");
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
		await user.click(
			panel.getByRole("button", { name: "Short sword, slot 1" }),
		);
		await user.click(panel.getByRole("button", { name: "Equip on main hand" }));
		expect(panel.queryByRole("alert")).not.toBeInTheDocument();
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 1");
	});
	it("shows fatal retaliation and disables gear changes while still allowing inspection", async () => {
		const { user } = renderEncounter(1);
		let panel = await openCharacter(user);
		await user.click(panel.getByRole("button", { name: "Iron sword, slot 1" }));
		await user.click(panel.getByRole("button", { name: "Equip on main hand" }));
		await inspectEndedRun(user);
		panel = await openCharacter(user);
		expect(panel.getByRole("alert")).toHaveTextContent("You died.");
		expect(panel.getByLabelText("Character health")).toHaveTextContent(
			"Health 0 / 10",
		);
		expect(
			panel.getByRole("status", { name: "Character activity" }),
		).toHaveTextContent("You die.");
		await user.click(
			panel.getByRole("button", { name: "Main hand: Iron sword" }),
		);
		expect(
			panel.getByRole("button", { name: "Unequip main hand" }),
		).toBeDisabled();
		await user.click(
			panel.getByRole("button", { name: "Off hand: Wooden shield" }),
		);
		expect(
			panel.getByRole("button", { name: "Unequip off hand" }),
		).toBeDisabled();
		await user.click(
			panel.getByRole("button", { name: "Short sword, slot 1" }),
		);
		expect(
			panel.getByRole("button", { name: "Equip on main hand" }),
		).toBeDisabled();
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 1");
		await user.keyboard("{Escape}");
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
		);
		expect(screen.getByRole("button", { name: "Character" })).toHaveFocus();
	});
});
