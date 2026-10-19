import { screen, waitFor, within } from "@testing-library/react";
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

const setup = (overrides: Partial<GameState.GameState> = {}) => {
	stubDungeonRun(createCorridorEncounter());
	const create = GameState.createGameState;
	vi.spyOn(GameState, "createGameState").mockImplementationOnce((run) => ({
		...create(run),
		progression: { experience: 30 },
		mana: 5,
		...overrides,
	}));
	renderHome(<Home />);
	screen.getByLabelText("Dungeon map", { exact: true }).focus();
	return userEvent.setup();
};
afterEach(resetHomeTestState);
describe("Character and Spells tabs", () => {
	it("keeps Character as the default and shows level-derived Intelligence and mana", async () => {
		const user = setup();
		await user.keyboard("c");
		const dialog = await screen.findByRole("dialog", {
			name: "The Adventurer's Ledger",
		});
		expect(
			within(dialog).getByRole("tab", { name: "Character" }),
		).toHaveAttribute("aria-selected", "true");
		expect(
			within(dialog).getByLabelText("Character Intelligence"),
		).toHaveTextContent("Intelligence 12");
		expect(within(dialog).getByLabelText("Character mana")).toHaveTextContent(
			"Mana 5 / 12",
		);
		expect(within(dialog).getByRole("region", { name: "Bag" })).toBeVisible();
	});
	it("shows known spells with derived effects, protects keys and resets the selected tab on reopening", async () => {
		const user = setup();
		await user.keyboard("i");
		const dialog = await screen.findByRole("dialog", {
			name: "The Adventurer's Ledger",
		});
		await user.click(within(dialog).getByRole("tab", { name: "Spells" }));
		const spells = within(dialog).getByRole("tabpanel", { name: "Spells" });
		expect(
			within(spells).getByRole("heading", { name: "Magic Missile" }),
		).toBeVisible();
		expect(within(spells).getByText("Damage 4–6")).toBeVisible();
		expect(
			within(spells).getByLabelText("Magic Missile mana cost"),
		).toHaveTextContent("3Mana");
		expect(within(spells).getByText("Heal up to 5 HP")).toBeVisible();
		expect(spells).toHaveTextContent("Mana · +1 every 30 successful turns");
		await user.keyboard("zh{ArrowRight}{Enter}");
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
		await user.keyboard("i");
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
		);
		await user.keyboard("c");
		expect(screen.getByRole("tab", { name: "Character" })).toHaveAttribute(
			"aria-selected",
			"true",
		);
	});
	it("uses the same authoritative known list as the hotbar", async () => {
		const user = setup({ knownSpells: ["heal"] });
		expect(
			within(screen.getByRole("region", { name: "Spell hotbar" })).getAllByRole(
				"button",
			),
		).toHaveLength(1);
		await user.keyboard("i");
		await user.click(screen.getByRole("tab", { name: "Spells" }));
		expect(screen.getByRole("heading", { name: "Heal" })).toBeVisible();
		expect(
			screen.queryByRole("heading", { name: "Magic Missile" }),
		).not.toBeInTheDocument();
	});
	it("supports arrow navigation between tabs without gameplay", async () => {
		const user = setup();
		await user.keyboard("i");
		screen.getByRole("tab", { name: "Character" }).focus();
		await user.keyboard("{ArrowRight}");
		expect(screen.getByRole("tab", { name: "Spells" })).toHaveFocus();
		expect(screen.getByRole("tab", { name: "Spells" })).toHaveAttribute(
			"aria-selected",
			"true",
		);
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
	});
	it("explains spell shortcuts, targeting and both potion kinds in Help", async () => {
		const user = setup();
		await user.click(screen.getByRole("button", { name: "Help" }));
		const help = within(await screen.findByRole("dialog"));
		expect(help.getByText("Z", { selector: "kbd" })).toBeVisible();
		expect(help.getByText("H", { selector: "kbd" })).toBeVisible();
		expect(
			help.getByRole("region", { name: "Spellcasting" }),
		).toHaveTextContent(/arrows.*Enter.*click/i);
		expect(
			help.getByRole("region", { name: "Spellcasting" }),
		).toHaveTextContent(/Escape or Z/);
		expect(help.getByText(/a potion in Character/)).toBeVisible();
	});
});
