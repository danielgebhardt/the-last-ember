import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as GameState from "../domain/game/GameState.ts";
import {
	closeSettings,
	openSettings,
	renderHome,
	resetHomeTestState,
	stubDungeonRun,
	waitForSettingsClosed,
} from "./HomeTestHelpers.tsx";
import Home from "./TestHome";
import { createThreeFloorTraversalRun } from "./testhelpers.ts";

// No combat controls exist yet. Initialize one injured player to make sure
// ordinary UI operations retain health rather than silently healing them.
const startWithInjuredPlayer = () => {
	const run = createThreeFloorTraversalRun();
	stubDungeonRun(run);
	const initial = GameState.createGameState(run);
	vi.spyOn(GameState, "createGameState").mockReturnValueOnce({
		...initial,
		turn: 7,
		player: { health: 4, maxHealth: 10 },
	});
	renderHome(<Home />);
};

afterEach(resetHomeTestState);

describe("Player status on the play screen", () => {
	it("displays health and turn together", () => {
		stubDungeonRun(createThreeFloorTraversalRun());
		renderHome(<Home />);
		const status = within(
			screen.getByRole("region", { name: "Player status" }),
		);
		expect(status.getByLabelText("Player health")).toHaveTextContent(
			"Health 10 / 10",
		);
		expect(status.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
	});

	it("retains injured health through floor travel, settings, and appearance changes", async () => {
		startWithInjuredPlayer();
		const user = userEvent.setup();
		await user.keyboard("{ArrowRight}{ArrowRight}{ArrowLeft}");
		await openSettings(user);
		await user.click(screen.getByRole("button", { name: "Light" }));
		await user.click(
			screen.getByRole("checkbox", { name: "Enable fog of war" }),
		);
		const radius = screen.getByRole("textbox", { name: "Visibility radius" });
		await user.clear(radius);
		await user.type(radius, "2{Enter}");
		await closeSettings(user);
		expect(screen.getByLabelText("Player health")).toHaveTextContent(
			"Health 4 / 10",
		);
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 10");
	});

	it("restores full health and turn zero on New Dungeon", async () => {
		startWithInjuredPlayer();
		await userEvent.click(screen.getByRole("button", { name: "New Dungeon" }));
		await userEvent.click(
			screen.getByRole("button", { name: "Start new dungeon" }),
		);
		expect(screen.getByLabelText("Player health")).toHaveTextContent(
			"Health 10 / 10",
		);
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
	});

	it("restores full health and turn zero when replaying the same seed", async () => {
		startWithInjuredPlayer();
		const user = userEvent.setup();
		await openSettings(user);
		await user.click(screen.getByRole("button", { name: "Start from seed" }));
		await waitForSettingsClosed();
		expect(screen.getByLabelText("Player health")).toHaveTextContent(
			"Health 10 / 10",
		);
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
	});
});
