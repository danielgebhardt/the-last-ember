import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";
import { createAdventureSession } from "../components/game/useAdventureSession";
import { DEFAULT_FOG_CONFIGURATION } from "../domain/dungeon/RunConfiguration";
import { createTownLocation } from "../domain/town/TownLocation";
import Home from "../Home";
import { ThemeProvider } from "../settings/ThemeProvider";
import { resetHomeTestState } from "./HomeTestHelpers";
import { COMPACT_TEST_CONFIGURATION } from "./TestRunConfiguration";

afterEach(resetHomeTestState);
const setup = () => {
	const initial = createAdventureSession(
		123,
		COMPACT_TEST_CONFIGURATION,
		DEFAULT_FOG_CONFIGURATION,
	);
	const state = {
		...initial.state,
		town: { ...createTownLocation(), coordinate: { row: 17, col: 20 } },
		bag: {
			items: [
				{ id: "sale:1", kind: "short-sword" as const },
				{ id: "sale:2", kind: "iron-sword" as const },
				{ id: "supply", kind: "healing-potion" as const },
			],
		},
	};
	render(<Home initialAdventure={{ ...initial, state }} />, {
		wrapper: ThemeProvider,
	});
	return userEvent.setup();
};
it("opens the named sell-only shop by keyboard, protects stock from purchase shortcuts and restores map focus", async () => {
	const user = setup();
	await user.keyboard("e");
	const dialog = await screen.findByRole("dialog", {
		name: "The Rag & Bone",
	});
	const store = within(dialog);
	expect(store.getByRole("tab", { name: "Sell" })).toHaveAttribute(
		"aria-selected",
		"true",
	);
	expect(store.queryByRole("tab", { name: "Buy" })).not.toBeInTheDocument();
	expect(store.getByText(/selling do not advance dungeon time/)).toBeVisible();
	await user.keyboard("b1234");
	expect(store.getByRole("tab", { name: "Sell" })).toHaveAttribute(
		"aria-selected",
		"true",
	);
	expect(store.getByText("Gold 300")).toBeVisible();
	expect(
		store.queryByRole("button", { name: /Healing potion.*Sell/ }),
	).not.toBeInTheDocument();
	await user.dblClick(
		store.getByRole("button", {
			name: "Short sword · Sell for 20 gold",
		}),
	);
	expect(store.getByText("Gold 320")).toBeVisible();
	expect(store.getByText("Sold: Short sword", { exact: true })).toBeVisible();
	expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
	await user.keyboard("{Escape}");
	await waitFor(() => expect(dialog).not.toBeInTheDocument());
	expect(screen.getByLabelText("Town map", { exact: true })).toHaveFocus();
});
it("opens by tapping its doorway and closes without selling", async () => {
	const user = setup();
	await user.click(
		screen.getByRole("button", { name: "Inspect The Rag & Bone" }),
	);
	const dialog = await screen.findByRole("dialog", {
		name: "The Rag & Bone",
	});
	await user.click(within(dialog).getByRole("button", { name: "Close" }));
	await waitFor(() => expect(dialog).not.toBeInTheDocument());
	expect(screen.getByLabelText("Town map", { exact: true })).toHaveFocus();
	expect(screen.getByLabelText("Player gold")).toHaveTextContent("Gold 300");
});
