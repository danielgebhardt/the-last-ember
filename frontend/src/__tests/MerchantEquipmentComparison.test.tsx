import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import MerchantDialog from "../components/merchant/MerchantDialog";
import { createGameState, type GameState } from "../domain/game/GameState";
import { createEquipment } from "../domain/items/Equipment";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";

const merchantState = (): GameState => ({
	...createGameState(createCorridorEncounter()),
	progression: { experience: 30 },
	player: { health: 7, maxHealth: 14 },
	effects: [
		{ actorId: "player", floorNumber: null, kind: "protected", remaining: 4 },
	],
	equipment: createEquipment(
		{ id: "worn:sword", kind: "iron-sword", enchantment: 1 },
		{ id: "worn:shield", kind: "wooden-shield" },
		{ id: "worn:plate", kind: "plate-armor" },
		null,
		{ id: "worn:strength", kind: "ring-strength" },
		{ id: "worn:mana", kind: "ring-mana" },
	),
	bag: {
		items: [
			{ id: "bag:lower", kind: "short-sword" },
			{ id: "bag:same", kind: "iron-sword", enchantment: 1 },
			{ id: "bag:better", kind: "short-sword", enchantment: 3 },
			{ id: "bag:tradeoff", kind: "scholar-robe" },
			{ id: "bag:ring", kind: "ring-intelligence" },
			{ id: "bag:potion", kind: "healing-potion" },
		],
	},
});
const setup = async (state = merchantState()) => {
	const onSell = vi.fn(),
		onSellLower = vi.fn(),
		onClose = vi.fn(),
		mapRef = createRef<HTMLElement>();
	const props = { open: true, state, onSell, onSellLower, onClose, mapRef };
	const view = render(<MerchantDialog {...props} />);
	const user = userEvent.setup();
	await user.click(screen.getByRole("tab", { name: "Sell" }));
	return {
		...view,
		user,
		onSell,
		onSellLower,
		props,
		panel: within(screen.getByRole("tabpanel", { name: "Sell" })),
	};
};

describe("Equipment decisions at the merchant", () => {
	it("quotes Lower sales, cancels freely and needs a deliberate confirmation", async () => {
		const { user, onSellLower, onSell } = await setup();
		await user.click(
			screen.getByRole("button", {
				name: "Sell all Lower items (1) · 20 gold",
			}),
		);
		expect(onSellLower).not.toHaveBeenCalled();
		expect(
			screen.getByRole("group", { name: "Confirm Lower equipment sale" }),
		).toHaveTextContent(/whole sale takes one turn/);
		await user.click(screen.getByRole("button", { name: "Cancel bulk sale" }));
		expect(onSellLower).not.toHaveBeenCalled();
		await user.click(
			screen.getByRole("button", {
				name: "Sell all Lower items (1) · 20 gold",
			}),
		);
		await user.click(screen.getByRole("button", { name: "Confirm bulk sale" }));
		expect(onSellLower).toHaveBeenCalledTimes(1);
		expect(onSell).not.toHaveBeenCalled();
		expect(
			screen.queryByRole("button", { name: "Confirm bulk sale" }),
		).not.toBeInTheDocument();
	});
	it("marks every carried equipment choice without hiding inferior items or selling worn gear", async () => {
		const { panel } = await setup();
		expect(
			panel.getByRole("button", { name: /Short sword.*Sell for 20 gold/ }),
		).toHaveAccessibleDescription(/Lower.*Damage 5–7 → 3–5/);
		expect(
			panel.getByRole("button", { name: /Iron sword \+1.*Sell for 25 gold/ }),
		).toHaveAccessibleDescription(/Same/);
		expect(
			panel.getByRole("button", { name: /Short sword \+3.*Sell for 35 gold/ }),
		).toHaveAccessibleDescription(/Better.*Damage 5–7 → 6–8/);
		expect(
			panel.getByRole("button", { name: /Scholar robe.*Sell for/ }),
		).toHaveAccessibleDescription(
			/Tradeoff.*Maximum mana 16 → 18.*Armor 6 → 4/,
		);
		expect(panel.getAllByRole("button")).toHaveLength(5);
		expect(panel.queryByText("Healing potion")).not.toBeInTheDocument();
		expect(panel.queryByText("Wooden shield")).not.toBeInTheDocument();
	});
	it("opens both ring previews without selling or spending turns", async () => {
		const state = merchantState(),
			original = structuredClone(state);
		const { panel, user, onSell } = await setup(state);
		const summary = panel.getByText("Compare Ring of Intelligence");
		await user.click(summary);
		const ringDetails = summary.closest("details");
		if (!ringDetails)
			throw new Error("Expected the ring comparison disclosure");
		const ring = within(ringDetails);
		const previews = ring.getAllByLabelText("Equipment comparison");
		expect(previews).toHaveLength(2);
		expect(previews[0]).toHaveTextContent("Tradeoff · Left ring");
		expect(previews[0]).toHaveTextContent("Damage 5–7 → 4–6");
		expect(previews[0]).toHaveTextContent("Maximum mana 16 → 18");
		expect(previews[0]).toHaveTextContent("Base spell modifier +1 → +2");
		expect(previews[0]).toHaveTextContent("Base spell modifier +1 → +2");
		const spellRow = within(previews[0])
			.getAllByText(/^Base spell modifier/)[0]
			.closest("div");
		if (!spellRow) throw new Error("Missing comparison row");
		expect(within(spellRow).getByText("+2")).toHaveClass("text-green-700");
		expect(previews[1]).toHaveTextContent("Tradeoff · Right ring");
		expect(previews[1]).toHaveTextContent("Maximum mana 16 → 14");
		expect(previews[1]).toHaveTextContent("Maximum health 14 → 14");
		expect(
			ring.getByText(/Capacity gains don't refill health or mana/),
		).toBeVisible();
		expect(onSell).not.toHaveBeenCalled();
		expect(state).toEqual(original);
		await user.click(
			panel.getByRole("button", { name: /Ring of Intelligence.*Sell for/ }),
		);
		expect(onSell).toHaveBeenCalledExactlyOnceWith("bag:ring");
	});
	it("recomputes open previews from updated or restored state and removes sold choices", async () => {
		const { panel, props, rerender, user } = await setup();
		const summary = panel.getByText("Compare Scholar robe");
		await user.click(summary);
		const robeDetails = summary.closest("details");
		if (!robeDetails)
			throw new Error("Expected the robe comparison disclosure");
		const robe = within(robeDetails);
		expect(robe.getByLabelText("Equipment comparison")).toHaveTextContent(
			"Armor 6 → 4",
		);
		expect(robe.getByLabelText("Equipment comparison")).toHaveTextContent(
			"Base spell modifier +1 → +2",
		);
		const changed: GameState = {
			...props.state,
			progression: { experience: 100 },
			player: { health: 5, maxHealth: 18 },
			effects: [],
			equipment: { ...props.state.equipment, chest: null },
			bag: {
				items: props.state.bag.items.filter((item) => item.id !== "bag:lower"),
			},
		};
		rerender(<MerchantDialog {...props} state={changed} />);
		expect(robe.getByLabelText("Equipment comparison")).toHaveTextContent(
			"Better · Chest",
		);
		expect(robe.getByLabelText("Equipment comparison")).toHaveTextContent(
			"Maximum health 18 → 18",
		);
		expect(robe.getByLabelText("Equipment comparison")).toHaveTextContent(
			"Maximum mana 18 → 20",
		);
		expect(robe.getByLabelText("Equipment comparison")).toHaveTextContent(
			"Armor 1 → 2",
		);
		expect(robe.getByLabelText("Equipment comparison")).toHaveTextContent(
			"Hit chance 95% → 95%",
		);
		expect(robe.getByLabelText("Equipment comparison")).toHaveTextContent(
			"Base spell modifier +2 → +3",
		);
		expect(
			panel.queryByRole("button", { name: /Short sword.*Sell for 20 gold/ }),
		).not.toBeInTheDocument();
	});
});
