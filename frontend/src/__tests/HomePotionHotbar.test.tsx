import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as GameState from "../domain/game/GameState";
import { createBag } from "../domain/items/Bag";
import { HOTBAR_SLOTS, type HotbarSlot } from "../domain/items/PotionHotbar";
import { resolvePlayerActionWithHits as resolvePlayerAction } from "./ControlledCombatTestHelpers";
import {
	enterDungeonFromTown,
	inspectEndedRun,
	renderHome as render,
	resetHomeTestState,
	stubDungeonRun,
} from "./HomeTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import Home from "./TestHome";

const setup = (
	slot: HotbarSlot = 1,
	health = 7,
	count = 2,
	withMonster = true,
) => {
	stubDungeonRun(createCorridorEncounter());
	const create = GameState.createGameState;
	vi.spyOn(GameState, "createGameState").mockImplementationOnce((run) => {
		const state = {
			...create(run),
			player: { health, maxHealth: 10 },
			potionHotbar: [null, null, null, null] as const,
			bag: createBag(
				Array.from({ length: count }, (_, index) => ({
					id: `potion:${index}`,
					kind: "healing-potion",
				})),
			),
			monsters: withMonster
				? [
						{
							intent: { type: "idle" as const },
							id: "1:1",
							kind: "goblin" as const,
							floorNumber: 1,
							coordinate: { row: 1, col: 2 },
							health: 4,
						},
					]
				: [],
		};
		const assigned = resolvePlayerAction(state, {
			type: "assign-hotbar",
			slot,
			itemId: "potion:0",
		}).state;
		return count > 0
			? assigned
			: { ...assigned, potionHotbar: ["healing-potion", null, null, null] };
	});
	render(<Home />);
	screen.getByLabelText("Dungeon map", { exact: true }).focus();
	return userEvent.setup();
};
afterEach(resetHomeTestState);
describe("Potion hotbar gameplay", () => {
	it.each(HOTBAR_SLOTS)(
		"uses assigned slot %i with its number key before one monster response",
		async (slot) => {
			const user = setup(slot);
			await user.keyboard(String(slot));
			expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 1");
			expect(screen.getByLabelText("Player health")).toHaveTextContent(
				"Health 9 / 10",
			);
			expect(
				screen.getByRole("button", {
					name: `Potion slot ${slot}: Healing potion, 1 carried`,
				}),
			).toBeVisible();
			expect(screen.getByRole("log").textContent).toMatch(
				/recover 3 health.*hits you for 1 damage/,
			);
		},
	);
	it("clicks to consume, restores gameplay focus, and retains the empty assignment", async () => {
		const user = setup();
		await user.click(
			screen.getByRole("button", {
				name: "Potion slot 1: Healing potion, 2 carried",
			}),
		);
		expect(screen.getByLabelText("Dungeon map", { exact: true })).toHaveFocus();
		await user.keyboard("1");
		expect(
			screen.getByRole("button", {
				name: "Potion slot 1: Healing potion, 0 carried",
			}),
		).toBeVisible();
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 2");
		await user.keyboard("1");
		expect(
			screen.getByRole("status", { name: "Action feedback" }),
		).toHaveTextContent(/no carried copies/i);
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 2");
	});
	it.each(["empty slot", "unavailable", "full health"])(
		"gives %s feedback without spending a turn",
		async (scenario) => {
			const user = setup(
				1,
				scenario === "full health" ? 10 : 7,
				scenario === "unavailable" ? 0 : 2,
				false,
			);
			await user.keyboard(scenario === "empty slot" ? "2" : "1");
			expect(
				screen.getByRole("status", { name: "Action feedback" }),
			).toHaveTextContent(
				scenario === "empty slot"
					? /slot 2 is empty/i
					: scenario === "full health"
						? /full health/i
						: /no carried copies/i,
			);
			expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
		},
	);
	it.each(["Character", "Settings", "Help"])(
		"pauses potion keys while %s is open",
		async (menu) => {
			const user = setup();
			await user.click(screen.getByRole("button", { name: menu }));
			await screen.findByRole("dialog");
			await user.keyboard("1");
			expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
			expect(screen.getByRole("log")).not.toHaveTextContent("You drink");
		},
	);
	it("disables activation after death", async () => {
		const user = setup(1, 0);
		await inspectEndedRun(user);
		await user.keyboard("1");
		expect(
			screen.getByRole("button", {
				name: "Potion slot 1: Healing potion, 2 carried",
			}),
		).toBeDisabled();
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
	});
	it("restores starter supplies and shortcuts on New Dungeon", async () => {
		const user = setup();
		await user.click(screen.getByRole("button", { name: "New Dungeon" }));
		await user.click(screen.getByRole("button", { name: "Start new dungeon" }));
		await enterDungeonFromTown(user);
		for (const [slot, name] of [
			[3, "Greater healing potion"],
			[4, "Greater mana potion"],
		])
			expect(
				screen.getByRole("button", {
					name: `Potion slot ${slot}: ${name}, 0 carried`,
				}),
			).toBeVisible();
		expect(
			screen.getByRole("button", {
				name: "Potion slot 1: Healing potion, 1 carried",
			}),
		).toBeVisible();
		expect(
			screen.getByRole("button", {
				name: "Potion slot 2: Mana potion, 1 carried",
			}),
		).toBeVisible();
		await user.keyboard("i");
		await screen.findByRole("dialog", { name: "The Adventurer's Ledger" });
		expect(screen.getByLabelText("Potion slot 1 assignment")).toHaveTextContent(
			"Healing potion",
		);
		await user.keyboard("{Escape}");
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
		);
	});
});
