import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import App from "../App";
import * as DungeonRun from "../domain/dungeon/DungeonRun";
import { resetHomeTestState, stubDungeonRun } from "./HomeTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";

afterEach(resetHomeTestState);
it("introduces the quest before generating or playing an adventure", async () => {
	const generate = vi.spyOn(DungeonRun, "generateDungeonRun");
	render(<App />);
	const welcome = screen.getByRole("dialog", {
		name: "The Warden's Flame",
	});
	expect(welcome).toHaveTextContent(
		"For generations, the beacon has kept the darkness beyond your town's walls.",
	);
	expect(welcome).toHaveTextContent(
		"Descend into darkness. Return with the light.",
	);
	expect(welcome).toHaveTextContent(
		"Their abandoned supplies may prove useful on your journey.",
	);
	expect(
		within(welcome).getByRole("button", { name: "Begin Adventure" }),
	).toBeVisible();
	expect(generate).not.toHaveBeenCalled();
	expect(
		screen.queryByRole("table", { name: "Dungeon" }),
	).not.toBeInTheDocument();
	await userEvent.setup().keyboard("{Escape}g h{ArrowRight}");
	expect(generate).not.toHaveBeenCalled();
	expect(welcome).toBeVisible();
});
it("begins a randomly seeded adventure and focuses the map", async () => {
	const { generate } = stubDungeonRun(createCorridorEncounter());
	vi.spyOn(Math, "random").mockReturnValue(0.5);
	render(<App />);
	await userEvent
		.setup()
		.click(screen.getByRole("button", { name: "Begin Adventure" }));
	expect(generate).toHaveBeenCalledWith(
		2147483648,
		20,
		expect.objectContaining({ rows: 40, cols: 40 }),
	);
	expect(
		screen.queryByRole("dialog", { name: "The Warden's Flame" }),
	).not.toBeInTheDocument();
	expect(screen.getByLabelText("Town map", { exact: true })).toHaveFocus();
});
