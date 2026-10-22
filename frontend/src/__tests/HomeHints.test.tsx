import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";
import * as GameState from "../domain/game/GameState";
import { createBag } from "../domain/items/Bag";
import { HINTS_KEY } from "../persistence/HintPreferences";
import {
	openSettings,
	renderHome as render,
	resetHomeTestState,
	stubDungeonRun,
} from "./HomeTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import Home from "./TestHome";

// One shield on the start tile: picking it up is the first new gear.
const renderGearRun = () => {
	stubDungeonRun(createCorridorEncounter());
	const create = GameState.createGameState;
	vi.spyOn(GameState, "createGameState").mockImplementationOnce((run) => ({
		...create(run),
		monsters: [],
		bag: createBag(),
		floorItems: [
			{
				item: { id: "loot:shield", kind: "wooden-shield" },
				floorNumber: 1,
				coordinate: run.playerCoordinate,
			},
		],
	}));
	render(<Home />);
	const map = screen.getByLabelText("Dungeon map", { exact: true });
	map.focus();
	return { user: userEvent.setup(), map };
};
const hint = () => screen.queryByRole("region", { name: "Hint: New gear" });
afterEach(resetHomeTestState);

describe("One-time hints", () => {
	it("shows a hint the first time, dismisses with Escape, and never repeats", async () => {
		const { user, map } = renderGearRun();
		await user.keyboard("g");
		expect(
			await screen.findByRole("region", { name: "Hint: New gear" }),
		).toHaveTextContent(/drag it onto a slot/);
		const turn = screen.getByLabelText("Turn count").textContent;
		await user.keyboard("{Escape}");
		await waitFor(() => expect(hint()).not.toBeInTheDocument());
		expect(map).toHaveFocus();
		expect(screen.getByLabelText("Turn count")).toHaveTextContent(turn ?? "");
		expect(JSON.parse(localStorage.getItem(HINTS_KEY) ?? "{}")).toEqual({
			enabled: true,
			seen: ["gear-drag"],
		});
	});
	it("does not show a hint already seen in this browser", async () => {
		localStorage.setItem(
			HINTS_KEY,
			JSON.stringify({ enabled: true, seen: ["gear-drag"] }),
		);
		const { user } = renderGearRun();
		await user.keyboard("g");
		await screen.findByLabelText("Turn count");
		expect(hint()).not.toBeInTheDocument();
	});
	it("opens Help at the relevant topic from More in Help", async () => {
		const { user } = renderGearRun();
		await user.keyboard("g");
		const region = await screen.findByRole("region", {
			name: "Hint: New gear",
		});
		const scroll = vi.fn();
		const original = Element.prototype.scrollIntoView;
		Element.prototype.scrollIntoView = scroll;
		onTestFinished(() => {
			Element.prototype.scrollIntoView = original;
		});
		await user.click(
			within(region).getByRole("button", { name: "More in Help" }),
		);
		await screen.findByRole("dialog", { name: "Help / Controls" });
		await waitFor(() => expect(scroll).toHaveBeenCalled());
		expect(scroll.mock.contexts[0]).toHaveAttribute("id", "help-equipment");
		expect(hint()).not.toBeInTheDocument();
	});
	it("respects the Settings toggle and can show every hint again", async () => {
		localStorage.setItem(
			HINTS_KEY,
			JSON.stringify({ enabled: true, seen: ["gear-drag", "bag-full"] }),
		);
		const { user } = renderGearRun();
		await openSettings(user);
		const settings = within(screen.getByRole("dialog", { name: "Settings" }));
		await user.click(
			settings.getByRole("button", { name: "Show all hints again" }),
		);
		expect(
			settings.getByRole("button", { name: "Show all hints again" }),
		).toBeDisabled();
		await user.click(
			settings.getByRole("checkbox", { name: "Show hints for new mechanics" }),
		);
		expect(JSON.parse(localStorage.getItem(HINTS_KEY) ?? "{}")).toEqual({
			enabled: false,
			seen: [],
		});
		await user.keyboard("{Escape}");
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
		);
		await user.keyboard("g");
		await screen.findByLabelText("Turn count");
		expect(hint()).not.toBeInTheDocument();
	});
});
