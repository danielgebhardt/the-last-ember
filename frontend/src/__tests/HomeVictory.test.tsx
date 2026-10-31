import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { ThemeProvider } from "../settings/ThemeProvider";
import {
	openCustomAdventure,
	resetHomeTestState,
	stubDungeonRun,
	waitForNewAdventureClosed,
} from "./HomeTestHelpers";
import Home from "./TestHome";
import { createThreeFloorTraversalRun } from "./testhelpers";

afterEach(resetHomeTestState);
const win = async () => {
	const run = createThreeFloorTraversalRun();
	run.floors = [{ ...run.floors[0], downStair: undefined }];
	stubDungeonRun(
		run,
		[],
		[
			{
				item: { id: "quest:cure", kind: "cure" },
				floorNumber: 1,
				coordinate: { row: 1, col: 2 },
			},
		],
	);
	render(<Home />, { wrapper: ThemeProvider });
	const user = userEvent.setup();
	await user.keyboard("dga");
	const dialog = await screen.findByRole("dialog", {
		name: "The Beacon Burns Again",
	});
	return { user, dialog };
};
describe("Victory summary and ended-run controls", () => {
	it("opens the summary automatically with final values and focus", async () => {
		const { dialog } = await win();
		const summary = within(dialog);
		expect(dialog).toHaveTextContent(
			"By morning, someone has already complained about the smoke.",
		);
		expect(summary.getByLabelText("Victory seed")).toHaveTextContent("123");
		expect(summary.getByLabelText("Victory turns")).toHaveTextContent("3");
		expect(summary.getByLabelText("Victory level")).toHaveTextContent("1");
		expect(summary.getByLabelText("Victory total xp")).toHaveTextContent("0");
		expect(summary.getByLabelText("Victory floors")).toHaveTextContent("1");
		expect(
			summary.getByLabelText("Victory monsters defeated"),
		).toHaveTextContent("0");
		await waitFor(() =>
			expect(
				summary.getByRole("heading", { name: "The Beacon Burns Again" }),
			).toHaveFocus(),
		);
	});
	it("dismisses, freezes gameplay, disables item actions and reopens the same summary", async () => {
		const { user } = await win();
		await user.keyboard("{Escape}");
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
		);
		expect(screen.getByLabelText("Dungeon map", { exact: true })).toHaveFocus();
		await user.keyboard("d g 1");
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 3");
		expect(screen.getByLabelText("Player experience")).toHaveTextContent(
			"0 / 10 XP",
		);
		expect(
			screen.getByRole("button", {
				name: "Potion slot 1: Healing potion, 1 carried",
			}),
		).toBeDisabled();
		await user.click(screen.getByRole("button", { name: "Character" }));
		await user.click(
			screen.getByRole("button", { name: "Main hand: Short sword" }),
		);
		expect(
			screen.getByRole("button", { name: "Unequip main hand" }),
		).toBeDisabled();
		await user.keyboard("{Escape}");
		await user.click(screen.getByRole("button", { name: "Victory summary" }));
		expect(
			await screen.findByRole("dialog", { name: "The Beacon Burns Again" }),
		).toBeVisible();
	});
	it.each(["New Dungeon", "Replay this seed"])(
		"starts a fresh objective via %s",
		async (name) => {
			const { user, dialog } = await win();
			await user.click(within(dialog).getByRole("button", { name }));
			await waitFor(() =>
				expect(
					screen.queryByRole("dialog", { name: "The Beacon Burns Again" }),
				).not.toBeInTheDocument(),
			);
			expect(screen.getByLabelText("Quest objective")).toHaveTextContent(
				"Claim the Warden's Flame",
			);
			expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
			expect(
				screen.queryByRole("button", { name: "Victory summary" }),
			).not.toBeInTheDocument();
		},
	);
	it("keeps victory through invalid settings and resets through the ordinary seed form", async () => {
		const { user } = await win();
		await user.keyboard("{Escape}");
		await openCustomAdventure(user);
		const seed = screen.getByRole("textbox", { name: "Dungeon seed" });
		await user.clear(seed);
		await user.type(seed, "bad");
		await user.click(
			screen.getByRole("button", { name: "Start custom adventure" }),
		);
		expect(screen.getByRole("alert")).toHaveTextContent("Enter a whole number");
		await user.keyboard("{Escape}");
		expect(screen.getByLabelText("Quest objective")).toHaveTextContent(
			"The flame is restored. Your town is saved.",
		);
		await openCustomAdventure(user);
		await user.clear(screen.getByRole("textbox", { name: "Dungeon seed" }));
		await user.type(
			screen.getByRole("textbox", { name: "Dungeon seed" }),
			"123",
		);
		await user.click(
			screen.getByRole("button", { name: "Start custom adventure" }),
		);
		await waitForNewAdventureClosed();
		expect(screen.getByLabelText("Quest objective")).toHaveTextContent(
			"Claim the Warden's Flame",
		);
	});
});
