import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as GameState from "../domain/game/GameState";
import * as MonsterPlacement from "../domain/monsters/MonsterPlacement";
import { ThemeProvider } from "../settings/ThemeProvider";
import {
	closeNewAdventure,
	enterDungeonFromTown,
	inspectEndedRun,
	openCustomAdventure,
	readDungeonCells,
	resetHomeTestState,
	stubDungeonRun,
} from "./HomeTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import Home from "./TestHome";
import { createTestDungeonFloor } from "./testhelpers";

afterEach(resetHomeTestState);

describe("Complete monster encounters on screen", () => {
	it("plays the seeded corridor encounter with real AI, fog, controlled rolls and logs, then restores the same seed", async () => {
		const spawn = MonsterPlacement.spawnRunMonsters;
		stubDungeonRun(createCorridorEncounter()).spawn.mockImplementation((run) =>
			spawn(run, 3),
		);
		const user = userEvent.setup();
		render(<Home initialFogConfiguration={{ enabled: true, radius: 2 }} />, {
			wrapper: ThemeProvider,
		});
		const initialMap = readDungeonCells();
		await user.keyboard("{ArrowRight}".repeat(17));
		expect(screen.getByRole("heading", { name: "Floor 2 of 2" })).toBeVisible();
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 17");
		const log = screen.getByRole("log");
		expect(within(log).getAllByText(/The goblin dies/)).toHaveLength(3);
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
		await user.keyboard("da");
		expect(screen.getByRole("heading", { name: "Floor 1 of 2" })).toBeVisible();
		expect(screen.queryByLabelText(/goblin/)).not.toBeInTheDocument();
		expect(
			screen.getByLabelText("row1col1 - remembered entrance"),
		).toBeVisible();
		await openCustomAdventure(user);
		await user.click(
			screen.getByRole("button", { name: "Start custom adventure" }),
		);
		await enterDungeonFromTown(user);
		expect(readDungeonCells()).toEqual(initialMap);
		expect(screen.getByLabelText("Player health")).toHaveTextContent(
			"Health 10 / 10",
		);
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
		expect(screen.getByRole("log")).toHaveTextContent("No activity yet.");
	});
	it("ends a multi-monster encounter on the first fatal hit and preserves it after failed replay", async () => {
		const create = GameState.createGameState;
		vi.spyOn(GameState, "createGameState").mockImplementationOnce((run) => ({
			...create(run),
			player: { health: 1, maxHealth: 10 },
		}));
		const stubs = stubDungeonRun(
			{
				seed: 123,
				activeFloor: 1,
				playerCoordinate: { row: 1, col: 1 },
				floors: [
					createTestDungeonFloor({
						floorNumber: 1,
						rows: 5,
						cols: 6,
						room: { startRow: 1, endRow: 3, startCol: 1, endCol: 4 },
					}),
				],
			},
			[
				{
					intent: { type: "idle" as const },
					id: "1:1",
					kind: "goblin",
					floorNumber: 1,
					coordinate: { row: 1, col: 2 },
					health: 4,
				},
				{
					intent: { type: "idle" as const },
					id: "1:2",
					kind: "goblin",
					floorNumber: 1,
					coordinate: { row: 2, col: 1 },
					health: 4,
				},
				{
					intent: { type: "idle" as const },
					id: "1:3",
					kind: "goblin",
					floorNumber: 1,
					coordinate: { row: 3, col: 3 },
					health: 4,
				},
			],
		);
		const user = userEvent.setup();
		render(<Home initialFogConfiguration={{ enabled: true, radius: 6 }} />, {
			wrapper: ThemeProvider,
		});
		const initialMap = readDungeonCells();
		await user.keyboard("d");
		await inspectEndedRun(user);
		expect(screen.getByRole("alert")).toHaveTextContent("You died.");
		expect(screen.getByLabelText("Player health")).toHaveTextContent(
			"Health 0 / 10",
		);
		expect(
			within(screen.getByRole("log"))
				.getAllByRole("listitem")
				.map(
					(item) => item.querySelector("[data-activity-message]")?.textContent,
				),
		).toEqual([
			"You hit the goblin for 2 damage.",
			"The goblin hits you for 1 damage.",
			"You die.",
		]);
		await user.keyboard("wasd{ArrowRight}");
		expect(readDungeonCells()).toEqual(initialMap);
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 1");
		stubs.generate.mockImplementationOnce(() => {
			throw new Error("Cannot generate");
		});
		await openCustomAdventure(user);
		await user.click(
			screen.getByRole("button", { name: "Start custom adventure" }),
		);
		expect(screen.getByText(/Could not create a dungeon/)).toBeVisible();
		await closeNewAdventure(user);
		expect(screen.getByRole("alert")).toHaveTextContent("You died.");
		await user.click(screen.getByRole("button", { name: "New Dungeon" }));
		await user.click(
			screen.getByRole("button", { name: "Start standard adventure" }),
		);
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
		expect(screen.getByLabelText("Player health")).toHaveTextContent(
			"Health 10 / 10",
		);
		expect(screen.getByRole("log")).toHaveTextContent("No activity yet.");
	});
});
