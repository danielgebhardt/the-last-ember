import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DungeonRun } from "../domain/dungeon/DungeonRun.ts";
import { ThemeProvider } from "../settings/ThemeProvider.tsx";
import { enterDungeonFromTown } from "./HomeTestHelpers";
import {
	closeSettings,
	openSettings,
	resetHomeTestState,
	stubDungeonRun,
	waitForSettingsClosed,
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

	it("clears every floor's memory on seed replay and again on a random restart", async () => {
		stubDungeonRun(linkedCorridors());
		vi.spyOn(Math, "random").mockReturnValue(0);
		const user = userEvent.setup();
		render(<Home initialFogConfiguration={{ enabled: true, radius: 1 }} />, {
			wrapper: ThemeProvider,
		});
		await user.keyboard(walkRight(9));
		await user.keyboard(walkRight(6));
		const seed = await openSettings(user);
		await user.clear(seed);
		await user.type(seed, "123{Enter}");
		await enterDungeonFromTown(user);
		await waitForSettingsClosed();
		expect(screen.getByRole("heading", { name: "Floor 1 of 2" })).toBeVisible();
		expect(
			screen.getByRole("cell", { name: "row1col7 - undiscovered" }),
		).toBeVisible();
		await user.keyboard(walkRight(9));
		expect(
			screen.getByRole("cell", { name: "row1col7 - undiscovered" }),
		).toBeVisible();
		await user.keyboard(walkRight(6));
		await user.click(screen.getByRole("button", { name: "New Dungeon" }));
		await user.click(screen.getByRole("button", { name: "Start new dungeon" }));
		await enterDungeonFromTown(user);
		expect(screen.getByRole("heading", { name: "Floor 1 of 2" })).toBeVisible();
		await user.keyboard(walkRight(9));
		expect(
			screen.getByRole("cell", { name: "row1col7 - undiscovered" }),
		).toBeVisible();
	});

	it("records normal sight while fog is disabled without discovering the entire map", async () => {
		stubDungeonRun(linkedCorridors());
		const user = userEvent.setup();
		render(<Home initialFogConfiguration={{ enabled: false, radius: 1 }} />, {
			wrapper: ThemeProvider,
		});
		expect(
			screen.getByRole("cell", { name: "row1col18 - floor" }),
		).toBeVisible();
		await user.keyboard(walkRight(5));
		await openSettings(user);
		await user.click(
			screen.getByRole("checkbox", { name: "Enable fog of war" }),
		);
		await closeSettings(user);
		expect(
			screen.getByRole("cell", { name: "row1col6 - player" }),
		).toBeVisible();
		expect(
			screen.getByRole("cell", { name: "row1col1 - remembered entrance" }),
		).toBeVisible();
		expect(
			screen.getByRole("cell", { name: "row1col18 - undiscovered" }),
		).toBeVisible();
	});

	it("retains fog preferences across theme changes, new dungeons, and seed replays", async () => {
		stubDungeonRun(linkedCorridors());
		const user = userEvent.setup();
		render(<Home />, { wrapper: ThemeProvider });
		await openSettings(user);
		await user.click(
			screen.getByRole("checkbox", { name: "Enable fog of war" }),
		);
		const radius = screen.getByRole("textbox", { name: "Visibility radius" });
		await user.clear(radius);
		await user.type(radius, "2{Enter}");
		await user.click(screen.getByRole("button", { name: "Light" }));
		await closeSettings(user);
		await user.click(screen.getByRole("button", { name: "New Dungeon" }));
		await user.click(screen.getByRole("button", { name: "Start new dungeon" }));
		await enterDungeonFromTown(user);
		await openSettings(user);
		expect(
			screen.getByRole("checkbox", { name: "Enable fog of war" }),
		).not.toBeChecked();
		expect(
			screen.getByRole("textbox", { name: "Visibility radius" }),
		).toHaveValue("2");
		await user.click(
			screen.getByRole("checkbox", { name: "Enable fog of war" }),
		);
		await user.click(screen.getByRole("button", { name: "Start from seed" }));
		await enterDungeonFromTown(user);
		await waitForSettingsClosed();
		expect(
			screen.getByRole("cell", { name: "row1col8 - undiscovered" }),
		).toBeVisible();
		await openSettings(user);
		expect(
			screen.getByRole("checkbox", { name: "Enable fog of war" }),
		).toBeChecked();
		expect(
			screen.getByRole("textbox", { name: "Visibility radius" }),
		).toHaveValue("2");
	});
});
