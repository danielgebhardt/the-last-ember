import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";
import App from "../App";
import { DEFAULT_RUN_CONFIGURATION } from "../domain/dungeon/RunConfiguration";
import { resetHomeTestState, stubDungeonRun } from "./HomeTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";

afterEach(resetHomeTestState);
it("recommends a forty-square twenty-floor adventure", () => {
	expect(DEFAULT_RUN_CONFIGURATION).toMatchObject({
		rows: 40,
		cols: 40,
		floorCount: 20,
	});
});
it("uses the recommended configuration on Begin and retains it for random restarts", async () => {
	const { generate } = stubDungeonRun(createCorridorEncounter());
	render(<App />);
	const user = userEvent.setup();
	await user.click(screen.getByRole("button", { name: "Begin Adventure" }));
	expect(generate).toHaveBeenLastCalledWith(
		expect.any(Number),
		20,
		expect.objectContaining({ rows: 40, cols: 40 }),
	);
	await user.click(screen.getByRole("button", { name: "New Dungeon" }));
	await user.click(screen.getByRole("button", { name: "Start new dungeon" }));
	expect(generate).toHaveBeenLastCalledWith(
		expect.any(Number),
		20,
		expect.objectContaining({ rows: 40, cols: 40 }),
	);
	expect(screen.getByLabelText("Town map", { exact: true })).toHaveFocus();
});
