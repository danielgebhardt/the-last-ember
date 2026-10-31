import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import HealthDisplay from "../components/game/HealthDisplay";
import * as GameState from "../domain/game/GameState";
import {
	renderHome,
	resetHomeTestState,
	stubDungeonRun,
} from "./HomeTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import Home from "./TestHome";

afterEach(resetHomeTestState);

describe("Low-health feedback", () => {
	it.each([1, 5, 8])(
		"highlights %i HP even with a larger maximum",
		(health) => {
			render(
				<HealthDisplay
					player={{ health, maxHealth: 18 }}
					label="Player health"
				/>,
			);
			const output = screen.getByLabelText("Player health");
			expect(output).toHaveTextContent(`Health ${health} / 18`);
			expect(screen.queryByText("Low health")).not.toBeInTheDocument();
			expect(
				within(output).getByText(String(health), { exact: true }),
			).toHaveClass("text-destructive");
		},
	);
	it.each([0, 9, 18])(
		"does not show the living-player warning at %i HP",
		(health) => {
			render(
				<HealthDisplay
					player={{ health, maxHealth: 18 }}
					label="Player health"
				/>,
			);
			expect(screen.queryByText("Low health")).not.toBeInTheDocument();
		},
	);
	it("updates the number and color when health grows above the threshold", () => {
		const { rerender } = render(
			<HealthDisplay
				player={{ health: 4, maxHealth: 10 }}
				label="Player health"
			/>,
		);
		rerender(
			<HealthDisplay
				player={{ health: 7, maxHealth: 12 }}
				label="Player health"
			/>,
		);
		expect(screen.getByLabelText("Player health")).toHaveTextContent(
			"Health 7 / 12",
		);
		expect(screen.queryByText("Low health")).not.toBeInTheDocument();
		expect(
			within(screen.getByLabelText("Player health")).getByText("7", {
				exact: true,
			}),
		).not.toHaveClass("text-destructive");
	});
	it("highlights damage in both views and clears after a potion", async () => {
		stubDungeonRun(createCorridorEncounter());
		const create = GameState.createGameState;
		vi.spyOn(GameState, "createGameState").mockImplementationOnce((run) => ({
			...create(run),
			player: { health: 5, maxHealth: 10 },
			bag: { items: [{ id: "potion", kind: "healing-potion" }] },
			potionHotbar: ["healing-potion", null, null, null],
			monsters: [
				{
					intent: { type: "idle" as const },
					id: "1:1",
					kind: "goblin",
					floorNumber: 1,
					coordinate: { row: 1, col: 2 },
					health: 4,
				},
			],
		}));
		renderHome(<Home />);
		const user = userEvent.setup();
		expect(screen.queryByText("Low health")).not.toBeInTheDocument();
		await user.keyboard("d");
		expect(screen.getByLabelText("Player health")).toHaveTextContent(
			"Health 4 / 10",
		);
		expect(screen.getByRole("region", { name: "Adventure" })).toHaveAttribute(
			"data-low-health",
			"true",
		);
		await user.keyboard("dc");
		expect(
			within(screen.getByLabelText("Character health")).getByText("4", {
				exact: true,
			}),
		).toHaveClass("text-destructive");
		await user.keyboard("c1");
		expect(screen.getByLabelText("Player health")).toHaveTextContent(
			"Health 9 / 10",
		);
		expect(screen.queryByText("Low health")).not.toBeInTheDocument();
		expect(screen.getByRole("region", { name: "Adventure" })).toHaveAttribute(
			"data-low-health",
			"false",
		);
	});
	it("clears a low-health run when starting a new dungeon", async () => {
		stubDungeonRun(createCorridorEncounter());
		const create = GameState.createGameState;
		vi.spyOn(GameState, "createGameState").mockImplementationOnce((run) => ({
			...create(run),
			player: { health: 4, maxHealth: 10 },
			monsters: [],
		}));
		renderHome(<Home />);
		expect(screen.queryByText("Low health")).not.toBeInTheDocument();
		expect(
			within(screen.getByLabelText("Player health")).getByText("4", {
				exact: true,
			}),
		).toHaveClass("text-destructive");
		await userEvent
			.setup()
			.click(screen.getByRole("button", { name: "New Dungeon" }));
		await userEvent
			.setup()
			.click(screen.getByRole("button", { name: "Start standard adventure" }));
		expect(screen.queryByText("Low health")).not.toBeInTheDocument();
		expect(screen.getByLabelText("Player health")).toHaveTextContent(
			"Health 10 / 10",
		);
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
	});
});

it("does not warn at exactly half health but follows capacity changes", () => {
	const { rerender } = render(
		<HealthDisplay
			label="Player health"
			player={{ health: 5, maxHealth: 10 }}
		/>,
	);
	expect(screen.queryByText("Low health")).not.toBeInTheDocument();
	rerender(
		<HealthDisplay
			label="Player health"
			player={{ health: 5, maxHealth: 12 }}
		/>,
	);
	expect(
		within(screen.getByLabelText("Player health")).getByText("5", {
			exact: true,
		}),
	).toHaveClass("text-destructive");
});
