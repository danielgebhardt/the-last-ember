import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { ITEM_DEFINITIONS } from "../domain/items/Item";
import { createMonsterDrop } from "../domain/items/MonsterDrops";
import { ThemeProvider } from "../settings/ThemeProvider";
import { resetHomeTestState, stubDungeonRun } from "./HomeTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import Home from "./TestHome";

afterEach(resetHomeTestState);
describe("Monster loot on screen", () => {
	it("reveals a bump-kill drop in current sight and lets the player collect it", async () => {
		const run = { ...createCorridorEncounter(), seed: 1 };
		const monster = {
			intent: { type: "idle" as const },
			id: "1:1",
			kind: "goblin" as const,
			floorNumber: 1,
			coordinate: { row: 1, col: 2 },
			health: 1,
		};
		const expected = createMonsterDrop(1, monster);
		if (!expected) throw new Error("Fixture needs a dropping seed");
		stubDungeonRun(run, [monster]).drops.mockRestore();
		render(<Home initialFogConfiguration={{ enabled: true, radius: 1 }} />, {
			wrapper: ThemeProvider,
		});
		const user = userEvent.setup();
		await user.keyboard("{ArrowRight}");
		const name = ITEM_DEFINITIONS[expected.item.kind].name;
		expect(screen.getByLabelText(`row1col2 - ${name}`)).toBeVisible();
		expect(screen.getByRole("log")).toHaveTextContent(
			`The goblin drops ${name}.`,
		);
		await user.keyboard("{ArrowRight}");
		await user.click(screen.getByRole("button", { name: "Character" }));
		await screen.findByRole("dialog", { name: "The Adventurer's Ledger" });
		await user.click(
			screen.getByRole("button", { name: `Pick up ${name}, item 1` }),
		);
		expect(screen.getByText("No items on this tile.")).toBeVisible();
		expect(screen.getByLabelText("Bag capacity")).toHaveTextContent("3 / 27");
	});
});
