import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TILE_LABELS } from "../components/dungeon/TileVisuals";
import { SPELL_DEFINITIONS } from "../domain/game/Spells";
import { ITEM_DEFINITIONS } from "../domain/items/Item";
import { MONSTER_DEFINITIONS } from "../domain/monsters/Monster";
import { OBJECT_DEFINITIONS } from "../domain/objects/DungeonObject";
import { renderHome, resetHomeTestState } from "./HomeTestHelpers";
import Home from "./TestHome";

const flags = vi.hoisted(() => ({ developerCatalog: true }));
vi.mock("../settings/FeatureFlags", () => ({ APP_FEATURES: flags }));
afterEach(() => {
	resetHomeTestState();
	flags.developerCatalog = true;
});
describe("Developer catalog", () => {
	it("shows the actual monster, spell and item catalogs without advancing the run", async () => {
		renderHome(<Home />);
		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "Catalog" }));
		const sheet = await screen.findByRole("dialog", {
			name: "Developer Catalog",
		});
		for (const [label, definitions] of [
			["Monsters", MONSTER_DEFINITIONS],
			["Spells", SPELL_DEFINITIONS],
			["Items", ITEM_DEFINITIONS],
			[
				"Conditions",
				{
					poisoned: 1,
					disease: 1,
					slowed: 1,
					"mana-burn": 1,
					curse: 1,
					blinded: 1,
					"soul-drain": 1,
				},
			],
			["Dungeon objects", OBJECT_DEFINITIONS],
			["Terrain", TILE_LABELS],
		] as const) {
			await user.click(within(sheet).getByRole("tab", { name: label }));
			const region = within(sheet).getByRole("tabpanel", {
				name: label,
			});
			expect(within(sheet).getAllByRole("tabpanel")).toHaveLength(1);
			expect(within(region).getAllByRole("listitem")).toHaveLength(
				Object.keys(definitions).length,
			);
			// Items group by type first; every other section reads alphabetically.
			if (label !== "Items") {
				const names = within(region)
					.getAllByRole("heading", { level: 4 })
					.map((heading) => heading.textContent ?? "");
				expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
			}
		}
		expect(sheet.querySelector(".dungeon-stone-wall")).toBeInTheDocument();
		expect(sheet.querySelector(".dungeon-flagstone svg")).toBeInTheDocument();
		expect(within(sheet).queryByText(/Missing icon/)).not.toBeInTheDocument();
		await user.keyboard("{ArrowRight}gh ");
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
		await user.keyboard("{Escape}");
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
		);
		expect(screen.getByLabelText("Dungeon map", { exact: true })).toHaveFocus();
	});
	it("filters by a stable kind and keeps previews informational", async () => {
		renderHome(<Home />);
		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "Catalog" }));
		const sheet = await screen.findByRole("dialog", {
			name: "Developer Catalog",
		});
		await user.type(
			within(sheet).getByRole("searchbox", { name: "Filter catalog" }),
			"wyvern",
		);
		expect(within(sheet).getAllByRole("listitem")).toHaveLength(1);
		expect(
			within(sheet).getByRole("heading", { name: "wyvern" }),
		).toBeVisible();
		expect(within(sheet).getByText("Floors 12–20")).toBeVisible();
		expect(
			within(sheet).queryByRole("button", { name: /cast|equip|drink/i }),
		).not.toBeInTheDocument();
	});
	it("filters only the open section and clears the search when switching tabs", async () => {
		renderHome(<Home />);
		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "Catalog" }));
		const sheet = within(
			await screen.findByRole("dialog", { name: "Developer Catalog" }),
		);
		expect(sheet.getByRole("tab", { name: "Monsters" })).toHaveAttribute(
			"aria-selected",
			"true",
		);
		const search = sheet.getByRole("searchbox", { name: "Filter catalog" });
		await user.type(search, "iron sword");
		expect(
			sheet.getByText("No matching entries in this section."),
		).toBeVisible();
		expect(
			sheet.queryByRole("heading", { name: "Iron sword" }),
		).not.toBeInTheDocument();

		await user.click(sheet.getByRole("tab", { name: "Items" }));
		expect(search).toHaveValue("");
		expect(sheet.getAllByRole("listitem")).toHaveLength(
			Object.keys(ITEM_DEFINITIONS).length,
		);
		await user.type(search, "iron sword");
		expect(sheet.getAllByRole("listitem")).toHaveLength(1);
		expect(sheet.getByRole("heading", { name: "Iron sword" })).toBeVisible();

		await user.click(sheet.getByRole("tab", { name: "Monsters" }));
		expect(search).toHaveValue("");
		expect(sheet.getAllByRole("listitem")).toHaveLength(
			Object.keys(MONSTER_DEFINITIONS).length,
		);
	});
	it("supports keyboard tab navigation without moving the player", async () => {
		renderHome(<Home />);
		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "Catalog" }));
		const sheet = within(
			await screen.findByRole("dialog", { name: "Developer Catalog" }),
		);
		await user.click(sheet.getByRole("tab", { name: "Monsters" }));
		await user.keyboard("{ArrowRight}");
		expect(sheet.getByRole("tab", { name: "Spells" })).toHaveFocus();
		expect(sheet.getByRole("tabpanel", { name: "Spells" })).toBeVisible();
		await user.keyboard("{End}");
		expect(sheet.getByRole("tabpanel", { name: "Town" })).toBeVisible();
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
	});
	it("keeps town preview walking isolated from the adventure and restores map focus", async () => {
		renderHome(<Home />);
		const user = userEvent.setup();
		const originalPlayer = screen
			.getByRole("cell", { name: / - player$/ })
			.getAttribute("aria-label");
		await user.click(screen.getByRole("button", { name: "Catalog" }));
		const sheet = within(
			await screen.findByRole("dialog", { name: "Developer Catalog" }),
		);
		await user.click(sheet.getByRole("tab", { name: "Town" }));
		expect(sheet.queryByRole("searchbox")).not.toBeInTheDocument();
		await user.click(sheet.getByRole("region", { name: "Town map preview" }));
		await user.keyboard("sse");
		expect(sheet.getByRole("status")).toHaveTextContent(/not connected/i);
		await user.keyboard("{Escape}");
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
		);
		expect(screen.getByRole("cell", { name: / - player$/ })).toHaveAttribute(
			"aria-label",
			originalPlayer,
		);
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
		expect(screen.getByLabelText("Dungeon map", { exact: true })).toHaveFocus();
	});
	it("keeps all potion kinds together, including ordinary mana potion", async () => {
		renderHome(<Home />);
		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "Catalog" }));
		const sheet = within(
			await screen.findByRole("dialog", { name: "Developer Catalog" }),
		);
		await user.click(sheet.getByRole("tab", { name: "Items" }));
		const names = sheet
			.getAllByRole("listitem")
			.map((card) => within(card).getByRole("heading").textContent);
		const potions: string[] = Object.values(ITEM_DEFINITIONS)
			.filter((item) => item.type === "potion")
			.map((item) => item.name);
		const firstPotion = names.findIndex((name) => potions.includes(name ?? ""));
		expect(firstPotion).toBeGreaterThanOrEqual(0);
		expect(names.slice(firstPotion, firstPotion + potions.length)).toEqual(
			expect.arrayContaining(potions),
		);
		expect(names.slice(firstPotion, firstPotion + potions.length)).toContain(
			"Mana potion",
		);
	});
	it("hides the entry point when the developer feature is disabled", () => {
		flags.developerCatalog = false;
		renderHome(<Home />);
		expect(
			screen.queryByRole("button", { name: "Catalog" }),
		).not.toBeInTheDocument();
	});
});
