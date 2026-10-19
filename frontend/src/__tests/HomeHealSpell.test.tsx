import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as GameState from "../domain/game/GameState";
import {
	renderHome,
	resetHomeTestState,
	stubDungeonRun,
} from "./HomeTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import Home from "./TestHome";

const setup = () => {
	stubDungeonRun(createCorridorEncounter());
	const create = GameState.createGameState;
	vi.spyOn(GameState, "createGameState").mockImplementationOnce((run) => ({
		...create(run),
		player: { health: 4, maxHealth: 10 },
	}));
	renderHome(<Home />);
	screen.getByLabelText("Dungeon map", { exact: true }).focus();
	return userEvent.setup();
};
afterEach(resetHomeTestState);
describe("Heal activation", () => {
	it.each(["H", "button"])(
		"self-casts with %s and removes low-health feedback",
		async (method) => {
			const user = setup();
			expect(screen.getByRole("region", { name: "Adventure" })).toHaveAttribute(
				"data-low-health",
				"true",
			);
			if (method === "H") await user.keyboard("H");
			else
				await user.click(screen.getByRole("button", { name: "Heal, 4 mana" }));
			expect(screen.getByLabelText("Player health")).toHaveTextContent(
				"Health 8 / 10",
			);
			expect(screen.getByRole("region", { name: "Adventure" })).toHaveAttribute(
				"data-low-health",
				"false",
			);
			expect(screen.getByLabelText("Player mana")).toHaveTextContent(
				"Mana 6 / 10",
			);
			expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 1");
			expect(screen.getByRole("log")).toHaveTextContent(
				"Heal restores 4 health",
			);
		},
	);
	it("protects H from repeats, modifiers and menu browsing", async () => {
		const user = setup();
		fireEvent.keyDown(window, { key: "h", repeat: true });
		fireEvent.keyDown(window, { key: "h", altKey: true });
		await user.keyboard("i");
		const dialog = await screen.findByRole("dialog", {
			name: "The Adventurer's Ledger",
		});
		await user.keyboard("h");
		expect(within(dialog).getByLabelText("Character health")).toHaveTextContent(
			"Health 4 / 10",
		);
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
	});
});
