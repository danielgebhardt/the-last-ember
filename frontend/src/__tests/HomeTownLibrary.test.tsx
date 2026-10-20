import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";
import { createAdventureSession } from "../components/game/useAdventureSession";
import { DEFAULT_FOG_CONFIGURATION } from "../domain/dungeon/RunConfiguration";
import { SPELL_DEFINITIONS } from "../domain/game/Spells";
import { libraryOffers } from "../domain/town/TownLibrary";
import { createTownLocation } from "../domain/town/TownLocation";
import Home from "../Home";
import { ThemeProvider } from "../settings/ThemeProvider";
import { resetHomeTestState } from "./HomeTestHelpers";
import { COMPACT_TEST_CONFIGURATION as config } from "./TestRunConfiguration";

afterEach(resetHomeTestState);
it("shows the seed's three books, confirms one purchase and marks it known", async () => {
	const initial = createAdventureSession(
		123,
		config,
		DEFAULT_FOG_CONFIGURATION,
	);
	const state = {
		...initial.state,
		town: { ...createTownLocation(), coordinate: { row: 5, col: 3 } },
		gold: 1500,
	};
	const [first, second] = libraryOffers(state.run).map(
		(offer) => SPELL_DEFINITIONS[offer.spell].name,
	);
	render(<Home initialAdventure={{ ...initial, state }} />, {
		wrapper: ThemeProvider,
	});
	const user = userEvent.setup();
	await user.click(screen.getByRole("button", { name: "Inspect Library" }));
	const dialog = within(await screen.findByRole("dialog", { name: "Library" }));
	expect(dialog.getAllByRole("listitem")).toHaveLength(3);
	expect(dialog.getAllByText("1000 gold")).toHaveLength(3);
	await user.click(dialog.getByRole("button", { name: `Learn ${first}` }));
	expect(
		dialog.getByRole("group", { name: "Confirm spellbook purchase" }),
	).toHaveTextContent(`Learn ${first} for 1000 gold?`);
	await user.click(dialog.getByRole("button", { name: "Cancel purchase" }));
	expect(dialog.getByText("Gold: 1500")).toBeVisible();
	await user.click(dialog.getByRole("button", { name: `Learn ${first}` }));
	await user.dblClick(dialog.getByRole("button", { name: "Confirm purchase" }));
	expect(dialog.getByText("Gold: 500")).toBeVisible();
	expect(
		dialog.getByRole("button", { name: `${first} (Already known)` }),
	).toBeDisabled();
	expect(
		dialog.getByRole("button", { name: `Learn ${second} (Not enough gold)` }),
	).toBeDisabled();
	expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
	await user.keyboard("{Escape}");
	await waitFor(() =>
		expect(screen.getByLabelText("Town map", { exact: true })).toHaveFocus(),
	);
});
