import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as DungeonRun from "../domain/dungeon/DungeonRun";
import { ITEM_DEFINITIONS } from "../domain/items/Item";
import * as ItemPlacement from "../domain/items/ItemPlacement";
import * as MonsterPlacement from "../domain/monsters/MonsterPlacement";
import { ThemeProvider } from "../settings/ThemeProvider";
import { enterDungeonFromTown, resetHomeTestState } from "./HomeTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import Home from "./TestHome";

afterEach(resetHomeTestState);
describe("Generated loot on the play screen", () => {
	it("renders actual initial loot, retains a pickup through movement, and restores it on seed replay", async () => {
		const run = createCorridorEncounter();
		const expected = ItemPlacement.spawnRunItems(run, []);
		const target = expected.find((entry) => entry.floorNumber === 1);
		if (!target) throw new Error("Fixture needs one initial item");
		const spawn = vi.spyOn(ItemPlacement, "spawnRunItems");
		vi.spyOn(MonsterPlacement, "spawnRunMonsters").mockReturnValue([]);
		vi.spyOn(DungeonRun, "generateDungeonRun").mockReturnValue(run);
		vi.spyOn(DungeonRun, "connectDungeonFloors").mockReturnValue(run);
		render(<Home initialFogConfiguration={{ enabled: false, radius: 6 }} />, {
			wrapper: ThemeProvider,
		});
		const label = `row1col${target.coordinate.col} - ${ITEM_DEFINITIONS[target.item.kind].name}`;
		expect(screen.getByLabelText(label)).toBeVisible();
		const user = userEvent.setup();
		await user.keyboard("{ArrowRight}".repeat(target.coordinate.col - 1));
		expect(screen.getByRole("log")).toHaveTextContent(
			`You see ${ITEM_DEFINITIONS[target.item.kind].name} here.`,
		);
		await user.click(screen.getByRole("button", { name: "Character" }));
		await screen.findByRole("dialog", { name: "The Adventurer's Ledger" });
		await user.click(
			screen.getByRole("button", {
				name: `Pick up ${ITEM_DEFINITIONS[target.item.kind].name}, item 1`,
			}),
		);
		expect(screen.getByLabelText("Bag capacity")).toHaveTextContent("3 / 27");
		await user.keyboard("{Escape}");
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
		);
		screen.getByLabelText("Dungeon map", { exact: true }).focus();
		await user.keyboard("{ArrowLeft}");
		expect(
			screen.getByLabelText(`row1col${target.coordinate.col} - floor`),
		).toBeVisible();
		expect(spawn).toHaveBeenCalledTimes(1);
		await user.click(screen.getByRole("button", { name: "Settings" }));
		await screen.findByRole("dialog", { name: "Settings" });
		await user.click(screen.getByRole("button", { name: "Start from seed" }));
		await enterDungeonFromTown(user);
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
		);
		expect(screen.getByLabelText(label)).toBeVisible();
		expect(spawn).toHaveBeenCalledTimes(2);
	});
});
