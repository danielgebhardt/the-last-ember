import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import * as GameState from "../domain/game/GameState";
import { createAdventureSession } from "../components/game/useAdventureSession";
import { DEFAULT_FOG_CONFIGURATION } from "../domain/dungeon/RunConfiguration";
import { createBag } from "../domain/items/Bag";
import { createTownLocation } from "../domain/town/TownLocation";
import { COMPACT_TEST_CONFIGURATION } from "./TestRunConfiguration";
import RealHome from "../Home";
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
	await user.click(
		within(dialog).getByRole("button", { name: "Read enchantment scroll" }),
	);
	const enchanting = await screen.findByRole("dialog", {
		name: "Enchant equipment",
	});
	expect(enchanting).toHaveTextContent("3 scrolls");
	for (const bonus of [1, 2, 3]) {
		await user.click(
			within(enchanting).getByRole("button", {
				name: `Enchant Short sword${bonus > 1 ? ` +${bonus - 1}` : ""} to +${bonus}`,
			}),
		);
		if (bonus < 3) {
			// The dialog stays open for the next scroll and reports what changed.
			expect(within(enchanting).getByRole("status")).toHaveTextContent(
				`Short sword is now +${bonus}.`,
			);
			expect(enchanting).toHaveTextContent(
				`${3 - bonus} ${bonus === 2 ? "scroll" : "scrolls"}`,
			);
			// Behind the modal dialog, the bag keeps the stack selected in its slot.
			expect(
				within(dialog).getByRole("button", {
					name: "Enchantment scroll, slot 1",
					hidden: true,
				}),
			).toHaveAttribute("aria-pressed", "true");
			expect(
				within(dialog).getByRole("button", {
					name: "Iron sword, slot 2",
					hidden: true,
				}),
			).toBeInTheDocument();
		} else {
			// The last scroll closes the dialog and returns focus to the bag.
			await waitFor(() =>
				expect(
					screen.queryByRole("dialog", { name: "Enchant equipment" }),
				).not.toBeInTheDocument(),
			);
			expect(
				within(dialog).getByRole("heading", { name: "Bag" }),
			).toHaveFocus();
			expect(
				within(dialog).getByRole("button", { name: "Iron sword, slot 1" }),
			).toBeVisible();
		}
	}
	expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 3");
});
it("opens and closes the enchanting dialog freely and enchants a chosen worn item with Enter", async () => {
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
	const read = within(dialog).getByRole("button", {
		name: "Read enchantment scroll",
	});
	await user.click(read);
	let enchanting = await screen.findByRole("dialog", {
		name: "Enchant equipment",
	});
	// Worn and carried pieces are both offered, with the stat each would gain.
	expect(
		within(enchanting).getByRole("button", {
			name: "Enchant Iron sword to +1",
		}),
	).toBeEnabled();
	expect(enchanting).toHaveTextContent("Attack 1 → 2");
	await user.click(within(enchanting).getByRole("button", { name: "Done" }));
	await waitFor(() => expect(read).toHaveFocus());
	expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
	// Escape closes only the enchanting dialog, not the ledger.
	await user.click(read);
	enchanting = await screen.findByRole("dialog", { name: "Enchant equipment" });
	await user.keyboard("{Escape}");
	await waitFor(() =>
		expect(
			screen.queryByRole("dialog", { name: "Enchant equipment" }),
		).not.toBeInTheDocument(),
	);
	expect(dialog).toBeInTheDocument();
	expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
	await user.click(read);
	enchanting = await screen.findByRole("dialog", { name: "Enchant equipment" });
	within(enchanting)
		.getByRole("button", { name: "Enchant Short sword to +1" })
		.focus();
	await user.keyboard("{Enter}");
	await waitFor(() =>
		expect(within(dialog).getByRole("heading", { name: "Bag" })).toHaveFocus(),
	);
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

it("reads enchantment scrolls in town without advancing the turn", async () => {
	const initial = createAdventureSession(
		123,
		COMPACT_TEST_CONFIGURATION,
		DEFAULT_FOG_CONFIGURATION,
	);
	const state = {
		...initial.state,
		town: createTownLocation(),
		bag: createBag([
			...initial.state.bag.items,
			{ id: "town:enchantment", kind: "enchantment-scroll" },
		]),
	};
	render(<RealHome initialAdventure={{ ...initial, state }} />, {
		wrapper: ThemeProvider,
	});
	const user = userEvent.setup();
	await user.click(screen.getByRole("button", { name: "Character" }));
	const ledger = within(
		await screen.findByRole("dialog", { name: "The Adventurer's Ledger" }),
	);
	await user.click(
		ledger.getByRole("button", { name: /Enchantment scroll, slot/ }),
	);
	await user.click(ledger.getByRole("button", { name: "Read enchantment scroll" }));
	const enchanting = within(
		await screen.findByRole("dialog", { name: "Enchant equipment" }),
	);
	const target = enchanting.getByRole("button", {
		name: "Enchant Short sword to +1",
	});
	expect(target).toBeEnabled();
	await user.click(target);
	expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
	expect(
		ledger.queryByRole("button", { name: /Enchantment scroll, slot/ }),
	).not.toBeInTheDocument();
});
