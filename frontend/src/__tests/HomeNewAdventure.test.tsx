import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";
import {
	enterDungeonFromTown,
	openCustomAdventure,
	renderHome as render,
	resetHomeTestState,
	stubDungeonRun,
} from "./HomeTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import Home from "./TestHome";

afterEach(resetHomeTestState);

const undiscovered = () =>
	screen
		.getAllByRole("cell")
		.filter((cell) =>
			cell.getAttribute("aria-label")?.endsWith("undiscovered"),
		);

it.each(["Close", "Escape"])(
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
		const dialog = screen.getByRole("dialog", { name: "New adventure" });
		expect(dialog).toHaveTextContent("Unsaved progress is lost");
		await waitFor(() =>
			expect(
				within(dialog).getByRole("button", {
					name: "Start standard adventure",
				}),
			).toHaveFocus(),
		);
		if (dismiss === "Close")
			await user.click(within(dialog).getByRole("button", { name: "Close" }));
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

it("starts the standard adventure at the chosen difficulty with standard sight", async () => {
	const { generate } = stubDungeonRun(createCorridorEncounter());
	render(<Home initialFogConfiguration={{ enabled: false, radius: 8 }} />);
	const user = userEvent.setup();
	await user.keyboard(" ");
	const calls = generate.mock.calls.length;
	await user.click(screen.getByRole("button", { name: "New Dungeon" }));
	const dialog = within(screen.getByRole("dialog", { name: "New adventure" }));
	expect(generate).toHaveBeenCalledTimes(calls);
	await user.click(dialog.getByRole("radio", { name: /Harder/ }));
	await user.click(
		dialog.getByRole("button", { name: "Start standard adventure" }),
	);
	expect(generate).toHaveBeenCalledTimes(calls + 1);
	expect(generate.mock.lastCall).toEqual(
		expect.arrayContaining([
			20,
			expect.objectContaining({ rows: 40, cols: 40 }),
		]),
	);
	await waitFor(() =>
		expect(screen.getByLabelText("Town map", { exact: true })).toHaveFocus(),
	);
	expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
	await enterDungeonFromTown(user);
	expect(undiscovered().length).toBeGreaterThan(0);
	await user.click(screen.getByRole("button", { name: "New Dungeon" }));
	expect(
		screen.getByLabelText("Current adventure difficulty"),
	).toHaveTextContent("Harder");
});

it("fixes a custom adventure's sight for the whole run", async () => {
	stubDungeonRun(createCorridorEncounter());
	render(<Home />);
	const user = userEvent.setup();
	await openCustomAdventure(user);
	const dialog = within(screen.getByRole("dialog", { name: "New adventure" }));
	expect(dialog.getByText(/aren't ranked/)).toBeVisible();
	// These page scenarios play without fog, which the form offers again.
	const fog = dialog.getByRole("checkbox", { name: "Fog of war" });
	expect(fog).not.toBeChecked();
	await user.click(fog);
	const radius = dialog.getByRole("textbox", { name: "Visibility radius" });
	await user.clear(radius);
	await user.type(radius, "21");
	await user.click(
		dialog.getByRole("button", { name: "Start custom adventure" }),
	);
	expect(dialog.getByRole("alert")).toHaveTextContent(
		"Enter a whole number from 1 to 20.",
	);
	await user.click(fog);
	expect(radius).toBeDisabled();
	await user.click(
		dialog.getByRole("button", { name: "Start custom adventure" }),
	);
	await waitFor(() =>
		expect(
			screen.queryByRole("dialog", { name: "New adventure" }),
		).not.toBeInTheDocument(),
	);
	await enterDungeonFromTown(user);
	expect(undiscovered()).toHaveLength(0);
	await user.click(screen.getByRole("button", { name: "Settings" }));
	const settings = await screen.findByRole("dialog", { name: "Settings" });
	expect(within(settings).queryByText(/fog/i)).toBeNull();
	expect(within(settings).queryByRole("textbox")).toBeNull();
});

it("shows why a standard start failed, whichever tab the dialog opens on", async () => {
	const { generate } = stubDungeonRun(createCorridorEncounter());
	render(<Home />);
	const user = userEvent.setup();
	generate.mockImplementationOnce(() => {
		throw new Error("generation failed");
	});
	await user.click(screen.getByRole("button", { name: "New Dungeon" }));
	await user.click(
		screen.getByRole("button", { name: "Start standard adventure" }),
	);
	const dialog = await screen.findByRole("dialog", { name: "New adventure" });
	expect(within(dialog).getByRole("tab", { name: "Standard" })).toHaveAttribute(
		"aria-selected",
		"true",
	);
	expect(within(dialog).getByRole("alert")).toHaveTextContent(
		"Could not create a dungeon",
	);
});
