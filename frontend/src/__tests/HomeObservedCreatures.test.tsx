import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import * as GameState from "../domain/game/GameState";
import { ThemeProvider } from "../settings/ThemeProvider";
import { resetHomeTestState, stubDungeonRun } from "./HomeTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import Home from "./TestHome";

afterEach(resetHomeTestState);
it("Help explains the visible creature and hides another outside fog sight", async () => {
	stubDungeonRun(createCorridorEncounter());
	const create = GameState.createGameState;
	vi.spyOn(GameState, "createGameState").mockImplementationOnce((run) => ({
		...create(run),
		monsters: [
			{
				id: "1:1",
				kind: "salamander",
				floorNumber: 1,
				coordinate: { row: 1, col: 2 },
				health: 24,
				intent: { type: "idle" },
			},
			{
				id: "1:2",
				kind: "necromancer",
				floorNumber: 1,
				coordinate: { row: 1, col: 5 },
				health: 28,
				intent: { type: "idle" },
			},
		],
	}));
	render(<Home initialFogConfiguration={{ enabled: true, radius: 1 }} />, {
		wrapper: ThemeProvider,
	});
	const user = userEvent.setup();
	await user.click(screen.getByRole("button", { name: "Help" }));
	await user.click(await screen.findByRole("tab", { name: "Map" }));
	const creatures = within(
		await screen.findByRole("region", { name: "Visible creatures" }),
	);
	expect(creatures.getByRole("heading", { name: "salamander" })).toBeVisible();
	expect(
		creatures.queryByRole("heading", { name: "necromancer" }),
	).not.toBeInTheDocument();
	expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
});
