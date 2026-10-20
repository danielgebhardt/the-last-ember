import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";
import { createAdventureSession } from "../components/game/useAdventureSession";
import { DEFAULT_FOG_CONFIGURATION } from "../domain/dungeon/RunConfiguration";
import { createBag } from "../domain/items/Bag";
import { createTownLocation } from "../domain/town/TownLocation";
import Home from "../Home";
import { ThemeProvider } from "../settings/ThemeProvider";
import { resetHomeTestState } from "./HomeTestHelpers";
import { COMPACT_TEST_CONFIGURATION as config } from "./TestRunConfiguration";

afterEach(resetHomeTestState);
it("opens on Equipped, lists bag items by tab, confirms one reforge and restores focus", async () => {
	const initial = createAdventureSession(
		123,
		config,
		DEFAULT_FOG_CONFIGURATION,
	);
	const state = {
		...initial.state,
		town: { ...createTownLocation(), coordinate: { row: 5, col: 20 } },
		gold: 400,
		bag: createBag([
			...initial.state.bag.items,
			{ id: "bag:helmet", kind: "steel-helmet", enchantment: 3 },
			{ id: "bag:cloak", kind: "warding-cloak" },
			{ id: "bag:plate", kind: "plate-armor" },
		]),
	};
	render(<Home initialAdventure={{ ...initial, state }} />, {
		wrapper: ThemeProvider,
	});
	const user = userEvent.setup();
	await user.click(screen.getByRole("button", { name: "Inspect Forge" }));
	const dialog = within(
		await screen.findByRole("dialog", { name: "Town forge" }),
	);
	expect(dialog.getByRole("tab", { name: "Equipped" })).toHaveAttribute(
		"aria-selected",
		"true",
	);
	const equipped = within(dialog.getByRole("tabpanel", { name: "Equipped" }));
	expect(equipped.getByText("Main hand")).toBeVisible();
	expect(equipped.getByText(/^\+1: Attack 1 →/)).toHaveTextContent(
		"+1: Attack 1 → 2",
	);

	await user.click(dialog.getByRole("tab", { name: "Body armor" }));
	const body = within(dialog.getByRole("tabpanel", { name: "Body armor" }));
	expect(body.getByText("Rare item: can't be reforged")).toBeVisible();
	expect(
		body.getByRole("button", { name: "Reforge Plate armor (Not enough gold)" }),
	).toBeDisabled();
	await user.click(dialog.getByRole("tab", { name: "Helmets" }));
	expect(dialog.getByText("Already +3")).toBeVisible();
	await user.click(dialog.getByRole("tab", { name: "Weapons" }));
	expect(dialog.getByText("No weapons in your bag.")).toBeVisible();

	await user.click(dialog.getByRole("tab", { name: "Equipped" }));
	await user.click(dialog.getByRole("button", { name: "Reforge Short sword" }));
	expect(
		dialog.getByRole("group", { name: "Confirm reforging" }),
	).toHaveTextContent("Reforge Short sword to +1 for 150 gold?");
	await user.click(dialog.getByRole("button", { name: "Cancel reforging" }));
	expect(dialog.getByText("Gold: 400")).toBeVisible();
	await user.click(dialog.getByRole("button", { name: "Reforge Short sword" }));
	await user.dblClick(
		dialog.getByRole("button", { name: "Confirm reforging" }),
	);
	expect(dialog.getByText("Gold: 250")).toBeVisible();
	expect(
		dialog.getByRole("button", {
			name: "Reforge Short sword +1 (Not enough gold)",
		}),
	).toBeDisabled();
	expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
	await user.keyboard("{Escape}");
	await waitFor(() =>
		expect(screen.getByLabelText("Town map", { exact: true })).toHaveFocus(),
	);
});
