import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import {
	readDungeonCells,
	renderHome as render,
	resetHomeTestState,
	stubDungeonRun,
} from "./HomeTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import Home from "./TestHome";

const renderHelpRun = () => {
	stubDungeonRun(createCorridorEncounter());
	render(<Home />);
	return userEvent.setup();
};
const openHelp = async (user: ReturnType<typeof userEvent.setup>) => {
	await user.click(screen.getByRole("button", { name: "Help" }));
	return screen.findByRole("dialog", { name: "Help / Controls" });
};
afterEach(resetHomeTestState);

describe("Home Help menu", () => {
	it("shows Help beside Settings in the header", () => {
		renderHelpRun();
		const header = within(screen.getByRole("banner"));
		expect(header.getByRole("button", { name: "Help" })).toBeVisible();
		expect(header.getByRole("button", { name: "Settings" })).toBeVisible();
	});
	it("opens the Help and Controls sheet without opening Settings", async () => {
		const user = renderHelpRun();
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		const panel = await openHelp(user);
		expect(
			within(panel).getByRole("heading", { name: "Help / Controls" }),
		).toBeVisible();
		expect(
			screen.queryByRole("dialog", { name: "Settings" }),
		).not.toBeInTheDocument();
	});
	it("explains movement, waiting, attacking, stairs, and dismissal", async () => {
		const user = renderHelpRun();
		const help = within(await openHelp(user));
		for (const direction of ["up", "left", "down", "right"]) {
			expect(help.getByText(`Move ${direction}`)).toBeVisible();
			expect(help.getByLabelText(`Arrow ${direction}`)).toBeVisible();
		}
		for (const key of ["W", "A", "S", "D", "Space", "G", "I", "C", "Esc"]) {
			expect(help.getByText(key, { selector: "kbd" })).toBeVisible();
		}
		expect(help.getByText("Wait one turn")).toBeVisible();
		expect(help.getByText("Pick up an item")).toBeVisible();
		expect(help.getByText("Use potion shortcut")).toBeVisible();
		expect(help.getByText("Enter", { selector: "kbd" })).toBeVisible();
		expect(
			help.getByText(
				"Enter the dungeon at the town gate / return to town at the dungeon exit",
			),
		).toBeVisible();
		for (const key of ["1", "2", "3", "4"])
			expect(help.getByText(key, { selector: "kbd" })).toBeVisible();
		expect(
			help.getByText(/G to pick up an item on your current tile/),
		).toBeVisible();
		expect(
			help.getByText(/Stay in place while monsters take their turn/),
		).toBeVisible();
		expect(help.getByText(/Move into a monster to attack/)).toBeVisible();
		expect(
			help.getByText(/Enter a stair tile to change floors automatically/),
		).toBeVisible();
		expect(
			help.getByText(/Blocked movement does not use a turn/),
		).toBeVisible();
		expect(help.getByText("Close this sheet")).toBeVisible();
	});
	it("explains that only capable pursuers can spend an action opening ordinary doors", async () => {
		const user = renderHelpRun();
		const help = within(await openHelp(user));
		expect(help.getByText(/Orcs, cultists and necromancers/)).toHaveTextContent(
			/whole action.*elite gates/i,
		);
		expect(
			help.queryByText(/monsters do not open them yet/),
		).not.toBeInTheDocument();
	});
	it("explains earned attributes, the health benefit, and the level cap", async () => {
		const user = renderHelpRun();
		const help = within(await openHelp(user));
		const progression = within(
			help.getByRole("region", { name: "Character progression" }),
		);
		expect(
			progression.getByText(/Strength adds to melee damage/),
		).toBeVisible();
		expect(
			progression.getByText(/Dexterity improves accuracy and evasion/),
		).toBeVisible();
		expect(progression.getByText(/without.*full heal/)).toBeVisible();
		expect(progression.getByText(/capped at 20/)).toBeVisible();
	});
	it.each(["Escape", "Close button"])(
		"dismisses with %s and restores focus without consuming a turn",
		async (method) => {
			const user = renderHelpRun();
			const before = readDungeonCells();
			const panel = await openHelp(user);
			if (method === "Escape") await user.keyboard("{Escape}");
			else
				await user.click(within(panel).getByRole("button", { name: "Close" }));
			await waitFor(() =>
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
			);
			expect(
				screen.getByLabelText("Dungeon map", { exact: true }),
			).toHaveFocus();
			expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
			expect(readDungeonCells()).toEqual(before);
		},
	);
	it("opens from the keyboard and keeps Space on the Help button from waiting", async () => {
		const user = renderHelpRun();
		screen.getByRole("button", { name: "New Dungeon" }).focus(); // Start at the first header control
		await user.tab(); // Character
		await user.tab(); // Save/Load
		await user.tab(); // Settings
		await user.tab(); // Help
		expect(screen.getByRole("button", { name: "Help" })).toHaveFocus();
		await user.keyboard("{Enter}");
		expect(
			await screen.findByRole("dialog", { name: "Help / Controls" }),
		).toBeVisible();
		await user.keyboard("{Escape}");
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
		);
		screen.getByRole("button", { name: "Help" }).focus();
		await user.keyboard(" ");
		expect(
			await screen.findByRole("dialog", { name: "Help / Controls" }),
		).toBeVisible();
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
	});
	it("suspends movement and waiting while open, then resumes both on the map", async () => {
		const user = renderHelpRun();
		const before = readDungeonCells();
		const log = screen.getByRole("log").textContent;
		await openHelp(user);
		await user.keyboard("{ArrowRight}d ");
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
		expect(readDungeonCells()).toEqual(before);
		expect(screen.getByRole("log").textContent).toBe(log);
		await user.keyboard("{Escape}");
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
		);
		screen.getByLabelText("Dungeon map", { exact: true }).focus();
		await user.keyboard("{ArrowRight} ");
		expect(screen.getByLabelText("row1col2 - player")).toBeVisible();
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 2");
	});
	it("keeps Settings drafts when Help is opened and closed", async () => {
		const user = renderHelpRun();
		await user.click(screen.getByRole("button", { name: "Settings" }));
		const input = await screen.findByRole("textbox", { name: "Dungeon seed" });
		await user.clear(input);
		await user.type(input, "456");
		await user.keyboard("{Escape}");
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
		);
		await openHelp(user);
		await user.keyboard("{Escape}");
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
		);
		await user.click(screen.getByRole("button", { name: "Settings" }));
		expect(
			await screen.findByRole("textbox", { name: "Dungeon seed" }),
		).toHaveValue("456");
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
	});
	it("explains map symbols and fog states in Help even when fog is disabled", async () => {
		const user = renderHelpRun();
		const help = await openHelp(user);
		const symbols = within(help).getByRole("region", { name: "Map symbols" });
		const legend = within(symbols).getByRole("list", {
			name: "Dungeon legend",
		});

		for (const [label, description] of [
			["Player", "Your current position."],
			["Stairs up", "Leads to the floor above."],
			["Stairs down", "Leads to the floor below."],
			["Visible", "Currently in sight."],
			["Remembered", "Explored before, but outside current sight."],
			["Undiscovered", "Not explored yet."],
		]) {
			expect(within(legend).getByText(label)).toBeVisible();
			expect(within(legend).getByText(description)).toBeVisible();
		}
		expect(
			within(symbols).getByText(
				"Visibility shading applies when fog of war is enabled.",
			),
		).toBeVisible();
	});
	it("explains enemy range, cover and the committed response to a prepared attack", async () => {
		const user = renderHelpRun();
		const help = await openHelp(user);
		const tactics = within(help).getByRole("region", { name: "Enemy tactics" });
		expect(tactics).toHaveTextContent("Goblin archer");
		expect(tactics).toHaveTextContent("2–4");
		expect(tactics).toHaveTextContent("Walls block sight and shots");
		expect(tactics).toHaveTextContent("one committed action");
		expect(tactics).toHaveTextContent("move away to dodge");
		expect(tactics).toHaveTextContent(
			"Healing, casting and gear changes use your response",
		);
	});
	it("explains Disease, both cures and the sanctuary fees", async () => {
		const user = renderHelpRun();
		const help = await openHelp(user);
		expect(help).toHaveTextContent("Disease lowers maximum HP by 20%");
		expect(help).toHaveTextContent("A Cure Disease potion removes it");
		expect(help).toHaveTextContent("restores maximum HP but not lost HP");
		expect(help).toHaveTextContent("poison 40 gold, Disease 150 gold");
		expect(help).toHaveTextContent("Slowed lowers evasion by 10 points");
		expect(help).toHaveTextContent("it also cures Mana Burn");
		expect(help).toHaveTextContent("Slowed 50 gold");
	});
	it("explains the Forgotten Forge's prices, odds and fixed result", async () => {
		const user = renderHelpRun();
		const help = await openHelp(user);
		expect(help).toHaveTextContent("about 40% of new adventures");
		expect(help).toHaveTextContent("Reliable forging costs 300 gold");
		expect(help).toHaveTextContent(
			"50% +1, 35% unchanged, 15% the item is destroyed",
		);
		expect(help).toHaveTextContent("cannot reroll it");
	});
	it("explains Wishing Well offerings, odds and the fixed result", async () => {
		const user = renderHelpRun();
		const help = await openHelp(user);
		expect(help).toHaveTextContent("one offering of 50, 100 or 250 gold");
		expect(help).toHaveTextContent("reward chance (40%, 55%, 70%)");
		expect(help).toHaveTextContent("a larger offering can only improve it");
	});
});
