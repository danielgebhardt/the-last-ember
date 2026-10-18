import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as DungeonRun from "../domain/dungeon/DungeonRun.ts";
import { enterDungeonFromTown } from "./HomeTestHelpers";
import {
	closeSettings,
	DEFAULT_DUNGEON_CONFIG,
	openSettings,
	readDungeonCells,
	renderHome as render,
	resetHomeTestState,
	waitForSettingsClosed,
} from "./HomeTestHelpers.tsx";
import Home from "./TestHome";
import { createThreeFloorTraversalRun } from "./testhelpers.ts";

afterEach(resetHomeTestState);

describe("Home seed replay", () => {
	const mockRunGeneration = () => {
		const generate = vi
			.spyOn(DungeonRun, "generateDungeonRun")
			.mockImplementation((seed) => ({
				...createThreeFloorTraversalRun(),
				seed,
			}));
		vi.spyOn(DungeonRun, "connectDungeonFloors").mockImplementation(
			(run) => run,
		);
		return generate;
	};

	it("displays the current run seed independently of the edited seed", async () => {
		const user = userEvent.setup();
		const generate = mockRunGeneration();
		render(<Home />);
		const input = await openSettings(user);
		expect(screen.getByLabelText("Current dungeon seed")).toHaveTextContent(
			/^0$/,
		);
		await user.clear(input);
		await user.type(input, "123");
		expect(screen.getByLabelText("Current dungeon seed")).toHaveTextContent(
			/^0$/,
		);
		await closeSettings(user);
		expect(generate).toHaveBeenCalledTimes(1);
	});

	it("submits an entered seed with the current configuration, closes settings, and resets depth and position", async () => {
		const user = userEvent.setup();
		const generate = mockRunGeneration();
		render(<Home />);
		await user.keyboard("{ArrowRight}{ArrowRight}");
		expect(screen.getByRole("heading", { name: "Floor 2 of 3" })).toBeVisible();
		const input = await openSettings(user);
		await user.clear(input);
		await user.type(input, "123");
		await user.click(screen.getByRole("button", { name: "Start from seed" }));
		await enterDungeonFromTown(user);
		await waitForSettingsClosed();
		expect(screen.getByLabelText("Dungeon map", { exact: true })).toHaveFocus();
		expect(generate).toHaveBeenCalledTimes(2);
		expect(generate).toHaveBeenLastCalledWith(123, 5, DEFAULT_DUNGEON_CONFIG);
		expect(screen.getByRole("heading", { name: "Floor 1 of 3" })).toBeVisible();
		expect(
			screen.getByRole("cell", { name: "row1col1 - player" }),
		).toBeVisible();
		expect(await openSettings(user)).toHaveValue("123");
		expect(screen.getByLabelText("Current dungeon seed")).toHaveTextContent(
			/^123$/,
		);
	});

	it("resets repeated replays of the same seed, including submission with Enter", async () => {
		const user = userEvent.setup();
		const generate = mockRunGeneration();
		render(<Home />);
		for (let replay = 0; replay < 2; replay++) {
			await user.keyboard("{ArrowRight}");
			expect(
				screen.getByRole("heading", { name: "Floor 2 of 3" }),
			).toBeVisible();
			const input = await openSettings(user);
			await user.clear(input);
			await user.type(input, "0{Enter}");
			await enterDungeonFromTown(user);
			await waitForSettingsClosed();
			expect(
				screen.getByRole("heading", { name: "Floor 1 of 3" }),
			).toBeVisible();
			expect(
				screen.getByRole("cell", { name: "row1col1 - player" }),
			).toBeVisible();
		}
		expect(generate).toHaveBeenCalledTimes(3);
	});

	it("keeps typing and arrow keys separate from movement and retains the run on rerender", async () => {
		const user = userEvent.setup();
		const generate = mockRunGeneration();
		const { rerender } = render(<Home />);
		const dungeon = screen.getByRole("table", { name: "Dungeon" });
		const before = readDungeonCells(dungeon);
		const input = await openSettings(user);
		await user.clear(input);
		await user.type(input, "wasd");
		await user.keyboard("{ArrowLeft}{ArrowRight}{ArrowUp}{ArrowDown}");
		rerender(<Home />);
		expect(input).toHaveValue("wasd");
		expect(readDungeonCells(dungeon)).toEqual(before);
		expect(generate).toHaveBeenCalledTimes(1);
	});

	it("reports an invalid seed and keeps settings open without changing the explored run", async () => {
		const value = "abc";
		const user = userEvent.setup();
		const generate = mockRunGeneration();
		render(<Home />);
		await user.keyboard("{ArrowRight}");
		const dungeon = screen.getByRole("table", { name: "Dungeon" });
		const before = readDungeonCells(dungeon);
		const input = await openSettings(user);
		await user.clear(input);
		if (value) await user.type(input, value);
		await user.click(screen.getByRole("button", { name: "Start from seed" }));
		expect(screen.getByRole("dialog", { name: "Settings" })).toBeVisible();
		expect(screen.getByRole("alert")).toHaveTextContent(
			"Enter a whole number from 0 to 4294967295.",
		);
		expect(input).toHaveAttribute("aria-invalid", "true");
		expect(input).toHaveAccessibleDescription(
			"Enter a whole number from 0 to 4294967295.",
		);
		expect(readDungeonCells(dungeon)).toEqual(before);
		expect(screen.getByLabelText("Current dungeon seed")).toHaveTextContent(
			/^0$/,
		);
		await closeSettings(user);
		expect(screen.getByRole("heading", { name: "Floor 2 of 3" })).toBeVisible();
		expect(generate).toHaveBeenCalledTimes(1);
	});

	it("clears invalid feedback after correction and accepts a normalized seed", async () => {
		const user = userEvent.setup();
		const generate = mockRunGeneration();
		render(<Home />);
		const input = await openSettings(user);
		await user.clear(input);
		await user.type(input, "bad{Enter}");
		expect(screen.getByRole("alert")).toBeVisible();
		await user.clear(input);
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
		await user.type(input, " 00123 {Enter}");
		await enterDungeonFromTown(user);
		await waitForSettingsClosed();
		const reopenedInput = await openSettings(user);
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
		expect(reopenedInput).toHaveAttribute("aria-invalid", "false");
		expect(reopenedInput).toHaveValue("123");
		expect(screen.getByLabelText("Current dungeon seed")).toHaveTextContent(
			/^123$/,
		);
		expect(generate).toHaveBeenCalledTimes(2);
	});

	it.each([
		{ random: 0, expected: "0" },
		{ random: 0.5, expected: "2147483648" },
		{ random: 1 - Number.EPSILON, expected: "4294967295" },
	])(
		"shows the current random seed $expected on reopening and clears invalid feedback",
		async ({ random, expected }) => {
			const user = userEvent.setup();
			mockRunGeneration();
			vi.spyOn(Math, "random").mockReturnValue(random);
			render(<Home />);
			const input = await openSettings(user);
			await user.clear(input);
			await user.type(input, "bad{Enter}");
			await closeSettings(user);
			await user.click(screen.getByRole("button", { name: "New Dungeon" }));
			await user.click(
				screen.getByRole("button", { name: "Start new dungeon" }),
			);
			expect(await openSettings(user)).toHaveValue(expected);
			expect(screen.getByLabelText("Current dungeon seed").textContent).toBe(
				expected,
			);
			expect(screen.queryByRole("alert")).not.toBeInTheDocument();
		},
	);

	it("accepts the maximum unsigned 32-bit seed", async () => {
		const user = userEvent.setup();
		const generate = mockRunGeneration();
		render(<Home />);
		const input = await openSettings(user);
		await user.clear(input);
		await user.type(input, "4294967295{Enter}");
		await enterDungeonFromTown(user);
		await waitForSettingsClosed();
		expect(generate).toHaveBeenLastCalledWith(
			4294967295,
			5,
			expect.any(Object),
		);
		expect(generate).toHaveBeenCalledTimes(2);
		expect(await openSettings(user)).toHaveValue("4294967295");
		expect(screen.getByLabelText("Current dungeon seed")).toHaveTextContent(
			/^4294967295$/,
		);
	});

	it("replays the actual complete dungeon and its rendered first floor after another seed", async () => {
		const user = userEvent.setup();
		const connect = vi.spyOn(DungeonRun, "connectDungeonFloors");
		render(<Home />);
		const originalRun = structuredClone(connect.mock.results[0].value);
		const originalTerrain = readDungeonCells(
			screen.getByRole("table", {
				name: "Dungeon",
			}),
		);
		let input = await openSettings(user);
		await user.clear(input);
		await user.type(input, "123{Enter}");
		await enterDungeonFromTown(user);
		await waitForSettingsClosed();
		expect(
			readDungeonCells(screen.getByRole("table", { name: "Dungeon" })),
		).not.toEqual(originalTerrain);
		input = await openSettings(user);
		await user.clear(input);
		await user.type(input, "0{Enter}");
		await enterDungeonFromTown(user);
		await waitForSettingsClosed();
		expect(connect.mock.results[2].value).toEqual(originalRun);
		expect(
			readDungeonCells(screen.getByRole("table", { name: "Dungeon" })),
		).toEqual(originalTerrain);
		expect(screen.getByRole("heading", { name: "Floor 1 of 5" })).toBeVisible();
	});

	it("preserves depth, player, terrain, and links when a draft is dismissed", async () => {
		const user = userEvent.setup();
		const generate = mockRunGeneration();
		render(<Home />);
		await user.keyboard("{ArrowRight}{ArrowRight}");
		const before = readDungeonCells(
			screen.getByRole("table", { name: "Dungeon" }),
		);
		const input = await openSettings(user);
		await user.clear(input);
		await user.type(input, "456");
		await closeSettings(user);
		expect(screen.getByRole("heading", { name: "Floor 2 of 3" })).toBeVisible();
		expect(
			screen.getByRole("cell", { name: "row1col2 - player" }),
		).toBeVisible();
		expect(
			readDungeonCells(screen.getByRole("table", { name: "Dungeon" })),
		).toEqual(before);
		expect(generate).toHaveBeenCalledTimes(1);
		expect(await openSettings(user)).toHaveValue("456");
		expect(screen.getByLabelText("Current dungeon seed")).toHaveTextContent(
			/^0$/,
		);
		await closeSettings(user);
		await user.keyboard("{ArrowRight}");
		expect(screen.getByRole("heading", { name: "Floor 3 of 3" })).toBeVisible();
	});

	it("suspends all game movement and stair transitions while focus is on a settings button", async () => {
		const user = userEvent.setup();
		const generate = mockRunGeneration();
		render(<Home />);
		const dungeon = screen.getByRole("table", { name: "Dungeon" });
		const before = readDungeonCells(dungeon);
		await openSettings(user);
		screen.getByRole("button", { name: "Start from seed" }).focus();
		for (const key of [
			"{ArrowRight}",
			"{ArrowLeft}",
			"{ArrowUp}",
			"{ArrowDown}",
			"w",
			"a",
			"s",
			"d",
		]) {
			await user.keyboard(key);
			expect(readDungeonCells(dungeon)).toEqual(before);
		}
		await closeSettings(user);
		expect(
			screen.getByRole("cell", { name: "row1col1 - player" }),
		).toBeVisible();
		await user.keyboard("{ArrowRight}");
		expect(screen.getByRole("heading", { name: "Floor 2 of 3" })).toBeVisible();
		expect(generate).toHaveBeenCalledTimes(1);
	});

	it("contains keyboard focus in settings while tabbing forward and backward", async () => {
		const user = userEvent.setup();
		mockRunGeneration();
		render(<Home />);
		await openSettings(user);
		const panel = screen.getByRole("dialog", { name: "Settings" });
		for (let i = 0; i < 6; i++) {
			await user.tab();
			await waitFor(() =>
				expect(panel).toContainElement(document.activeElement as HTMLElement),
			);
		}
		for (let i = 0; i < 6; i++) {
			await user.tab({ shift: true });
			await waitFor(() =>
				expect(panel).toContainElement(document.activeElement as HTMLElement),
			);
		}
	});
});
