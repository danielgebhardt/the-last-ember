import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DungeonRun } from "../domain/dungeon/DungeonRun.ts";
import type { Monster } from "../domain/monsters/Monster.ts";
import * as MonsterPursuit from "../domain/monsters/MonsterPursuit";
import { ThemeProvider } from "../settings/ThemeProvider.tsx";
import { resetHomeTestState, stubDungeonRun } from "./HomeTestHelpers.tsx";
import Home from "./TestHome";
import { createTestDungeonFloor } from "./testhelpers.ts";

const encounterRun = (): DungeonRun => ({
	seed: 123,
	activeFloor: 1,
	playerCoordinate: { row: 1, col: 1 },
	floors: [
		createTestDungeonFloor({
			floorNumber: 1,
			rows: 4,
			cols: 10,
			room: { startRow: 1, endRow: 2, startCol: 1, endCol: 8 },
			downStair: {
				coordinate: { row: 1, col: 8 },
				destinationFloor: 2,
				arrivalCoordinate: { row: 1, col: 1 },
			},
		}),
		createTestDungeonFloor({
			floorNumber: 2,
			rows: 3,
			cols: 5,
			room: { startRow: 1, endRow: 1, startCol: 1, endCol: 3 },
			upStair: {
				coordinate: { row: 1, col: 1 },
				destinationFloor: 1,
				arrivalCoordinate: { row: 1, col: 8 },
			},
		}),
	],
});
const goblin: Monster = {
	intent: { type: "idle" as const },
	id: "1:1",
	kind: "goblin",
	floorNumber: 1,
	coordinate: { row: 1, col: 4 },
	health: 2,
};

// Placement and visibility fixtures retain their actors; pursuit has its own suite.
beforeEach(() =>
	vi.spyOn(MonsterPursuit, "selectPursuitStep").mockReturnValue(undefined),
);
afterEach(resetHomeTestState);

describe("Goblin on the play screen", () => {
	it("removes a goblin on a killing bump without moving or further retaliation", async () => {
		stubDungeonRun(encounterRun(), [goblin]);
		render(<Home initialFogConfiguration={{ enabled: false, radius: 1 }} />, {
			wrapper: ThemeProvider,
		});
		await userEvent.keyboard("ddd");
		expect(screen.getByLabelText("row1col3 - player")).toBeVisible();
		expect(screen.getByLabelText("row1col4 - floor")).toBeVisible();
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 3");
		expect(screen.getByLabelText("Player health")).toHaveTextContent(
			"Health 9 / 10",
		);
		expect(goblin.health).toBe(2);
	});

	it("does not regenerate actors on rerender or floor visits and shows only the active floor's goblin", async () => {
		const { spawn } = stubDungeonRun(encounterRun(), [goblin]);
		const user = userEvent.setup();
		const { rerender } = render(
			<Home initialFogConfiguration={{ enabled: false, radius: 1 }} />,
			{ wrapper: ThemeProvider },
		);
		rerender(<Home initialFogConfiguration={{ enabled: false, radius: 1 }} />);
		// Walk along the second room row to pass the stationary goblin.
		await user.keyboard("sdddddddw");
		expect(screen.getByRole("heading", { name: "Floor 2 of 2" })).toBeVisible();
		expect(screen.queryByLabelText(/goblin/)).not.toBeInTheDocument();
		await user.keyboard("da");
		expect(screen.getByRole("heading", { name: "Floor 1 of 2" })).toBeVisible();
		expect(screen.getByLabelText("row1col4 - goblin")).toBeVisible();
		expect(spawn).toHaveBeenCalledTimes(1);
		expect(goblin.health).toBe(2);
	});

	it("shows the goblin from the start in an adventure without fog", () => {
		stubDungeonRun(encounterRun(), [goblin]);
		render(<Home initialFogConfiguration={{ enabled: false, radius: 1 }} />, {
			wrapper: ThemeProvider,
		});
		expect(screen.getByLabelText("row1col4 - goblin")).toBeVisible();
	});

	it("hides the goblin outside sight and remembers only terrain", async () => {
		stubDungeonRun(encounterRun(), [goblin]);
		const user = userEvent.setup();
		render(<Home initialFogConfiguration={{ enabled: true, radius: 1 }} />, {
			wrapper: ThemeProvider,
		});
		expect(screen.getByLabelText("row1col4 - undiscovered")).toBeVisible();
		expect(screen.queryByLabelText(/goblin/)).not.toBeInTheDocument();
		await user.keyboard("sddd");
		expect(screen.getByLabelText("row1col4 - goblin")).toBeVisible();
		await user.keyboard("ddd");
		expect(screen.getByLabelText("row1col4 - remembered floor")).toBeVisible();
		expect(screen.queryByLabelText(/goblin/)).not.toBeInTheDocument();
	});
});
