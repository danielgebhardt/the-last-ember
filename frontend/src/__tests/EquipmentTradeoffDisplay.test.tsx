import { render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import ItemDetails from "../components/game/ItemDetails";
import { createEquipment } from "../domain/items/Equipment";
import { createComparisonContext } from "./EquipmentComparisonTestHelpers";

it("explains the robe's armor loss and Intelligence gain without calling it lower", () => {
	render(
		<ItemDetails
			item={{ id: "robe", kind: "scholar-robe" }}
			comparisonContext={createComparisonContext(
				createEquipment(null, null, {
					id: "plate",
					kind: "plate-armor",
				}),
			)}
			alive
			onAction={vi.fn()}
			afterAction={vi.fn()}
			potionHotbar={[null, null, null, null]}
		/>,
	);
	const comparison = screen.getByLabelText("Equipment comparison");
	expect(comparison).toHaveTextContent("Tradeoff");
	expect(comparison).toHaveTextContent("Armor 3 → 1");
	expect(comparison).toHaveTextContent("Intelligence 10 → 12");
	expect(comparison).toHaveTextContent("Maximum mana 10 → 12");
	expect(comparison).toHaveTextContent("both gains and losses");
	const armor = within(comparison).getAllByText("Armor")[0].closest("div");
	if (!armor) throw new Error("Missing armor row");
	expect(within(armor).getByText("1")).toHaveClass(
		"text-red-700",
		"dark:text-red-400",
	);
	const intelligence = within(comparison)
		.getAllByText("Intelligence")[0]
		.closest("div");
	if (!intelligence) throw new Error("Missing Intelligence row");
	expect(within(intelligence).getByText("12")).toHaveClass(
		"text-green-700",
		"dark:text-green-400",
	);
});
it("shows a comparison for each ring slot rather than assuming the left one", () => {
	render(
		<ItemDetails
			item={{ id: "int", kind: "ring-intelligence" }}
			comparisonContext={createComparisonContext(
				createEquipment(null, null, null, null, {
					id: "str",
					kind: "ring-strength",
				}),
			)}
			alive
			onAction={vi.fn()}
			afterAction={vi.fn()}
			potionHotbar={[null, null, null, null]}
		/>,
	);
	const comparisons = screen.getAllByLabelText("Equipment comparison");
	expect(comparisons).toHaveLength(2);
	expect(comparisons[0]).toHaveTextContent("Tradeoff · Left ring");
	expect(comparisons[1]).toHaveTextContent("Better · Right ring");
});

it.each([
	["lower", "short-sword", 0, "1–3", "text-red-700", "dark:text-red-400"],
	[
		"unchanged",
		"iron-sword",
		0,
		"2–4",
		"text-muted-foreground",
		"text-muted-foreground",
	],
	["higher", "short-sword", 3, "4–6", "text-green-700", "dark:text-green-400"],
] as const)(
	"colors a %s replacement damage range",
	(_direction, kind, enchantment, range, lightColor, darkColor) => {
		render(
			<ItemDetails
				item={{
					id: "candidate",
					kind,
					...(enchantment ? { enchantment } : {}),
				}}
				comparisonContext={createComparisonContext(
					createEquipment({ id: "worn", kind: "iron-sword" }),
				)}
				alive
				onAction={vi.fn()}
				afterAction={vi.fn()}
				potionHotbar={[null, null, null, null]}
			/>,
		);
		expect(
			within(screen.getByLabelText("Equipment comparison"))
				.getAllByText(range)
				.at(-1),
		).toHaveClass(lightColor, darkColor);
	},
);
