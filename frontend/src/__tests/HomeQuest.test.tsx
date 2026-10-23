import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { ThemeProvider } from "../settings/ThemeProvider";
import { resetHomeTestState, stubDungeonRun } from "./HomeTestHelpers";
import Home from "./TestHome";
import { createThreeFloorTraversalRun } from "./testhelpers";

afterEach(resetHomeTestState);
describe("Visible adventure objective", () => {
	it("reveals the entrance after stepping away and reminds the player on return", async () => {
		const run = createThreeFloorTraversalRun();
		run.floors = [{ ...run.floors[0], downStair: undefined }];
		stubDungeonRun(run);
		render(<Home />, { wrapper: ThemeProvider });
		const user = userEvent.setup();
		await user.keyboard("d");
		expect(screen.getByLabelText("row1col1 - entrance")).toBeVisible();
		await user.keyboard("a");
		expect(screen.getByRole("log")).toHaveTextContent(
			"Return with it to leave",
		);
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 2");
	});
	it.each(["keyboard", "Character"])(
		"recovers through %s and shows the protected pouch",
		async (method) => {
			const run = { ...createThreeFloorTraversalRun(), activeFloor: 3 };
			stubDungeonRun(
				run,
				[],
				[
					{
						item: { id: "quest:cure", kind: "cure" },
						floorNumber: 3,
						coordinate: { row: 1, col: 2 },
					},
				],
			);
			render(<Home />, { wrapper: ThemeProvider });
			const user = userEvent.setup();
			expect(screen.getByLabelText("Quest objective")).toHaveTextContent(
				"Claim the Warden's Flame on floor 3",
			);
			await user.keyboard("d");
			if (method === "keyboard") await user.keyboard("g");
			else {
				await user.click(screen.getByRole("button", { name: "Character" }));
				await user.click(
					screen.getByRole("button", {
						name: "Pick up Warden's Flame, item 1",
					}),
				);
				await user.keyboard("{Escape}");
			}
			expect(screen.getByLabelText("Quest objective")).toHaveTextContent(
				"Return to the entrance on floor 1",
			);
			expect(screen.getByRole("log")).toHaveTextContent(
				"You claim the Warden's Flame.",
			);
			await user.click(screen.getByRole("button", { name: "Character" }));
			const panel = within(
				await screen.findByRole("dialog", { name: "The Adventurer's Ledger" }),
			);
			expect(panel.getByLabelText("Quest pouch")).toHaveTextContent(
				"Flame secured",
			);
			expect(panel.getByLabelText("Bag capacity")).toHaveTextContent("2 / 27");
			expect(
				panel.queryByRole("button", {
					name: /Drink Warden's Flame|Drop Warden's Flame/,
				}),
			).not.toBeInTheDocument();
		},
	);
});
