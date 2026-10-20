import { render, screen, waitFor, within } from "@testing-library/react";
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
it("opens the existing sanctuary, cancels freely, confirms health once and restores map focus", async () => {
	const initial = createAdventureSession(
		123,
		config,
		DEFAULT_FOG_CONFIGURATION,
	);
	const state = {
		...initial.state,
		town: { ...createTownLocation(), coordinate: { row: 5, col: 7 } },
		gold: 300,
		player: { health: 4, maxHealth: 10 },
	};
	render(<Home initialAdventure={{ ...initial, state }} />, {
		wrapper: ThemeProvider,
	});
	const user = userEvent.setup();
	await user.click(screen.getByRole("button", { name: "Inspect Sanctuary" }));
	const dialog = within(
		await screen.findByRole("dialog", { name: "Sanctuary" }),
	);
	await user.click(
		dialog.getByRole("button", { name: /^Restore health \d+ gold$/ }),
	);
	expect(dialog.getByText("Gold: 300")).toBeVisible();
	expect(dialog.getByText("HP 4 / 10")).toBeVisible();
	await user.click(dialog.getByRole("button", { name: "Cancel treatment" }));
	expect(
		dialog.queryByRole("button", { name: "Confirm treatment" }),
	).not.toBeInTheDocument();
	await user.click(
		dialog.getByRole("button", { name: /^Restore health \d+ gold$/ }),
	);
	await user.dblClick(
		dialog.getByRole("button", { name: "Confirm treatment" }),
	);
	expect(dialog.getByText("Gold: 240")).toBeVisible();
	expect(dialog.getByText("HP 10 / 10")).toBeVisible();
	expect(
		dialog.getByRole("button", { name: "Restore health Not needed" }),
	).toBeDisabled();
	expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
	await user.keyboard("{Escape}");
	await waitFor(() =>
		expect(screen.getByLabelText("Town map", { exact: true })).toHaveFocus(),
	);
});
