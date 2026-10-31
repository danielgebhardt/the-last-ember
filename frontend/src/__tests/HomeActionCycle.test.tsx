import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { ThemeProvider } from "../settings/ThemeProvider.tsx";
import {
	closeSettings,
	enterDungeonFromTown,
	openCustomAdventure,
	openSettings,
	resetHomeTestState,
	stubDungeonRun,
	waitForNewAdventureClosed,
} from "./HomeTestHelpers.tsx";
import Home from "./TestHome";
import { createThreeFloorTraversalRun } from "./testhelpers.ts";

afterEach(resetHomeTestState);

describe("Complete exploration action cycle", () => {
	it("keeps position, floor, turn, health, and discovery consistent through a run", async () => {
		const run = createThreeFloorTraversalRun();
		const before = structuredClone(run);
		const { generate } = stubDungeonRun(run);
		const user = userEvent.setup();
		render(<Home initialFogConfiguration={{ enabled: true, radius: 1 }} />, {
			wrapper: ThemeProvider,
		});
		await user.keyboard("ddd");
		expect(screen.getByRole("heading", { name: "Floor 3 of 3" })).toBeVisible();
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 3");
		expect(screen.getByLabelText("row1col1 - player")).toBeVisible();
		expect(screen.getByLabelText("row2col2 - undiscovered")).toBeVisible();
		await user.keyboard("{ArrowUp}"); // A wall on the destination floor.
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 3");
		await user.keyboard("d");
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 4");
		expect(screen.getByLabelText("row2col2 - floor")).toBeVisible();
		await openSettings(user);
		await user.click(screen.getByRole("button", { name: "Light" }));
		await user.keyboard("{ArrowLeft}"); // Settings must suspend movement.
		await closeSettings(user);
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 4");
		await user.keyboard("aaa");
		expect(screen.getByRole("heading", { name: "Floor 1 of 3" })).toBeVisible();
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 7");
		expect(screen.getByLabelText("Player health")).toHaveTextContent(
			"Health 10 / 10",
		);
		expect(generate).toHaveBeenCalledTimes(1);
		expect(run).toEqual(before);
		const replaySeed = await openCustomAdventure(user);
		await user.clear(replaySeed);
		await user.type(replaySeed, "123{Enter}");
		await enterDungeonFromTown(user);
		await waitForNewAdventureClosed();
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
		await user.keyboard("ddd");
		expect(screen.getByLabelText("row2col2 - undiscovered")).toBeVisible();
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 3");
	});
});
