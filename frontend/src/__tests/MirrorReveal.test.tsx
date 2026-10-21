import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import DungeonLayout from "../components/dungeon/DungeonLayout";

const objects = [
	{
		id: "floor:4:object:door:1",
		kind: "door" as const,
		floorNumber: 4,
		coordinate: { row: 0, col: 2 },
		activated: false,
	},
	{
		id: "floor:4:object:trap:1",
		kind: "trap" as const,
		floorNumber: 4,
		coordinate: { row: 0, col: 3 },
		activated: false,
	},
];
const layout = (revealed: boolean) =>
	render(
		<DungeonLayout
			onMoveRequested={vi.fn()}
			dungeon={[[".", ".", ".", ".", "#"]]}
			playerPosition={{ row: 0, col: 0 }}
			visible={[[true, false, false, false, false]]}
			explored={[[true, false, false, false, false]]}
			revealed={revealed}
			dungeonObjects={objects}
			floorItems={[
				{
					item: { id: "loot", kind: "healing-potion" },
					floorNumber: 4,
					coordinate: { row: 0, col: 1 },
				},
			]}
		/>,
	);
const cell = (col: number) =>
	screen.getByRole("cell", { name: new RegExp(`^row0col${col}\\b`) });

it("a revealed floor shows unseen terrain and doors, never items or traps", () => {
	layout(true);
	expect(cell(1)).toHaveAccessibleName(/remembered floor/);
	expect(cell(2)).toHaveAccessibleName(/remembered .*door/);
	expect(cell(3)).toHaveAccessibleName(/remembered floor/);
	expect(cell(4)).toHaveAccessibleName(/remembered wall/);
});

it("without a reveal, unseen tiles stay undiscovered", () => {
	layout(false);
	for (const col of [1, 2, 3, 4])
		expect(cell(col)).toHaveAccessibleName(/undiscovered/);
});
