import { render, screen, within } from "@testing-library/react";
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
it("browses freely, confirms one real purchase, prevents repeat buying, and restores town focus", async () => {
	const initial = createAdventureSession(
		123,
		config,
		DEFAULT_FOG_CONFIGURATION,
	);
	const state = {
		...initial.state,
		town: { ...createTownLocation(), coordinate: { row: 13, col: 3 } },
		gold: 300,
	};
	render(<Home initialAdventure={{ ...initial, state }} />, {
		wrapper: ThemeProvider,
	});
	const user = userEvent.setup();
	await user.click(
		screen.getByRole("button", { name: "Inspect Potion store" }),
	);
	const store = within(
		await screen.findByRole("dialog", { name: "Town potion store" }),
	);
	expect(store.getAllByRole("listitem")).toHaveLength(9);
	expect(store.getByText("Gold: 300")).toBeVisible();
	await user.keyboard("ss123 ");
	expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
	await user.click(store.getByRole("button", { name: "Buy Healing potion" }));
	expect(store.getByText("Gold: 300")).toBeVisible();
	await user.dblClick(store.getByRole("button", { name: "Confirm purchase" }));
	expect(store.getByText("Gold: 150")).toBeVisible();
	expect(store.getByText("150 gold · 3 remaining")).toBeVisible();
	expect(
		store.queryByRole("button", { name: "Confirm purchase" }),
	).not.toBeInTheDocument();
	await user.keyboard("{Escape}");
	expect(screen.getByLabelText("Town map", { exact: true })).toHaveFocus();
	expect(
		screen.getByRole("button", {
			name: /Potion slot 1: Healing potion, 2 carried/,
		}),
	).toBeVisible();
	expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
});
it("drinks a quick-slot potion from the town map without spending a turn", async () => {
	const initial = createAdventureSession(
		123,
		config,
		DEFAULT_FOG_CONFIGURATION,
	);
	const state = {
		...initial.state,
		town: createTownLocation(),
		player: { ...initial.state.player, health: 1 },
		bag: createBag([
			{ id: "heal-1", kind: "healing-potion" },
			{ id: "heal-2", kind: "healing-potion" },
		]),
	};
	render(<Home initialAdventure={{ ...initial, state }} />, {
		wrapper: ThemeProvider,
	});
	const user = userEvent.setup();
	screen.getByLabelText("Town map", { exact: true }).focus();
	await user.keyboard("1");
	expect(
		screen.getByRole("button", {
			name: /Potion slot 1: Healing potion, 1 carried/,
		}),
	).toBeEnabled();
	expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
});
