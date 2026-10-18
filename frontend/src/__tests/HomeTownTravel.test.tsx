import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";
import { createAdventureSession } from "../components/game/useAdventureSession";
import { DEFAULT_FOG_CONFIGURATION } from "../domain/dungeon/RunConfiguration";
import { createSaveDocument, restoreSave } from "../domain/saves/SaveFormat";
import { TOWN } from "../domain/town/TownDefinition";
import { createTownLocation } from "../domain/town/TownLocation";
import Home from "../Home";
import { ThemeProvider } from "../settings/ThemeProvider";
import { resetHomeTestState } from "./HomeTestHelpers";
import { COMPACT_TEST_CONFIGURATION as config } from "./TestRunConfiguration";

afterEach(resetHomeTestState);

it("walks deliberately into the dungeon, returns without a turn and restores exact town ownership", async () => {
	const initial = createAdventureSession(
		123,
		config,
		DEFAULT_FOG_CONFIGURATION,
	);
	const saved = createSaveDocument(
		{
			...initial.state,
			town: { ...createTownLocation(), coordinate: { ...TOWN.gate } },
		},
		initial.exploration,
		config,
		initial.fog,
	);
	render(<Home initialAdventure={restoreSave(saved)} />, {
		wrapper: ThemeProvider,
	});
	const user = userEvent.setup();
	expect(
		screen.getByRole("heading", { name: "Beacon town · Level 0" }),
	).toBeVisible();
	expect(screen.getByLabelText("Town map", { exact: true })).toHaveFocus();
	await user.keyboard("{Enter}");
	const map = screen.getByLabelText("Dungeon map", { exact: true });
	expect(map).toHaveFocus();
	expect(
		screen.queryByRole("button", { name: "Return to town (Enter)" }),
	).not.toBeInTheDocument();
	expect(
		within(screen.getByRole("region", { name: "Dungeon notices" })).getByText(
			"You see dungeon exit. Press Enter to return to town.",
		),
	).toBeVisible();
	expect(screen.getByRole("heading", { name: "Floor 1 of 5" })).toBeVisible();
	expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
	await user.keyboard("{Enter}");
	expect(screen.getByLabelText("Town map", { exact: true })).toHaveFocus();
	expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
	expect(screen.getByLabelText("Action feedback")).toHaveTextContent(
		/return to Beacon town/,
	);
	await user.click(screen.getByRole("button", { name: "Save/Load" }));
	const sheet = within(
		await screen.findByRole("dialog", { name: "Save/Load" }),
	);
	await user.click(sheet.getByRole("button", { name: "Save adventure" }));
	await user.click(screen.getByRole("button", { name: "Confirm save" }));
	expect(await sheet.findByText(/Town/)).toBeVisible();
	await user.keyboard("{Escape}");
	await waitFor(() =>
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
	);
});

it("cancels spell targeting before returning to town without casting or resuming queued input", async () => {
	const initial = createAdventureSession(123, config, {
		...DEFAULT_FOG_CONFIGURATION,
		enabled: false,
	});
	const entrance = initial.state.quest.entrance;
	const monster = initial.state.monsters.find((m) => m.floorNumber === 1);
	if (!monster) throw new Error("Expected floor-1 monster");
	const adjacent = [
		{ row: entrance.row - 1, col: entrance.col },
		{ row: entrance.row + 1, col: entrance.col },
		{ row: entrance.row, col: entrance.col - 1 },
		{ row: entrance.row, col: entrance.col + 1 },
	].find((c) => initial.state.run.floors[0].terrain[c.row]?.[c.col] === ".");
	if (!adjacent) throw new Error("Expected entrance neighbor");
	const state = {
		...initial.state,
		town: null,
		monsters: [{ ...monster, coordinate: adjacent }],
	};
	render(<Home initialAdventure={{ ...initial, state }} />, {
		wrapper: ThemeProvider,
	});
	const user = userEvent.setup();
	await user.keyboard("z");
	expect(screen.getByLabelText("Spell targeting")).toBeVisible();
	expect(screen.queryByLabelText("Dungeon exit")).not.toBeInTheDocument();
	await user.keyboard("{Escape}");
	expect(screen.getByLabelText("Dungeon exit")).toHaveTextContent(
		"Press Enter to return to town.",
	);
	await user.keyboard("{Enter}");
	expect(screen.queryByLabelText("Spell targeting")).not.toBeInTheDocument();
	expect(screen.getByLabelText("Town map", { exact: true })).toHaveFocus();
	await user.keyboard("ss{Enter}");
	expect(screen.getByLabelText("Dungeon map", { exact: true })).toHaveFocus();
	expect(screen.queryByLabelText("Spell targeting")).not.toBeInTheDocument();
	expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
});
