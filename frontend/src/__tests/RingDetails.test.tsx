import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { formatActivityEvent } from "../components/game/ActivityMessages";
import ItemDetails from "../components/game/ItemDetails";
import { createComparisonContext } from "./EquipmentComparisonTestHelpers";

it("lets the player choose either ring slot explicitly", async () => {
	const onAction = vi.fn();
	render(
		<ItemDetails
			item={{ id: "ring:1", kind: "copper-ring" }}
			comparisonContext={createComparisonContext()}
			alive
			onAction={onAction}
			afterAction={vi.fn()}
			potionHotbar={[null, null, null, null]}
		/>,
	);
	const user = userEvent.setup();
	await user.click(screen.getByRole("button", { name: "Equip on right hand" }));
	expect(onAction).toHaveBeenCalledWith({
		type: "equip",
		itemId: "ring:1",
		slot: "rightRing",
	});
	expect(
		screen.getByRole("button", { name: "Equip on left hand" }),
	).toBeVisible();
});

it("describes a magical ring's actual bonus instead of implying armor", () => {
	render(
		<ItemDetails
			item={{ id: "ring:int", kind: "ring-intelligence" }}
			comparisonContext={createComparisonContext()}
			alive
			onAction={vi.fn()}
			afterAction={vi.fn()}
			potionHotbar={[null, null, null, null]}
		/>,
	);
	expect(screen.getByText("+2 intelligence")).toBeVisible();
	expect(screen.queryByText("Armor 0")).not.toBeInTheDocument();
});

it.each(["leftRing", "rightRing"] as const)(
	"describes equipping a ring on the correct hand (%s)",
	(slot) => {
		expect(
			formatActivityEvent({
				type: "item-equipped",
				turn: 450,
				item: "copper-ring",
				slot,
			}),
		).toBe(
			`Turn 450 — You equip Copper ring on your ${slot === "leftRing" ? "left" : "right"} hand.`,
		);
	},
);
