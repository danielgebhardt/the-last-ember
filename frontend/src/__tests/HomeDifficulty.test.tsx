import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import * as GameState from "../domain/game/GameState";
import { ThemeProvider } from "../settings/ThemeProvider";
import {
	closeSettings,
	enterDungeonFromTown,
	openSettings,
	renderHome,
	resetHomeTestState,
	stubDungeonRun,
	waitForSettingsClosed,
} from "./HomeTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import Home from "./TestHome";

afterEach(resetHomeTestState);
describe("Choosing adventure difficulty", () => {
	it("selects Harder before beginning, keeps generation separate and focuses the map", async () => {
		const user = userEvent.setup();
		const { generate } = stubDungeonRun(createCorridorEncounter());
		const create = vi.spyOn(GameState, "createGameState");
		render(<App />);
		expect(screen.getByRole("radio", { name: /Normal/ })).toBeChecked();
		await user.click(screen.getByRole("radio", { name: /Harder/ }));
		expect(generate).not.toHaveBeenCalled();
		await user.click(screen.getByRole("button", { name: "Begin Adventure" }));
		expect(screen.getByLabelText("Adventure difficulty")).toHaveTextContent(
			"Harder",
		);
		expect(create).toHaveBeenCalledWith(expect.any(Object), 1.25);
		expect(generate.mock.lastCall?.[2]).not.toHaveProperty("difficulty");
		expect(screen.getByLabelText("Town map", { exact: true })).toHaveFocus();
	});
	it("keeps the opening choice after generation fails and allows retry", async () => {
		const user = userEvent.setup();
		const { generate } = stubDungeonRun(createCorridorEncounter());
		generate.mockImplementationOnce(() => {
			throw new Error("generation failed");
		});
		render(<App />);
		await user.click(screen.getByRole("radio", { name: /Harder/ }));
		await user.click(screen.getByRole("button", { name: "Begin Adventure" }));
		expect(
			screen.getByRole("dialog", { name: "The Last Ember" }),
		).toBeVisible();
		expect(screen.getByRole("alert")).toHaveTextContent(/Could not start/);
		expect(screen.getByRole("radio", { name: /Harder/ })).toBeChecked();
		await user.click(screen.getByRole("button", { name: "Begin Adventure" }));
		expect(screen.getByLabelText("Adventure difficulty")).toHaveTextContent(
			"Harder",
		);
	});
	it("changes only the next-run draft until apply, then uses the scaled values in Help", async () => {
		const user = userEvent.setup();
		stubDungeonRun(createCorridorEncounter(), [
			{
				id: "1:1",
				kind: "goblin",
				floorNumber: 1,
				coordinate: { row: 1, col: 4 },
				health: 4,
				intent: { type: "idle" },
			},
		]);
		render(<Home initialFogConfiguration={{ enabled: false, radius: 8 }} />, {
			wrapper: ThemeProvider,
		});
		await openSettings(user);
		await user.click(screen.getByRole("radio", { name: /Harder/ }));
		expect(
			screen.getByLabelText("Current adventure difficulty"),
		).toHaveTextContent("Normal");
		await closeSettings(user);
		expect(screen.getByLabelText("Adventure difficulty")).toHaveTextContent(
			"Normal",
		);
		await openSettings(user);
		await user.click(screen.getByRole("button", { name: "Start from seed" }));
		await waitForSettingsClosed();
		await enterDungeonFromTown(user);
		expect(screen.getByLabelText("Adventure difficulty")).toHaveTextContent(
			"Harder",
		);
		expect(screen.getByLabelText("Dungeon map", { exact: true })).toHaveFocus();
		await user.click(screen.getByRole("button", { name: "Help" }));
		expect(screen.getByLabelText("Visible creatures")).toHaveTextContent(
			"Maximum health 5",
		);
		await user.keyboard("{Escape}");
		await user.click(screen.getByRole("button", { name: "New Dungeon" }));
		await user.click(screen.getByRole("button", { name: "Start new dungeon" }));
		expect(screen.getByLabelText("Adventure difficulty")).toHaveTextContent(
			"Harder",
		);
	});
	it("retains active difficulty and its draft when seed generation fails", async () => {
		const user = userEvent.setup();
		const { generate } = stubDungeonRun(createCorridorEncounter());
		renderHome(<Home />);
		await openSettings(user);
		await user.click(screen.getByRole("radio", { name: /Easier/ }));
		generate.mockImplementationOnce(() => {
			throw new Error("generation failed");
		});
		await user.click(screen.getByRole("button", { name: "Start from seed" }));
		expect(screen.getByRole("alert")).toHaveTextContent(/Could not create/);
		expect(
			screen.getByLabelText("Current adventure difficulty"),
		).toHaveTextContent("Normal");
		expect(screen.getByRole("radio", { name: /Easier/ })).toBeChecked();
	});
});
