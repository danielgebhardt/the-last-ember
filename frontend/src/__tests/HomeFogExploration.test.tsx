import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import type { DungeonRun } from "../domain/dungeon/DungeonRun.ts";
import { ThemeProvider } from "../settings/ThemeProvider.tsx";
import { enterDungeonFromTown } from "./HomeTestHelpers";
import {
	openCustomAdventure,
	resetHomeTestState,
	stubDungeonRun,
	waitForNewAdventureClosed,
} from "./HomeTestHelpers.tsx";
import Home from "./TestHome";
import { createTestDungeonFloor } from "./testhelpers.ts";

// Two long rooms allow discoveries well outside the radius to be checked after
// stair travel. Floor 1's down stair is nine steps right of the initial player.
const linkedCorridors = (): DungeonRun => {
	const room = { startRow: 1, endRow: 1, startCol: 1, endCol: 18 };
	return {
		seed: 123,
		activeFloor: 1,
		playerCoordinate: { row: 1, col: 1 },
		floors: [
			createTestDungeonFloor({
				floorNumber: 1,
				rows: 3,
				cols: 20,
				room,
				downStair: {
					coordinate: { row: 1, col: 10 },
					destinationFloor: 2,
					arrivalCoordinate: { row: 1, col: 1 },
				},
			}),
			createTestDungeonFloor({
				floorNumber: 2,
				rows: 3,
				cols: 20,
				room,
				upStair: {
					coordinate: { row: 1, col: 1 },
					destinationFloor: 1,
					arrivalCoordinate: { row: 1, col: 10 },
				},
			}),
		],
	};
};
const walkRight = (steps: number) => "{ArrowRight}".repeat(steps);
const walkLeft = (steps: number) => "{ArrowLeft}".repeat(steps);

afterEach(resetHomeTestState);

describe("Fog across complete dungeon runs", () => {
	it("retains each floor's discoveries on repeated stair travel without changing terrain or links", async () => {
		const run = linkedCorridors();
		const before = structuredClone(run);
		const { generate } = stubDungeonRun(run);
		const user = userEvent.setup();
		render(<Home initialFogConfiguration={{ enabled: true, radius: 1 }} />, {
			wrapper: ThemeProvider,
		});
		await user.keyboard(walkRight(9));
		expect(screen.getByRole("heading", { name: "Floor 2 of 2" })).toBeVisible();
		await user.keyboard(walkRight(6));
		expect(
			screen.getByRole("cell", { name: "row1col7 - player" }),
		).toBeVisible();
		await user.keyboard(walkLeft(6));
		expect(screen.getByRole("heading", { name: "Floor 1 of 2" })).toBeVisible();
		expect(
			screen.getByRole("cell", { name: "row1col1 - remembered entrance" }),
		).toBeVisible();
		await user.keyboard("{ArrowLeft}{ArrowRight}");
		expect(screen.getByRole("heading", { name: "Floor 2 of 2" })).toBeVisible();
		expect(
			screen.getByRole("cell", { name: "row1col7 - remembered floor" }),
		).toBeVisible();
		expect(generate).toHaveBeenCalledTimes(1);
		expect(run).toEqual(before);
	});

	it("clears every floor's memory on each seed replay, keeping the adventure's sight", async () => {
		stubDungeonRun(linkedCorridors());
		const user = userEvent.setup();
		render(<Home initialFogConfiguration={{ enabled: true, radius: 1 }} />, {
			wrapper: ThemeProvider,
		});
		for (const replay of ["123", "456"]) {
			await user.keyboard(walkRight(9));
			await user.keyboard(walkRight(6));
			const seed = await openCustomAdventure(user);
			expect(
				screen.getByRole("textbox", { name: "Visibility radius" }),
			).toHaveValue("1");
			await user.clear(seed);
			await user.type(seed, `${replay}{Enter}`);
			await waitForNewAdventureClosed();
			await enterDungeonFromTown(user);
			expect(
				screen.getByRole("heading", { name: "Floor 1 of 2" }),
			).toBeVisible();
			expect(
				screen.getByRole("cell", { name: "row1col7 - undiscovered" }),
			).toBeVisible();
			await user.keyboard(walkRight(9));
			expect(
				screen.getByRole("cell", { name: "row1col7 - undiscovered" }),
			).toBeVisible();
		}
	});

	it("offers the current adventure's sight for the next custom one, and standard sight after a standard one", async () => {
		stubDungeonRun(linkedCorridors());
		const user = userEvent.setup();
		render(<Home />, { wrapper: ThemeProvider });
		await openCustomAdventure(user);
		const radius = screen.getByRole("textbox", { name: "Visibility radius" });
		await user.clear(radius);
		await user.type(radius, "2");
		await user.click(screen.getByRole("checkbox", { name: "Fog of war" }));
		await user.click(
			screen.getByRole("button", { name: "Start custom adventure" }),
		);
		await waitForNewAdventureClosed();
		await openCustomAdventure(user);
		expect(
			screen.getByRole("checkbox", { name: "Fog of war" }),
		).not.toBeChecked();
		expect(
			screen.getByRole("textbox", { name: "Visibility radius" }),
		).toHaveValue("2");
		await user.click(screen.getByRole("tab", { name: "Standard" }));
		await user.click(
			screen.getByRole("button", { name: "Start standard adventure" }),
		);
		await waitForNewAdventureClosed();
		await openCustomAdventure(user);
		expect(screen.getByRole("checkbox", { name: "Fog of war" })).toBeChecked();
		expect(
			screen.getByRole("textbox", { name: "Visibility radius" }),
		).toHaveValue("8");
	});
});
