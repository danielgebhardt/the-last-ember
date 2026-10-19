import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import * as GameState from "../domain/game/GameState";
import { ThemeProvider } from "../settings/ThemeProvider";
import { resetHomeTestState, stubDungeonRun } from "./HomeTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import Home from "./TestHome";

afterEach(resetHomeTestState);
it("keeps the selected scroll stack usable in its slot through 3 → 2 → 1 and clears it after the last use", async () => {
	stubDungeonRun(createCorridorEncounter());
	const create = GameState.createGameState;
	vi.spyOn(GameState, "createGameState").mockImplementationOnce((run) => ({
		...create(run),
		monsters: [],
		objects: [],
		floorItems: [],
		bag: {
			items: [
				{ id: "scroll:1", kind: "enchantment-scroll" },
				{ id: "sword", kind: "iron-sword" },
				{ id: "scroll:2", kind: "enchantment-scroll" },
				{ id: "shield", kind: "tower-shield" },
				{ id: "scroll:3", kind: "enchantment-scroll" },
			],
		},
	}));
	render(<Home />, { wrapper: ThemeProvider });
	const user = userEvent.setup();
	screen.getByLabelText("Dungeon map", { exact: true }).focus();
	await user.keyboard("c");
	const dialog = await screen.findByRole("dialog", {
		name: "The Adventurer's Ledger",
	});
	await user.click(
		within(dialog).getByRole("button", { name: "Enchantment scroll, slot 1" }),
	);
	for (const bonus of [1, 2, 3]) {
		await user.click(
			within(dialog).getByRole("button", {
				name: `Enchant Main hand: Short sword${bonus > 1 ? ` +${bonus - 1}` : ""} to +${bonus}`,
			}),
		);
		expect(within(dialog).getByRole("heading", { name: "Bag" })).toHaveFocus();
		if (bonus < 3) {
			expect(
				within(dialog).getByRole("button", {
					name: "Enchantment scroll, slot 1",
				}),
			).toHaveAttribute("aria-pressed", "true");
			expect(
				within(dialog).getByRole("button", { name: "Iron sword, slot 2" }),
			).toBeVisible();
		} else {
			expect(
				within(dialog).queryByRole("group", {
					name: "Choose equipment to enchant",
				}),
			).not.toBeInTheDocument();
			expect(
				within(dialog).getByRole("button", { name: "Iron sword, slot 1" }),
			).toBeVisible();
		}
	}
	expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 3");
});
it("inspects/cancels freely and enchants a chosen equipped item with Enter, showing the bonus", async () => {
	stubDungeonRun(createCorridorEncounter());
	const create = GameState.createGameState;
	vi.spyOn(GameState, "createGameState").mockImplementationOnce((run) => ({
		...create(run),
		monsters: [],
		objects: [],
		floorItems: [],
		bag: {
			items: [
				{ id: "bag:scroll", kind: "enchantment-scroll" },
				{ id: "bag:gear", kind: "iron-sword" },
			],
		},
	}));
	render(<Home />, { wrapper: ThemeProvider });
	const map = screen.getByLabelText("Dungeon map", { exact: true });
	map.focus();
	const user = userEvent.setup();
	await user.keyboard("c");
	const dialog = await screen.findByRole("dialog", {
		name: "The Adventurer's Ledger",
	});
	await user.click(
		within(dialog).getByRole("button", { name: "Enchantment scroll, slot 1" }),
	);
	expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
	expect(
		within(dialog).getByRole("group", { name: "Choose equipment to enchant" }),
	).toBeVisible();
	await user.click(
		within(dialog).getByRole("button", { name: "Cancel enchantment" }),
	);
	expect(
		within(dialog).queryByRole("group", {
			name: "Choose equipment to enchant",
		}),
	).not.toBeInTheDocument();
	expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
	await user.click(
		within(dialog).getByRole("button", { name: "Enchantment scroll, slot 1" }),
	);
	const choice = within(dialog).getByRole("button", {
		name: "Enchant Main hand: Short sword to +1",
	});
	choice.focus();
	await user.keyboard("{Enter}");
	expect(
		within(dialog).getByRole("button", { name: "Main hand: Short sword +1" }),
	).toBeVisible();
	expect(
		within(dialog).queryByRole("button", {
			name: "Enchantment scroll, slot 1",
		}),
	).not.toBeInTheDocument();
	expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 1");
	await user.keyboard("{Escape}");
	await waitFor(() => expect(map).toHaveFocus());
	expect(screen.getByRole("log")).toHaveTextContent(
		"Enchanted Short sword to +1.",
	);
});
