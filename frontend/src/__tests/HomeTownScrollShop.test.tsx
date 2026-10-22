import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";
import { createAdventureSession } from "../components/game/useAdventureSession";
import { DEFAULT_FOG_CONFIGURATION } from "../domain/dungeon/RunConfiguration";
import { createTownLocation } from "../domain/town/TownLocation";
import Home from "../Home";
import { ThemeProvider } from "../settings/ThemeProvider";
import { resetHomeTestState } from "./HomeTestHelpers";
import { COMPACT_TEST_CONFIGURATION as config } from "./TestRunConfiguration";

afterEach(resetHomeTestState);
it("opens the Market Street scroll shop, explains the portal's ember rule and confirms one purchase", async () => {
	const initial = createAdventureSession(
		123,
		config,
		DEFAULT_FOG_CONFIGURATION,
	);
	const state = {
		...initial.state,
		town: { ...createTownLocation(), coordinate: { row: 13, col: 20 } },
		gold: 400,
	};
	render(<Home initialAdventure={{ ...initial, state }} />, {
		wrapper: ThemeProvider,
	});
	const user = userEvent.setup();
	await user.click(screen.getByRole("button", { name: "Inspect Scroll shop" }));
	const shop = within(
		await screen.findByRole("dialog", { name: "Scroll shop" }),
	);
	expect(
		shop.getAllByRole("heading", { level: 3 }).map((h) => h.textContent),
	).toEqual(["Town portal scroll", "Remove Curse scroll"]);
	expect(shop.getByText(/carrying the Last Ember/)).toBeVisible();
	// Shop copy keeps what a buyer needs; item details keep the full rules.
	expect(
		shop.getByText(
			"Read in a cleared dungeon area to open a single-use return portal in Beacon town. Stand on the town portal and press Enter to return to your exact departure location, or a nearby safe tile if blocked, for free. Cannot be used while carrying the Last Ember.",
		),
	).toBeVisible();
	expect(
		shop.getByText(
			"Lifts a Curse before the ensuing phase, restoring melee accuracy and damage. Does not cure other conditions.",
		),
	).toBeVisible();
	expect(shop.getByText("200 gold · 3 remaining")).toBeVisible();
	expect(shop.getByText("375 gold · 2 remaining")).toBeVisible();
	await user.click(
		shop.getByRole("button", { name: "Buy Remove Curse scroll" }),
	);
	await user.click(shop.getByRole("button", { name: "Confirm purchase" }));
	expect(shop.getByText("Gold: 25")).toBeVisible();
	expect(shop.getByText("375 gold · 1 remaining")).toBeVisible();
	// The portal scroll is now unaffordable, and nothing advanced dungeon time.
	expect(
		shop.getByRole("button", { name: "Buy Town portal scroll" }),
	).toBeDisabled();
	expect(shop.getAllByText("Not enough gold")).toHaveLength(2);
	expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
	await user.keyboard("{Escape}");
	expect(screen.getByLabelText("Town map", { exact: true })).toHaveFocus();
});
