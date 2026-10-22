import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import ItemDetails from "../components/game/ItemDetails";
import { createProgression } from "../domain/game/Progression";
import {
	createStartingEquipment,
	type EquipmentSlot,
} from "../domain/items/Equipment";
import type { ItemInstance } from "../domain/items/Item";
import { createStartingPotionHotbar } from "../domain/items/PotionHotbar";

const details = (item: ItemInstance, equippedSlot?: EquipmentSlot) => (
	<ItemDetails
		item={item}
		equippedSlot={equippedSlot}
		comparisonContext={{
			equipment: createStartingEquipment(),
			player: { health: 10, maxHealth: 10 },
			progression: createProgression(),
			effects: [],
			afflictions: [],
		}}
		potionHotbar={createStartingPotionHotbar()}
		alive
		onAction={vi.fn()}
		afterAction={vi.fn()}
	/>
);
const cloak = { id: "cloak", kind: "warding-cloak" } as const;
const band = { id: "band", kind: "relic-band" } as const;
const leather = { id: "leather", kind: "leather-armor" } as const;
// jsdom has no layout, so a clamped description reports its overflow here.
const overflowDescription = () => {
	vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(120);
	vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(60);
};
afterEach(() => vi.restoreAllMocks());

it("offers More only when the clamped description hides text", () => {
	render(details(cloak));
	expect(
		screen.queryByRole("button", { name: "More" }),
	).not.toBeInTheDocument();
});

it("expands a clamped description and collapses it again for the next item", async () => {
	overflowDescription();
	const user = userEvent.setup();
	const { rerender } = render(details(cloak));
	const description = screen.getByText(/A light cloak sewn with warding stars/);
	expect(description).toHaveClass("line-clamp-3");
	await user.click(screen.getByRole("button", { name: "More" }));
	expect(screen.getByRole("button", { name: "Less" })).toHaveAttribute(
		"aria-expanded",
		"true",
	);
	expect(description).not.toHaveClass("line-clamp-3");
	rerender(details(leather));
	expect(screen.getByRole("button", { name: "More" })).toHaveAttribute(
		"aria-expanded",
		"false",
	);
});

it("states magic resistance separately only for worn items, whose comparison is not shown", () => {
	const { rerender } = render(details(cloak));
	expect(
		screen.queryByText(
			/Magic resistance \+10 percentage points while equipped/,
		),
	).not.toBeInTheDocument();
	expect(screen.getByLabelText("Equipment comparison")).toHaveTextContent(
		"Magic resistance",
	);
	rerender(details(cloak, "chest"));
	expect(
		screen.getByText(/Magic resistance \+10 percentage points while equipped/),
	).toBeVisible();
	expect(
		screen.queryByLabelText("Equipment comparison"),
	).not.toBeInTheDocument();
});

it("keeps a ring's other slot one click away and notes Heal and capacity only when they change", async () => {
	const user = userEvent.setup();
	const { rerender } = render(details(band));
	const [left, right] = screen.getAllByLabelText("Equipment comparison");
	expect(left).toHaveTextContent("Left ring");
	expect(left).toBeVisible();
	expect(right).not.toBeVisible();
	await user.click(screen.getByText("Compare with right ring"));
	expect(right).toHaveTextContent("Right ring");
	expect(right).toBeVisible();
	expect(
		screen.getByText(/base spell modifier also improves Heal/),
	).toBeVisible();
	expect(
		screen.getByText(/Capacity gains don't refill health or mana/),
	).toBeVisible();

	rerender(details(leather));
	expect(screen.getAllByLabelText("Equipment comparison")).toHaveLength(1);
	expect(screen.queryByText(/Compare with/)).not.toBeInTheDocument();
	expect(
		screen.queryByText(/base spell modifier also improves Heal/),
	).not.toBeInTheDocument();
	expect(screen.queryByText(/Capacity gains/)).not.toBeInTheDocument();
});
