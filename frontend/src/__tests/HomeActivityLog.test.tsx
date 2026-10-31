import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	appendActivityEvents,
	createActivityHistory,
} from "../domain/game/ActivityHistory.ts";
import * as GameState from "../domain/game/GameState.ts";
import {
	closeSettings,
	openCustomAdventure,
	openSettings,
	renderHome,
	resetHomeTestState,
	stubDungeonRun,
	waitForNewAdventureClosed,
} from "./HomeTestHelpers.tsx";
import Home from "./TestHome";
import { createThreeFloorTraversalRun } from "./testhelpers.ts";

const renderWithHistory = () => {
	const run = createThreeFloorTraversalRun();
	stubDungeonRun(run);
	const initial = GameState.createGameState(run);
	vi.spyOn(GameState, "createGameState").mockReturnValueOnce({
		...initial,
		turn: 1,
		activityHistory: appendActivityEvents(createActivityHistory(), [
			{ type: "player-hit", turn: 1, monster: "goblin", damage: 2 },
		]),
	});
	renderHome(<Home />);
};
afterEach(resetHomeTestState);

describe("Activity history on the play screen", () => {
	it("allows keyboard reading of the log without moving the player or spending turns", () => {
		renderWithHistory();
		const log = screen.getByRole("log", { name: "Activity log" });
		log.focus();
		fireEvent.keyDown(log, { key: "ArrowRight" });
		expect(screen.getByLabelText("row1col1 - player")).toBeVisible();
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 1");
	});

	it("retains history through floor visits and settings without logging ordinary steps", async () => {
		renderWithHistory();
		const user = userEvent.setup();
		await user.keyboard("dda");
		await openSettings(user);
		await user.click(screen.getByRole("button", { name: "Light" }));
		await closeSettings(user);
		const entries = within(
			screen.getByRole("log", { name: "Activity log" }),
		).getAllByRole("listitem");
		expect(
			entries.map(
				(entry) => entry.querySelector("[data-activity-message]")?.textContent,
			),
		).toEqual([
			"You hit the goblin for 2 damage.",
			"You descend to floor 2.",
			"You ascend to floor 1.",
		]);
	});

	it("clears history on New Dungeon", async () => {
		renderWithHistory();
		await userEvent.click(screen.getByRole("button", { name: "New Dungeon" }));
		await userEvent.click(
			screen.getByRole("button", { name: "Start standard adventure" }),
		);
		expect(
			within(screen.getByRole("log", { name: "Activity log" })).queryAllByRole(
				"listitem",
			),
		).toHaveLength(0);
		expect(
			within(screen.getByRole("log", { name: "Activity log" })).getByText(
				"No activity yet.",
			),
		).toBeVisible();
	});

	it("clears history even when replaying the same seed", async () => {
		renderWithHistory();
		const user = userEvent.setup();
		await openCustomAdventure(user);
		await user.click(
			screen.getByRole("button", { name: "Start custom adventure" }),
		);
		await waitForNewAdventureClosed();
		expect(
			within(screen.getByRole("log", { name: "Activity log" })).queryAllByRole(
				"listitem",
			),
		).toHaveLength(0);
		expect(screen.getByText("No activity yet.")).toBeVisible();
	});
});
