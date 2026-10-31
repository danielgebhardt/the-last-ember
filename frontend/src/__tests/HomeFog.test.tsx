import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import type { DungeonRun } from "../domain/dungeon/DungeonRun.ts";
import { ThemeProvider } from "../settings/ThemeProvider.tsx";
import {
	closeNewAdventure,
	enterDungeonFromTown,
	openCustomAdventure,
	resetHomeTestState,
	stubDungeonRun,
} from "./HomeTestHelpers.tsx";
import Home from "./TestHome";
import { createTestDungeonFloor } from "./testhelpers.ts";

const corridorRun = (): DungeonRun => ({
	seed: 123,
	activeFloor: 1,
	playerCoordinate: { row: 1, col: 1 },
	floors: [
		createTestDungeonFloor({
			floorNumber: 1,
			rows: 3,
			cols: 20,
			room: { startRow: 1, endRow: 1, startCol: 1, endCol: 18 },
		}),
	],
});

afterEach(resetHomeTestState);

describe("Home fog of war", () => {
	it("starts with fog enabled and an eight-tile radius, offered again for a custom adventure", async () => {
		stubDungeonRun(corridorRun());
		render(<Home />, { wrapper: ThemeProvider });
		expect(
			screen.getByRole("cell", { name: "row1col1 - player" }),
		).toBeVisible();
		expect(
			screen.getByRole("cell", { name: "row1col9 - floor" }),
		).toBeVisible();
		expect(
			screen
				.getByRole("cell", { name: "row1col10 - undiscovered" })
				.querySelector("svg"),
		).toBeNull();
		await openCustomAdventure(userEvent.setup());
		expect(
			screen.getByRole("textbox", { name: "Visibility radius" }),
		).toHaveValue("8");
	});

	it("preserves an explicit six-tile radius while revealing and remembering movement surroundings", async () => {
		stubDungeonRun(corridorRun());
		render(<Home initialFogConfiguration={{ enabled: true, radius: 6 }} />, {
			wrapper: ThemeProvider,
		});
		await userEvent.keyboard(
			"{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}",
		);
		expect(
			screen.getByRole("cell", { name: "row1col8 - player" }),
		).toBeVisible();
		expect(
			screen.getByRole("cell", { name: "row1col1 - remembered entrance" }),
		).toBeVisible();
		expect(
			screen.getByRole("cell", { name: "row1col14 - floor" }),
		).toBeVisible();
	});
	it("starts a custom adventure without fog, showing the whole map", async () => {
		const { generate } = stubDungeonRun(corridorRun());
		const user = userEvent.setup();
		render(<Home />, { wrapper: ThemeProvider });
		await openCustomAdventure(user);
		await user.click(screen.getByRole("checkbox", { name: "Fog of war" }));
		await user.click(
			screen.getByRole("button", { name: "Start custom adventure" }),
		);
		await enterDungeonFromTown(user);
		expect(
			screen.getByRole("cell", { name: "row1col18 - floor" }),
		).toBeVisible();
		expect(generate).toHaveBeenCalledTimes(2);
	});

	it("starts a custom adventure with its chosen radius", async () => {
		stubDungeonRun(corridorRun());
		const user = userEvent.setup();
		render(<Home />, { wrapper: ThemeProvider });
		await openCustomAdventure(user);
		const input = screen.getByRole("textbox", { name: "Visibility radius" });
		await user.clear(input);
		await user.type(input, "2{Enter}");
		await enterDungeonFromTown(user);
		expect(
			screen.getByRole("cell", { name: "row1col3 - floor" }),
		).toBeVisible();
		expect(
			screen.getByRole("cell", { name: "row1col4 - undiscovered" }),
		).toBeVisible();
	});

	it.each(["0", "21", "1.5", "oops"])(
		"refuses radius %j and keeps the current adventure",
		async (value) => {
			const { generate } = stubDungeonRun(corridorRun());
			const user = userEvent.setup();
			render(<Home />, { wrapper: ThemeProvider });
			await openCustomAdventure(user);
			const input = screen.getByRole("textbox", { name: "Visibility radius" });
			await user.clear(input);
			await user.type(input, value);
			await user.click(
				screen.getByRole("button", { name: "Start custom adventure" }),
			);
			expect(input).toHaveAttribute("aria-invalid", "true");
			expect(input).toHaveAccessibleDescription(/whole number from 1 to 20/);
			await closeNewAdventure(user);
			expect(
				screen.getByRole("cell", { name: "row1col9 - floor" }),
			).toBeVisible();
			expect(
				screen.getByRole("cell", { name: "row1col10 - undiscovered" }),
			).toBeVisible();
			expect(generate).toHaveBeenCalledTimes(1);
		},
	);
});
