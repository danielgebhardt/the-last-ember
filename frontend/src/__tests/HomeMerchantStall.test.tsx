import { render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import * as GameState from "../domain/game/GameState";
import { ThemeProvider } from "../settings/ThemeProvider";
import { resetHomeTestState, stubDungeonRun } from "./HomeTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import Home from "./TestHome";

const flags = vi.hoisted(() => ({
	developerCatalog: true,
	wanderingMerchant: true,
}));
vi.mock("../settings/FeatureFlags", () => ({ APP_FEATURES: flags }));
afterEach(() => {
	resetHomeTestState();
	flags.wanderingMerchant = true;
});
it.each([true, false])(
	"shows the merchant's stall only when availability is %s",
	(enabled) => {
		flags.wanderingMerchant = enabled;
		stubDungeonRun(createCorridorEncounter());
		const create = GameState.createGameState;
		vi.spyOn(GameState, "createGameState").mockImplementationOnce((run) => ({
			...create(run),
			monsters: [],
			floorItems: [],
			objects: [
				{
					id: "floor:1:object:merchant:1",
					kind: "merchant",
					floorNumber: 1,
					coordinate: { row: 1, col: 2 },
					activated: false,
				},
			],
		}));
		render(<Home />, { wrapper: ThemeProvider });
		if (enabled) {
			expect(
				screen.getByRole("cell", {
					name: "row1col2 - potion merchant",
				}),
			).toBeVisible();
			expect(screen.getByText(/Press E within reach to trade/)).toBeVisible();
			// The cell's label names the stall; its drawing is decorative.
			expect(
				screen
					.getByRole("cell", { name: "row1col2 - potion merchant" })
					.querySelector("svg[data-full-color]"),
			).toBeInTheDocument();
		} else {
			expect(
				screen.queryByRole("cell", {
					name: "row1col2 - potion merchant",
				}),
			).not.toBeInTheDocument();
			expect(
				screen.getByRole("cell", { name: "row1col2 - floor" }),
			).toBeVisible();
			expect(
				screen.queryByText(/Press E within reach to trade/),
			).not.toBeInTheDocument();
		}
	},
);
