import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as GameState from "../domain/game/GameState";
import { levelForExperience } from "../domain/game/Progression";
import {
	enterDungeonFromTown,
	renderHome as render,
	resetHomeTestState,
	stubDungeonRun,
} from "./HomeTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import Home from "./TestHome";

const setup = (experience = 9) => {
	stubDungeonRun(createCorridorEncounter());
	const create = GameState.createGameState;
	vi.spyOn(GameState, "createGameState").mockImplementationOnce((run) => ({
		...create(run),
		progression: { experience },
		player: {
			health: 10 + (levelForExperience(experience) - 1) * 2,
			maxHealth: 10 + (levelForExperience(experience) - 1) * 2,
		},
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
	return userEvent.setup();
};
afterEach(resetHomeTestState);
describe("Progression on the play screen", () => {
	it("offers a waiting perk from a badge and records the free choice", async () => {
		const user = setup(30);
		expect(
			screen.getByRole("button", { name: "Character, perk available" }),
		).toBeVisible();
		await user.keyboard("c");
		await user.click(
			await screen.findByRole("tab", { name: "Progression, 1 perk available" }),
		);
		const choice = within(
			screen.getByRole("group", { name: "Level 3 perk choice" }),
		);
		const offers = choice.getAllByRole("button", { name: /^Choose / });
		expect(offers).toHaveLength(3);
		const name = offers[0].textContent?.replace("Choose ", "") ?? "";
		await user.click(offers[0]);
		expect(screen.getByLabelText("Chosen perks")).toHaveTextContent(
			`Level 3 · ${name}:`,
		);
		expect(screen.getByText(/No perk is waiting/)).toBeVisible();
		expect(screen.getByRole("tab", { name: "Progression" })).toBeVisible();
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
		expect(screen.getByRole("log")).toHaveTextContent(
			`You choose ${name} (level 3)`,
		);
		await user.keyboard("{Escape}");
		expect(
			await screen.findByRole("button", { name: "Character" }),
		).toBeVisible();
	});
	it("shows capped hit chance and level-20 evasion with an accurate growth explanation", async () => {
		const user = setup(3800);
		await user.keyboard("i");
		expect(screen.getByLabelText("Character evasion")).toHaveTextContent(
			"Evade 45%",
		);
		await user.click(screen.getByRole("tab", { name: /^Progression/ }));
		await user.click(screen.getByText("Stat bonuses and growth"));
		expect(screen.getByText(/Hit 95% · evade 45%/)).toBeVisible();
		expect(
			screen.getByText(/Evasion gains 5 percentage points per 4 Dexterity\./),
		).toBeVisible();
	});
	it("updates level, health, and Character XP from a real kill, then resets on a new adventure", async () => {
		const user = setup();
		expect(screen.getByLabelText("Player level")).toHaveTextContent("Level 1");
		expect(screen.getByLabelText("Player experience")).toHaveTextContent("XP");
		await user.keyboard("d");
		expect(screen.getByLabelText("Player level")).toHaveTextContent("Level 2");
		expect(screen.getByLabelText("Player experience")).toHaveTextContent(
			"4 / 20 XP",
		);
		expect(screen.getByLabelText("Player health")).toHaveTextContent(
			"Health 12 / 12",
		);
		await user.keyboard("c");
		const dialog = within(
			await screen.findByRole("dialog", { name: "The Adventurer's Ledger" }),
		);
		await user.click(dialog.getByRole("tab", { name: /^Progression/ }));
		expect(
			dialog.getByRole("region", { name: "Character progression" }),
		).toBeVisible();
		expect(dialog.getByLabelText("Total experience")).toHaveTextContent(
			"14 XP",
		);
		expect(
			dialog.getByRole("progressbar", { name: "Player experience progress" }),
		).toHaveAttribute("value", "4");
		expect(
			dialog.getByRole("progressbar", { name: "Player experience progress" }),
		).toHaveAttribute(
			"aria-valuetext",
			expect.stringContaining("16 XP to level 3"),
		);
		await user.keyboard("C");
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
		);
		expect(screen.getByLabelText("Dungeon map", { exact: true })).toHaveFocus();
		await user.click(screen.getByRole("button", { name: "New Dungeon" }));
		await user.click(
			screen.getByRole("button", { name: "Start standard adventure" }),
		);
		await enterDungeonFromTown(user);
		expect(screen.getByLabelText("Player experience")).toHaveTextContent(
			"0 / 10 XP",
		);
		expect(screen.getByLabelText("Player level")).toHaveTextContent("Level 1");
		expect(screen.getByLabelText("Player experience")).toHaveTextContent("XP");
		await user.keyboard("i");
		await user.click(screen.getByRole("tab", { name: /^Progression/ }));
		expect(screen.getByLabelText("Total experience")).toHaveTextContent("0 XP");
	});
	it("shows earned Strength and its separate damage contribution", async () => {
		const user = setup(30);
		await user.keyboard("c");
		expect(screen.getByLabelText("Character attack")).toHaveTextContent(
			"Attack 2–4",
		);
		expect(screen.getByText("Base 1 + Strength 1 + weapon 1")).toBeVisible();
		await user.click(screen.getByRole("tab", { name: /^Progression/ }));
		expect(screen.getByLabelText("Character Strength")).toHaveTextContent(
			"Strength 12",
		);
	});
	it("shows Dexterity and the actual accuracy and evasion at level four", async () => {
		const user = setup(60);
		await user.keyboard("i");
		expect(screen.getByLabelText("Character hit chance")).toHaveTextContent(
			"Hit 95%",
		);
		expect(screen.getByLabelText("Character evasion")).toHaveTextContent(
			"Evade 25%",
		);
		await user.click(screen.getByRole("tab", { name: /^Progression/ }));
		expect(screen.getByLabelText("Character Dexterity")).toHaveTextContent(
			"Dexterity 14",
		);
	});
	it("shows maximum level and retained total XP instead of promising level twenty-one", async () => {
		const user = setup(3800);
		await user.keyboard("i");
		const dialog = within(
			await screen.findByRole("dialog", { name: "The Adventurer's Ledger" }),
		);
		await user.click(dialog.getByRole("tab", { name: /^Progression/ }));
		expect(dialog.getByLabelText("Character level")).toHaveTextContent(
			"Level 20",
		);
		expect(dialog.getByLabelText("Total experience")).toHaveTextContent(
			"3800 XP",
		);
		expect(dialog.getByText("Maximum level reached")).toBeVisible();
		expect(dialog.queryByRole("progressbar")).not.toBeInTheDocument();
	});
});
