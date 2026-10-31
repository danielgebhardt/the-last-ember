import { screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderEncounter } from "./HomeEncounterTestHelpers.tsx";
import { enterDungeonFromTown } from "./HomeTestHelpers";
import {
	closeNewAdventure,
	openCustomAdventure,
	resetHomeTestState,
} from "./HomeTestHelpers.tsx";

const messages = () =>
	within(screen.getByRole("log"))
		.getAllByRole("listitem")
		.map((item) => item.querySelector("[data-activity-message]")?.textContent);

afterEach(resetHomeTestState);

describe("Combat on the play screen", () => {
	it.each(["sd", "{ArrowDown}{ArrowRight}"])(
		"lets the goblin attack after walking into adjacency through %s",
		async (keys) => {
			const { user } = renderEncounter();
			await user.keyboard(keys);
			expect(screen.getByLabelText("row2col2 - player")).toBeVisible();
			expect(screen.getByLabelText("row1col2 - goblin")).toBeVisible();
			// Leaving the goblin's side draws a strike before it attacks again.
			expect(screen.getByLabelText("Player health")).toHaveTextContent(
				"Health 8 / 10",
			);
			expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 2");
			expect(messages()).toEqual([
				"As you step away, the goblin hits you for 1 damage.",
				"The goblin hits you for 1 damage.",
			]);
		},
	);

	it.each(["d", "{ArrowRight}"])(
		"attacks and kills through %s, showing ordered messages and the vacated tile",
		async (key) => {
			const { user, generate, spawn } = renderEncounter();
			await user.keyboard(key);
			expect(screen.getByLabelText("row1col1 - player")).toBeVisible();
			expect(screen.getByLabelText("row1col2 - goblin")).toBeVisible();
			expect(screen.getByLabelText("Player health")).toHaveTextContent(
				"Health 9 / 10",
			);
			expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 1");
			expect(messages()).toEqual([
				"You hit the goblin for 2 damage.",
				"The goblin hits you for 1 damage.",
				"The goblin begins pursuit.",
			]);
			await user.keyboard(key);
			expect(screen.getByLabelText("row1col2 - floor")).toBeVisible();
			expect(screen.getByLabelText("row1col1 - player")).toBeVisible();
			expect(screen.getByLabelText("Player health")).toHaveTextContent(
				"Health 9 / 10",
			);
			expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 2");
			expect(messages().slice(-4)).toEqual([
				"You hit the goblin for 2 damage.",
				"The goblin dies.",
				"You collect 6 gold.",
				"You gain 5 XP.",
			]);
			await user.keyboard(key);
			expect(screen.getByLabelText("row1col2 - player")).toBeVisible();
			expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 3");
			expect(messages()).toHaveLength(7);
			// The defeated goblin must stay removed after leaving and returning.
			await user.keyboard("sdda");
			expect(
				screen.getByRole("heading", { name: "Floor 1 of 2" }),
			).toBeVisible();
			expect(screen.queryByLabelText(/goblin/)).not.toBeInTheDocument();
			expect(messages()).toHaveLength(9);
			expect(messages().slice(-2)).toEqual([
				"You descend to floor 2.",
				"You ascend to floor 1.",
			]);
			expect(generate).toHaveBeenCalledTimes(1);
			expect(spawn).toHaveBeenCalledTimes(1);
		},
	);

	it("retains injured health through Settings and floor travel, then kills the injured goblin", async () => {
		const { user } = renderEncounter();
		await user.keyboard("d");
		await openCustomAdventure(user);
		await user.keyboard("d{ArrowRight}");
		await closeNewAdventure(user);
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 1");
		// Pass the goblin along the lower room row and descend; leaving its
		// side twice draws two strikes on top of its ordinary attack.
		await user.keyboard("sdd");
		expect(screen.getByRole("heading", { name: "Floor 2 of 2" })).toBeVisible();
		await user.keyboard("da");
		expect(screen.getByRole("heading", { name: "Floor 1 of 2" })).toBeVisible();
		expect(screen.getByLabelText("Player health")).toHaveTextContent(
			"Health 6 / 10",
		);
		expect(messages()).toHaveLength(8);
		expect(messages().slice(-2)).toEqual([
			"You descend to floor 2.",
			"You ascend to floor 1.",
		]);
		// Approach from the right; one remaining hit should kill it.
		await user.keyboard("wa");
		expect(screen.getByLabelText("row1col2 - floor")).toBeVisible();
		expect(screen.getByLabelText("Player health")).toHaveTextContent(
			"Health 5 / 10",
		);
		expect(messages().slice(-4)).toEqual([
			"You hit the goblin for 2 damage.",
			"The goblin dies.",
			"You collect 6 gold.",
			"You gain 5 XP.",
		]);
	});

	it.each(["new dungeon", "replay"])(
		"restores health, goblin, and log for a %s",
		async (restart) => {
			const { user } = renderEncounter();
			await user.keyboard("dd");
			if (restart === "new dungeon") {
				await user.click(screen.getByRole("button", { name: "New Dungeon" }));
				await user.click(
					screen.getByRole("button", {
						name: "Start standard adventure",
					}),
				);
				await enterDungeonFromTown(user);
			} else {
				await openCustomAdventure(user);
				await user.click(
					screen.getByRole("button", { name: "Start custom adventure" }),
				);
				await enterDungeonFromTown(user);
			}
			expect(screen.getByLabelText("Player health")).toHaveTextContent(
				"Health 10 / 10",
			);
			expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
			expect(screen.getByRole("log")).toHaveTextContent("No activity yet.");
			await user.keyboard("d");
			expect(screen.getByLabelText("row1col2 - goblin")).toBeVisible();
			expect(screen.getByLabelText("Player health")).toHaveTextContent(
				"Health 9 / 10",
			);
		},
	);
});
