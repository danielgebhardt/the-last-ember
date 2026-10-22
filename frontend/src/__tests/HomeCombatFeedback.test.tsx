import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as GameState from "../domain/game/GameState";
import {
	renderHome as render,
	resetHomeTestState,
	stubDungeonRun,
} from "./HomeTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import Home from "./TestHome";

afterEach(resetHomeTestState);

describe("Combat feedback on the map", () => {
	it("marks a real kill over the map without announcing it twice, then clears", async () => {
		stubDungeonRun(createCorridorEncounter());
		const create = GameState.createGameState;
		vi.spyOn(GameState, "createGameState").mockImplementationOnce((run) => ({
			...create(run),
			monsters: [
				{
					intent: { type: "idle" as const },
					id: "1:1",
					kind: "goblin",
					floorNumber: 1,
					coordinate: { row: 1, col: 2 },
					health: 1,
				},
			],
		}));
		render(<Home />);
		const map = screen.getByLabelText("Dungeon map", { exact: true });
		map.focus();
		const user = userEvent.setup();
		const turn = screen.getByLabelText("Turn count").textContent;
		await user.keyboard("d");
		const marks = await screen.findAllByTestId("combat-feedback");
		expect(marks.map((mark) => mark.textContent)).toEqual(
			expect.arrayContaining(["-1", "Slain"]),
		);
		expect(marks[0].closest('[aria-hidden="true"]')).not.toBeNull();
		expect(marks.find((mark) => mark.textContent === "Slain")?.style.left).toBe(
			"calc(var(--dungeon-tile-size) * 2)",
		);
		expect(screen.getByLabelText("Turn count")).not.toHaveTextContent(
			turn ?? "",
		);
		await waitFor(
			() => expect(screen.queryAllByTestId("combat-feedback")).toHaveLength(0),
			{ timeout: 2000 },
		);
	});
});
