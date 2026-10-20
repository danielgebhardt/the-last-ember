import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";
import type { GameState } from "../domain/game/GameState";
import Home from "../Home";
import { ThemeProvider } from "../settings/ThemeProvider";
import { corridorContinuationAdventure } from "./CorridorContinuationTestHelpers";
import { resetHomeTestState } from "./HomeTestHelpers";

const setup = (carryingEmber = false) => {
	const base = corridorContinuationAdventure();
	const state: GameState = {
		...base.state,
		monsters: [],
		effects: [],
		bag: {
			items: [
				{ id: "exit:1", kind: "exit-scroll" },
				{ id: "mana", kind: "mana-potion" },
				{ id: "exit:2", kind: "exit-scroll" },
			],
		},
		...(carryingEmber
			? {
					quest: { ...base.state.quest, cureRecovered: true },
					floorItems: [],
					escape: { startedTurn: 20, activatedFloors: [2] },
				}
			: {}),
	};
	render(<Home initialAdventure={{ ...base, state }} />, {
		wrapper: ThemeProvider,
	});
	return userEvent.setup();
};
afterEach(resetHomeTestState);
it("opens a one-use town portal, preserves the scroll stack and returns with Enter", async () => {
	const user = setup();
	await user.keyboard("c");
	await user.click(
		screen.getByRole("button", {
			name: "Town portal scroll, slot 1",
		}),
	);
	await user.click(
		screen.getByRole("button", { name: "Read town portal scroll" }),
	);
	await waitFor(() =>
		expect(
			screen.queryByRole("dialog", { name: "The Adventurer's Ledger" }),
		).not.toBeInTheDocument(),
	);
	await waitFor(() =>
		expect(screen.getByLabelText("Town map", { exact: true })).toHaveFocus(),
	);
	expect(screen.getByLabelText("Town portal status")).toHaveTextContent(
		"floor 2",
	);
	expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 29");
	expect(screen.getByRole("log")).toHaveTextContent(
		"read a town portal scroll",
	);
	await user.keyboard("c");
	const stack = screen.getByRole("button", {
		name: "Town portal scroll, slot 1",
	});
	await user.click(stack);
	expect(
		screen.getByRole("button", { name: "Mana potion, slot 2" }),
	).toBeVisible();
	await user.click(
		screen.getByRole("button", { name: "Read town portal scroll" }),
	);
	expect(screen.getByRole("alert")).toHaveTextContent(
		"That can only be done in the dungeon.",
	);
	expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 29");
	expect(
		screen.getByRole("dialog", { name: "The Adventurer's Ledger" }),
	).toBeVisible();
	expect(stack).toBeInTheDocument();
	await user.keyboard("{Escape}");
	await user.keyboard("{Enter}");
	await waitFor(() =>
		expect(screen.getByLabelText("Dungeon map", { exact: true })).toHaveFocus(),
	);
	expect(screen.getByText("Floor 2 of 5", { exact: true })).toBeVisible();
	expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 29");
	expect(screen.getByRole("log")).toHaveTextContent("portal closes");
});
it("explains and disables reading while the ember is carried, including after restoration", async () => {
	const user = setup(true);
	await user.keyboard("c");
	await user.click(
		screen.getByRole("button", {
			name: "Town portal scroll, slot 1",
		}),
	);
	const details = within(screen.getByRole("region", { name: "Item details" }));
	const read = details.getByRole("button", {
		name: "Read town portal scroll",
	});
	expect(read).toBeDisabled();
	expect(read).toHaveAccessibleDescription(/carrying the Last Ember/);
	await user.click(read);
	expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 28");
	expect(
		details.queryByRole("group", { name: "Assign potion shortcut" }),
	).not.toBeInTheDocument();
});
