import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import * as GameState from "../domain/game/GameState";
import { ThemeProvider } from "../settings/ThemeProvider";
import { resetHomeTestState, stubDungeonRun } from "./HomeTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import Home from "./TestHome";

afterEach(resetHomeTestState);
it.each([
	[0.75, 54, 13, 14],
	[1, 72, 17, 19],
	[1.25, 90, 21, 24],
] as const)(
	"warns of its strength at difficulty %s without exact stats, and restores focus",
	async (difficulty, health, min, max) => {
		stubDungeonRun(createCorridorEncounter());
		const create = GameState.createGameState;
		vi.spyOn(GameState, "createGameState").mockImplementationOnce((run) => ({
			...create(run),
			difficulty,
			monsters: [],
			floorItems: [],
			objects: [
				{
					id: "floor:1:object:elite-door:1",
					kind: "elite-door",
					floorNumber: 1,
					coordinate: { row: 1, col: 2 },
					activated: false,
				},
			],
		}));
		render(<Home />, { wrapper: ThemeProvider });
		const map = screen.getByLabelText("Dungeon map", { exact: true });
		map.focus();
		const user = userEvent.setup();
		await user.keyboard("d");
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
		await user.keyboard("e");
		await screen.findByRole("dialog", { name: "Elite chamber gate" });
		await waitFor(() =>
			expect(
				screen.getByRole("heading", { name: "Elite chamber gate" }),
			).toHaveFocus(),
		);
		expect(screen.getByText(/arcane barely does/)).toBeVisible();
		// Its numbers stay a surprise.
		const gate = screen.getByRole("dialog", { name: "Elite chamber gate" });
		for (const stat of [health, min, max])
			expect(gate).not.toHaveTextContent(new RegExp(`\\b${stat}\\b`));
		await user.keyboard("{Escape}");
		await waitFor(() => expect(map).toHaveFocus());
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
		await user.keyboard("e");
		await screen.findByRole("dialog", { name: "Elite chamber gate" });
		await waitFor(() =>
			expect(
				screen.getByRole("heading", { name: "Elite chamber gate" }),
			).toHaveFocus(),
		);
		await user.keyboard("d");
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
		await user.keyboard("1");
		await waitFor(() => expect(map).toHaveFocus());
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 1");
		expect(
			screen.getByRole("cell", {
				name: "row1col2 - open skull-marked elite gate",
			}),
		).toBeVisible();
		await user.keyboard("e");
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 2");
		expect(
			screen.getByRole("cell", {
				name: "row1col2 - closed skull-marked elite gate",
			}),
		).toBeVisible();
		await user.keyboard("e");
		await screen.findByRole("dialog", { name: "Elite chamber gate" });
		await waitFor(() =>
			expect(
				screen.getByRole("heading", { name: "Elite chamber gate" }),
			).toHaveFocus(),
		);
		await user.click(screen.getByRole("button", { name: /Open the gate/ }));
		await waitFor(() => expect(map).toHaveFocus());
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 3");
	},
);
