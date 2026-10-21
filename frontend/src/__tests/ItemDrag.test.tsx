import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { expect, it, vi } from "vitest";
import {
	DRAG_INSTRUCTIONS,
	ItemDragProvider,
} from "../components/dnd/ItemDrag";
import BagContents from "../components/game/BagContents";
import EquipmentView from "../components/game/EquipmentView";
import { createProgression } from "../domain/game/Progression";
import { createBag } from "../domain/items/Bag";
import { createStartingEquipment } from "../domain/items/Equipment";

const renderGrid = (dragEnabled: boolean) => {
	const equipment = createStartingEquipment();
	render(
		<ItemDragProvider onDrop={vi.fn()}>
			<EquipmentView
				equipment={equipment}
				selectedId={null}
				onSelect={vi.fn()}
				headingRef={createRef()}
				dragEnabled={dragEnabled}
			/>
			<BagContents
				bag={createBag([
					{ id: "sword", kind: "iron-sword" },
					{ id: "scroll", kind: "enchantment-scroll" },
				])}
				comparisonContext={{
					equipment,
					player: { health: 10, maxHealth: 10 },
					progression: createProgression(),
					effects: [],
					afflictions: [],
				}}
				selectedKey={null}
				onSelect={vi.fn()}
				headingRef={createRef()}
				dragEnabled={dragEnabled}
			>
				{null}
			</BagContents>
		</ItemDragProvider>,
	);
};

it("gear and worn items describe the keyboard drag; items with no target stay plain buttons", () => {
	renderGrid(true);
	const sword = screen.getByRole("button", { name: /^Iron sword, slot/ });
	expect(sword).toHaveAccessibleDescription(
		expect.stringContaining(DRAG_INSTRUCTIONS),
	);
	expect(
		screen.getByRole("button", { name: /^Main hand: / }),
	).toHaveAccessibleDescription(DRAG_INSTRUCTIONS);
	const scroll = screen.getByRole("button", {
		name: /^Enchantment scroll, slot/,
	});
	expect(scroll).not.toHaveAttribute("aria-disabled");
	expect(scroll).not.toHaveAccessibleDescription(
		expect.stringContaining(DRAG_INSTRUCTIONS),
	);
	// Every item keeps its button role for selection.
	expect(sword.tagName).toBe("BUTTON");
});

it("after death or victory nothing is draggable", () => {
	renderGrid(false);
	const sword = screen.getByRole("button", { name: /^Iron sword, slot/ });
	expect(sword).not.toHaveAttribute("aria-disabled");
	expect(sword).not.toHaveAccessibleDescription(
		expect.stringContaining(DRAG_INSTRUCTIONS),
	);
});
