import { screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderEncounter } from "./HomeEncounterTestHelpers.tsx";
import { enterDungeonFromTown, inspectEndedRun } from "./HomeTestHelpers";
import {
	closeSettings,
	openSettings,
	readDungeonCells,
	resetHomeTestState,
} from "./HomeTestHelpers.tsx";

afterEach(resetHomeTestState);

const deathMessage =
	"You died. Start a new dungeon or replay the seed to try again.";
const expectEndedRun = () => {
	expect(screen.getByLabelText("Player experience")).toHaveTextContent(
		"0 / 10 XP",
	);
	expect(screen.getByRole("alert")).toHaveTextContent(deathMessage);
	expect(screen.getByLabelText("Player health")).toHaveTextContent(
		"Health 0 / 10",
	);
	expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 1");
	expect(
		within(screen.getByRole("log"))
			.getAllByRole("listitem")
			.map(
				(item) => item.querySelector("[data-activity-message]")?.textContent,
			),
	).toEqual([
		"You hit the goblin for 2 damage.",
		"The goblin hits you for 1 damage.",
		"You die.",
	]);
};

describe("Ending a run on player death", () => {
	it("shows the fatal exchange, preserves fog, and ignores both movement schemes", async () => {
		const { user } = renderEncounter(1);
		const initialMap = readDungeonCells();
		await user.keyboard("d");
		await inspectEndedRun(user);
		expectEndedRun();
		expect(readDungeonCells()).toEqual(initialMap);
		await user.keyboard("wasd{ArrowUp}{ArrowDown}{ArrowLeft}{ArrowRight}");
		expectEndedRun();
		expect(readDungeonCells()).toEqual(initialMap);
	});

	it.each(["new dungeon", "replay"])(
		"recovers a fresh playable run using %s",
		async (restart) => {
			const { user } = renderEncounter(1);
			const initialMap = readDungeonCells();
			await user.keyboard("s"); // Discover the lower row before dying.
			await user.keyboard("wd");
			await inspectEndedRun(user);
			expect(screen.getByRole("alert")).toHaveTextContent(deathMessage);
			if (restart === "new dungeon") {
				await user.click(screen.getByRole("button", { name: "New Dungeon" }));
				await user.click(
					screen.getByRole("button", {
						name: "Start new dungeon",
					}),
				);
				await enterDungeonFromTown(user);
			} else {
				await openSettings(user);
				await user.click(
					screen.getByRole("button", { name: "Start from seed" }),
				);
				await enterDungeonFromTown(user);
			}
			expect(screen.queryByRole("alert")).not.toBeInTheDocument();
			expect(screen.getByLabelText("Player health")).toHaveTextContent(
				"Health 10 / 10",
			);
			expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
			expect(screen.getByLabelText("Player experience")).toHaveTextContent(
				"0 / 10 XP",
			);
			expect(screen.getByRole("log")).toHaveTextContent("No activity yet.");
			expect(readDungeonCells()).toEqual(initialMap);
			await user.keyboard("d");
			expect(screen.getByLabelText("row1col2 - goblin")).toBeVisible();
			expect(screen.getByLabelText("Player health")).toHaveTextContent(
				"Health 9 / 10",
			);
		},
	);

	it.each(["invalid seed", "generation failure"])(
		"keeps the ended run after %s and leaves Settings usable",
		async (failure) => {
			const { user, generate } = renderEncounter(1);
			await user.keyboard("d");
			await inspectEndedRun(user);
			const endedMap = readDungeonCells();
			const seedInput = await openSettings(user);
			if (failure === "invalid seed") {
				await user.clear(seedInput);
				await user.type(seedInput, "invalid");
			} else {
				generate.mockImplementationOnce(() => {
					throw new Error("Generation failed");
				});
			}
			await user.click(screen.getByRole("button", { name: "Start from seed" }));
			expect(screen.getByRole("dialog", { name: "Settings" })).toBeVisible();
			expect(
				screen.getByText(
					failure === "invalid seed"
						? /Enter a whole number from 0/
						: /Could not create a dungeon/,
				),
			).toBeVisible();
			await closeSettings(user);
			expectEndedRun();
			expect(readDungeonCells()).toEqual(endedMap);
		},
	);
});
