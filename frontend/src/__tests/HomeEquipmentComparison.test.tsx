import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as GameState from "../domain/game/GameState";
import { createEquipment } from "../domain/items/Equipment";
import {
	renderHome,
	resetHomeTestState,
	stubDungeonRun,
} from "./HomeTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import Home from "./TestHome";

const setup = async (overrides: Partial<GameState.GameState> = {}) => {
	stubDungeonRun(createCorridorEncounter());
	const create = GameState.createGameState;
	vi.spyOn(GameState, "createGameState").mockImplementationOnce((run) => {
		const state = create(run);
		return {
			...state,
			monsters: [],
			equipment: {
				...state.equipment,
				mainHand: { id: "equipped", kind: "iron-sword" },
			},
			bag: {
				items: [
					{ id: "weak", kind: "short-sword" },
					{ id: "equal", kind: "iron-sword" },
					{ id: "head", kind: "leather-cap" },
					{ id: "potion", kind: "healing-potion" },
				],
			},
			...overrides,
		};
	});
	renderHome(<Home />);
	const user = userEvent.setup();
	await user.click(screen.getByRole("button", { name: "Character" }));
	return {
		user,
		panel: within(screen.getByRole("dialog", { name: "Character" })),
	};
};
afterEach(resetHomeTestState);
describe("Equipment comparison in Character", () => {
	it("shows Intelligence-derived spell and Heal bonuses for both ring destinations without an action", async () => {
		const { user, panel } = await setup({
			equipment: createEquipment(
				null,
				null,
				null,
				null,
				{ id: "left", kind: "ring-intelligence" },
				{ id: "right", kind: "ring-strength" },
			),
			bag: { items: [{ id: "candidate", kind: "ring-mana" }] },
		});
		await user.click(
			panel.getByRole("button", { name: "Ring of Mana, slot 1" }),
		);
		const previews = panel.getAllByLabelText("Equipment comparison");
		expect(previews[0]).toHaveTextContent("Base spell modifier +1 → +0 (−1)");
		expect(previews[0]).toHaveTextContent("Heal bonus +1 → +0 (−1)");
		expect(previews[1]).toHaveTextContent("Base spell modifier +1 → +1 (0)");
		const loss = within(previews[0]).getByText(/^Base spell modifier/);
		expect(within(loss).getByText("+0 (−1)")).toHaveClass("text-red-700");
		const unchanged = within(previews[1]).getByText(/^Base spell modifier/);
		expect(within(unchanged).getByText("+1 (0)")).toHaveClass(
			"text-foreground",
		);
		expect(panel.getByText(/Control and movement effects/)).toBeVisible();
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
	});
	it("shows color-independent comparisons and exact differences without spending turns", async () => {
		const { user, panel } = await setup();
		const lower = panel.getByRole("button", { name: "Short sword, slot 1" });
		expect(lower).toHaveAccessibleDescription(/Lower.*Damage 2–4 → 1–3/);
		expect(
			panel.getByRole("button", { name: "Iron sword, slot 2" }),
		).toHaveAccessibleDescription(/Same/);
		expect(
			panel.getByRole("button", { name: "Leather cap, slot 3" }),
		).toHaveAccessibleDescription(/Better/);
		expect(
			panel.getByRole("button", { name: "Healing potion, slot 4" }),
		).not.toHaveAttribute("aria-describedby");
		await user.click(lower);
		expect(panel.getByLabelText("Equipment comparison")).toHaveTextContent(
			"Damage 2–4 → 1–3",
		);
		expect(lower).toHaveAttribute("aria-pressed", "true");
		expect(lower).toHaveClass("border-red-500/70");
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
	});
	it("recomputes after a swap and an empty-slot equip/unequip", async () => {
		const { user, panel } = await setup();
		await user.click(
			panel.getByRole("button", { name: "Short sword, slot 1" }),
		);
		await user.click(panel.getByRole("button", { name: "Equip on main hand" }));
		expect(
			panel.getByRole("button", { name: "Iron sword, slot 2" }),
		).toHaveAccessibleDescription(/Better/);
		await user.click(
			panel.getByRole("button", { name: "Leather cap, slot 3" }),
		);
		expect(panel.getByLabelText("Equipment comparison")).toHaveTextContent(
			"Armor 1 → 2 (+1)",
		);
		await user.click(panel.getByRole("button", { name: "Equip on head" }));
		await user.click(panel.getByRole("button", { name: "Head: Leather cap" }));
		expect(
			panel.queryByLabelText("Equipment comparison"),
		).not.toBeInTheDocument();
		await user.click(panel.getByRole("button", { name: "Unequip head" }));
		expect(
			panel.getByRole("button", { name: /Leather cap, slot/ }),
		).toHaveAccessibleDescription(/Better/);
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 3");
	});
	it("keeps comparisons current through drop/pickup and resets them on a fresh run", async () => {
		const { user, panel } = await setup();
		await user.click(
			panel.getByRole("button", { name: "Leather cap, slot 3" }),
		);
		await user.click(panel.getByRole("button", { name: "Drop item" }));
		expect(
			panel.queryByRole("button", { name: /Leather cap, slot/ }),
		).not.toBeInTheDocument();
		await user.click(
			panel.getByRole("button", { name: "Pick up Leather cap, item 1" }),
		);
		expect(
			panel.getByRole("button", { name: "Head: Leather cap" }),
		).toBeVisible();
		expect(
			panel.queryByRole("button", { name: /Leather cap, slot/ }),
		).not.toBeInTheDocument();
		await user.click(panel.getByRole("button", { name: "Head: Leather cap" }));
		await user.click(panel.getByRole("button", { name: "Unequip head" }));
		expect(
			panel.getByRole("button", { name: /Leather cap, slot/ }),
		).toHaveAccessibleDescription(/Better/);
		await user.keyboard("c");
		await user.click(screen.getByRole("button", { name: "New Dungeon" }));
		await user.click(screen.getByRole("button", { name: "Start new dungeon" }));
		await user.click(screen.getByRole("button", { name: "Character" }));
		expect(screen.getByLabelText("Bag capacity")).toHaveTextContent("2 / 27");
		expect(
			screen.queryByRole("button", { name: /Leather cap, slot/ }),
		).not.toBeInTheDocument();
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
	});
	it("previews both rings using live character stats and effects without refilling or advancing", async () => {
		const { user, panel } = await setup({
			progression: { experience: 30 },
			player: { health: 7, maxHealth: 14 },
			mana: 3,
			effects: [
				{
					actorId: "player",
					floorNumber: null,
					kind: "protected",
					remaining: 4,
				},
			],
			equipment: createEquipment(
				{ id: "worn:sword", kind: "iron-sword" },
				{ id: "worn:shield", kind: "wooden-shield" },
				null,
				null,
				{ id: "worn:strength", kind: "ring-strength" },
				{ id: "worn:mana", kind: "ring-mana" },
			),
			bag: { items: [{ id: "bag:int", kind: "ring-intelligence" }] },
		});
		const candidate = panel.getByRole("button", {
			name: "Ring of Intelligence, slot 1",
		});
		candidate.focus();
		await user.keyboard("{Enter}");
		const [left, right] = panel.getAllByLabelText("Equipment comparison");
		expect(left).toHaveTextContent("Tradeoff · Left ring");
		expect(left).toHaveTextContent("Damage 4–6 → 3–5");
		expect(left).toHaveTextContent("Maximum mana 16 → 18 (+2)");
		expect(right).toHaveTextContent("Tradeoff · Right ring");
		expect(right).toHaveTextContent("Maximum mana 16 → 14 (−2)");
		expect(right).toHaveTextContent("Armor 3 → 3 (0)");
		expect(
			panel.getByText(/Capacity gains do not refill health or mana/),
		).toBeVisible();
		expect(panel.getByLabelText("Character health")).toHaveTextContent(
			"Health 7 / 14",
		);
		expect(panel.getByLabelText("Character mana")).toHaveTextContent(
			"Mana 3 / 16",
		);
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
		await user.click(panel.getByRole("button", { name: "Equip on left hand" }));
		expect(panel.getByLabelText("Character attack")).toHaveTextContent(
			"Attack 3–5",
		);
		expect(panel.getByLabelText("Character health")).toHaveTextContent(
			"Health 7 / 14",
		);
		expect(panel.getByLabelText("Character mana")).toHaveTextContent(
			"Mana 3 / 18",
		);
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 1");
	});
});
