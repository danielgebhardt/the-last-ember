import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { ThemeProvider } from "../settings/ThemeProvider";
import {
	closeNewAdventure,
	openCustomAdventure,
	resetHomeTestState,
	stubDungeonRun,
} from "./HomeTestHelpers";
import Home from "./TestHome";
import { createTestDungeonFloor } from "./testhelpers";

afterEach(resetHomeTestState);

describe("Pursuit on the play screen", () => {
	it.each([
		{ enabled: false, radius: 1 },
		{ enabled: true, radius: 1 },
		{ enabled: true, radius: 20 },
	])(
		"pursues independently of fog configuration $enabled / $radius",
		async (fog) => {
			const stubs = stubDungeonRun(
				{
					seed: 123,
					activeFloor: 1,
					playerCoordinate: { row: 2, col: 2 },
					floors: [
						createTestDungeonFloor({
							floorNumber: 1,
							rows: 6,
							cols: 8,
							room: { startRow: 1, endRow: 4, startCol: 1, endCol: 6 },
						}),
					],
				},
				[
					{
						intent: { type: "idle" as const },
						id: "1:1",
						kind: "goblin",
						floorNumber: 1,
						coordinate: { row: 2, col: 5 },
						health: 4,
					},
				],
			);
			const user = userEvent.setup();
			render(<Home initialFogConfiguration={fog} />, {
				wrapper: ThemeProvider,
			});
			await user.keyboard("w");
			// The goblin moves up first under the deterministic path tie rule.
			if (!fog.enabled || fog.radius === 20)
				expect(screen.getByLabelText("row1col5 - goblin")).toBeVisible();
			else expect(screen.queryByLabelText(/goblin/)).not.toBeInTheDocument();
			await openCustomAdventure(user);
			await user.keyboard("d{ArrowRight}");
			await closeNewAdventure(user);
			expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 1");
			await user.keyboard("d");
			expect(screen.getByLabelText("row1col4 - goblin")).toBeVisible();
			expect(screen.getByLabelText("Player health")).toHaveTextContent(
				"Health 10 / 10",
			);
			if (!fog.enabled || fog.radius === 20)
				expect(screen.getByRole("log")).toHaveTextContent(
					"The goblin begins pursuit.",
				);
			else
				expect(screen.getByRole("log")).toHaveTextContent("No activity yet.");
			expect(
				screen.queryByLabelText("row2col5 - goblin"),
			).not.toBeInTheDocument();
			await user.keyboard("{ArrowRight}");
			expect(screen.getByLabelText("row1col3 - player")).toBeVisible();
			expect(screen.getByLabelText("Player health")).toHaveTextContent(
				"Health 9 / 10",
			);
			expect(stubs.generate).toHaveBeenCalledTimes(1);
			expect(stubs.spawn).toHaveBeenCalledTimes(1);
		},
	);
});
