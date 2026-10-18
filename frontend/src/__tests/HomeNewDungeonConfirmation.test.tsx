import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";
import {
	renderHome as render,
	resetHomeTestState,
	stubDungeonRun,
} from "./HomeTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import Home from "./TestHome";

afterEach(resetHomeTestState);

it.each(["Cancel", "Escape", "Enter"])(
	"preserves the run and restores map focus when dismissed with %s",
	async (dismiss) => {
		const { generate } = stubDungeonRun(createCorridorEncounter());
		render(<Home />);
		const user = userEvent.setup();
		await user.keyboard("{ArrowDown}");
		const before = screen.getByLabelText("Turn count").textContent;
		const map = screen.getByLabelText("Dungeon map", { exact: true });
		const dungeon = screen.getByRole("table", { name: "Dungeon" }).innerHTML;
		const calls = generate.mock.calls.length;
		await user.click(screen.getByRole("button", { name: "New Dungeon" }));
		const dialog = screen.getByRole("dialog", { name: "Start a new dungeon?" });
		expect(dialog).toHaveTextContent("Unsaved progress will be lost");
		await waitFor(() =>
			expect(
				within(dialog).getByRole("button", { name: "Cancel" }),
			).toHaveFocus(),
		);
		await user.keyboard("{ArrowRight}6");
		expect(generate).toHaveBeenCalledTimes(calls);
		if (dismiss === "Cancel")
			await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
		else await user.keyboard(`{${dismiss}}`);
		await waitFor(() => expect(dialog).not.toBeInTheDocument());
		expect(map).toHaveFocus();
		expect(screen.getByLabelText("Turn count").textContent).toBe(before);
		expect(screen.getByRole("table", { name: "Dungeon" }).innerHTML).toBe(
			dungeon,
		);
		expect(generate).toHaveBeenCalledTimes(calls);
		await user.keyboard(" ");
		expect(screen.getByLabelText("Turn count").textContent).not.toBe(before);
	},
);

it("only generates a replacement after explicit confirmation", async () => {
	const { generate } = stubDungeonRun(createCorridorEncounter());
	render(<Home />);
	const user = userEvent.setup();
	await user.keyboard(" ");
	const calls = generate.mock.calls.length;
	await user.click(screen.getByRole("button", { name: "New Dungeon" }));
	expect(generate).toHaveBeenCalledTimes(calls);
	await user.click(screen.getByRole("button", { name: "Start new dungeon" }));
	expect(generate).toHaveBeenCalledTimes(calls + 1);
	await waitFor(() =>
		expect(screen.getByLabelText("Town map", { exact: true })).toHaveFocus(),
	);
	expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
	expect(screen.getByLabelText("Player gold")).toHaveTextContent("Gold 300");
});
