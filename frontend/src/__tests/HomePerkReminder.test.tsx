import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as GameState from "../domain/game/GameState";
import {
	experienceThreshold,
	levelForExperience,
} from "../domain/game/Progression";
import {
	renderHome as render,
	resetHomeTestState,
	stubDungeonRun,
} from "./HomeTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import Home from "./TestHome";

const setup = (level: number, health?: number) => {
	stubDungeonRun(createCorridorEncounter());
	const create = GameState.createGameState;
	const experience = experienceThreshold(level);
	const maxHealth = 10 + (levelForExperience(experience) - 1) * 2;
	vi.spyOn(GameState, "createGameState").mockImplementationOnce((run) => ({
		...create(run),
		progression: { experience },
		player: { health: health ?? maxHealth, maxHealth },
		monsters: [],
	}));
	render(<Home />);
	screen.getByLabelText("Dungeon map", { exact: true }).focus();
	return userEvent.setup();
};
const pill = () =>
	screen.queryByRole("button", { name: /: choose in Progression$/ });
const characterBadge = () =>
	screen.queryByRole("button", { name: "Character, perk available" });
const ledger = () =>
	screen.findByRole("dialog", { name: "The Adventurer's Ledger" });

afterEach(resetHomeTestState);
describe("Perk reminders", () => {
	it("shows nothing before the first perk level", () => {
		setup(2);
		expect(pill()).toBeNull();
		expect(characterBadge()).toBeNull();
		expect(screen.getByRole("button", { name: "Character" })).toBeVisible();
	});

	it("names one waiting perk, opens Progression on its choices, and clears once chosen", async () => {
		const user = setup(3);
		expect(pill()).toHaveAccessibleName("Choose perk: choose in Progression");
		expect(pill()).toHaveTextContent("Choose perk");
		expect(characterBadge()).toHaveTextContent("Perk");
		await user.click(pill() as HTMLElement);
		const dialog = within(await ledger());
		expect(dialog.getByRole("tab", { selected: true })).toHaveTextContent(
			/^Progression/,
		);
		const choice = within(
			dialog.getByRole("group", { name: "Level 3 perk choice" }),
		);
		await user.click(choice.getAllByRole("button", { name: /^Choose / })[0]);
		await user.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		expect(screen.getByLabelText("Dungeon map", { exact: true })).toHaveFocus();
		expect(pill()).toBeNull();
		expect(characterBadge()).toBeNull();
	});

	it("counts several waiting perks", () => {
		setup(5);
		expect(pill()).toHaveTextContent("2 perks");
		expect(pill()).toHaveAccessibleName("2 perks: choose in Progression");
	});

	it("still opens Character on its own tab by key or button after using the reminder", async () => {
		const user = setup(3);
		await user.click(pill() as HTMLElement);
		await ledger();
		await user.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		await user.keyboard("c");
		expect(
			within(await ledger()).getByRole("tab", { selected: true }),
		).toHaveTextContent(/^Character/);
		await user.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		await user.click(characterBadge() as HTMLElement);
		expect(
			within(await ledger()).getByRole("tab", { selected: true }),
		).toHaveTextContent(/^Character/);
	});

	it("stops reminding after death, when perks can no longer be chosen", () => {
		setup(3, 0);
		expect(pill()).toBeNull();
		expect(characterBadge()).toBeNull();
	});
});
