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
	it("shows capped hit chance and diminished evasion with an accurate growth explanation", async () => {
		const user = setup(3800);
		await user.keyboard("i");
		expect(screen.getByLabelText("Character evasion")).toHaveTextContent(
			"Evade 55%",
		);
		await user.click(screen.getByText("Stat bonuses and growth"));
		expect(screen.getByText(/Hit 95% · evade 55%/)).toBeVisible();
		expect(screen.getByText(/through 20, then per 4 Dexterity/)).toBeVisible();
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
			await screen.findByRole("dialog", { name: "Character" }),
		);
		expect(
			dialog.getByRole("region", { name: "Character progression" }),
		).toBeVisible();
		expect(dialog.getByLabelText("Total experience")).toHaveTextContent(
			"14 XP",
		);
		expect(
			dialog.getByRole("progressbar", { name: "Experience progress" }),
		).toHaveAttribute("value", "4");
		expect(dialog.getByLabelText("Experience to next level")).toHaveTextContent(
			"16 XP to level 3",
		);
		await user.keyboard("C");
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
		);
		expect(screen.getByLabelText("Dungeon map", { exact: true })).toHaveFocus();
		await user.click(screen.getByRole("button", { name: "New Dungeon" }));
		await user.click(screen.getByRole("button", { name: "Start new dungeon" }));
		await enterDungeonFromTown(user);
		expect(screen.getByLabelText("Player experience")).toHaveTextContent(
			"0 / 10 XP",
		);
		expect(screen.getByLabelText("Player level")).toHaveTextContent("Level 1");
		expect(screen.getByLabelText("Player experience")).toHaveTextContent("XP");
		await user.keyboard("i");
		expect(screen.getByLabelText("Total experience")).toHaveTextContent("0 XP");
	});
	it("shows earned Strength and its separate damage contribution", async () => {
		const user = setup(30);
		await user.keyboard("c");
		expect(screen.getByLabelText("Character Strength")).toHaveTextContent(
			"Strength 12",
		);
		expect(screen.getByLabelText("Character attack")).toHaveTextContent(
			"Attack 2–4",
		);
		expect(screen.getByText("Base 1 + Strength 1 + weapon 1")).toBeVisible();
	});
	it("shows Dexterity and the actual accuracy and evasion at level four", async () => {
		const user = setup(60);
		await user.keyboard("i");
		expect(screen.getByLabelText("Character Dexterity")).toHaveTextContent(
			"Dexterity 14",
		);
		expect(screen.getByLabelText("Character hit chance")).toHaveTextContent(
			"Hit 95%",
		);
		expect(screen.getByLabelText("Character evasion")).toHaveTextContent(
			"Evade 30%",
		);
	});
	it("shows maximum level and retained total XP instead of promising level twenty-one", async () => {
		const user = setup(3800);
		await user.keyboard("i");
		const dialog = within(
			await screen.findByRole("dialog", { name: "Character" }),
		);
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
