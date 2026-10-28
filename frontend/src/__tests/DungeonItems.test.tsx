import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DungeonLayout from "../components/dungeon/DungeonLayout";
import type { FloorItem } from "../domain/items/FloorItems";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";

const run = createCorridorEncounter();
const item: FloorItem = {
	item: { id: "loot:1", kind: "iron-sword" },
	floorNumber: 1,
	coordinate: { row: 1, col: 2 },
};
const pile = [
	item,
	{ ...item, item: { id: "loot:2", kind: "wooden-shield" as const } },
];
const props = {
	dungeon: run.floors[0].terrain,
	playerPosition: run.playerCoordinate,
	onMoveRequested: () => {},
	floorItems: [item],
};
describe("Floor item symbols", () => {
	it("shows the legacy quest item as a named amber ember SVG", () => {
		render(
			<DungeonLayout
				{...props}
				floorItems={[{ ...item, item: { id: "quest:cure", kind: "cure" } }]}
			/>,
		);
		const cell = screen.getByLabelText("row1col2 - Warden's Flame");
		expect(cell.querySelector("svg")).toHaveClass("text-item-ember");
		expect(cell.querySelector("svg")).toHaveAttribute("viewBox", "0 0 24 24");
	});
	it("shows visible items and describes multiple items on the same tile", () => {
		render(<DungeonLayout {...props} floorItems={pile} />);
		expect(
			screen.getByLabelText("row1col2 - Iron sword and 1 more item"),
		).toBeVisible();
		const cell = screen.getByLabelText("row1col2 - Iron sword and 1 more item");
		expect(within(cell).getByText("2")).toBeVisible();
		expect(cell).toHaveAttribute(
			"title",
			"2 items on this tile. Press G to choose one.",
		);
	});
	it("keeps large pile counts compact but describes the full count", () => {
		const many = Array.from({ length: 12 }, (_, index) => ({
			...item,
			item: { ...item.item, id: `loot:${index}` },
		}));
		render(<DungeonLayout {...props} floorItems={many} />);
		const cell = screen.getByLabelText(
			"row1col2 - Iron sword and 11 more items",
		);
		expect(within(cell).getByText("9+")).toBeVisible();
		expect(cell).toHaveAttribute(
			"title",
			"12 items on this tile. Press G to choose one.",
		);
	});
	it("returns to the individual item symbol when only one remains", () => {
		const { rerender } = render(<DungeonLayout {...props} floorItems={pile} />);
		expect(screen.getByText("2")).toBeVisible();
		rerender(<DungeonLayout {...props} />);
		const cell = screen.getByLabelText("row1col2 - Iron sword");
		expect(within(cell).queryByText("2")).not.toBeInTheDocument();
		expect(cell).not.toHaveAttribute("title");
		expect(cell.querySelector("svg")).toHaveClass("lucide-sword");
	});
	it("hides items on remembered and undiscovered tiles", () => {
		const visible = props.dungeon.map((row) => row.map(() => false));
		const explored = props.dungeon.map((row) => row.map(() => false));
		explored[1][2] = true;
		const { rerender } = render(
			<DungeonLayout
				{...props}
				floorItems={pile}
				visible={visible}
				explored={explored}
			/>,
		);
		expect(screen.getByLabelText("row1col2 - remembered floor")).toBeVisible();
		expect(screen.queryByText("2")).not.toBeInTheDocument();
		explored[1][2] = false;
		rerender(
			<DungeonLayout
				{...props}
				floorItems={pile}
				visible={visible}
				explored={explored.map((row) => [...row])}
			/>,
		);
		expect(screen.getByLabelText("row1col2 - undiscovered")).toBeVisible();
	});
	it("keeps player, stair, and monster symbols recognizable over items", () => {
		const { rerender } = render(
			<DungeonLayout
				{...props}
				floorItems={pile}
				playerPosition={{ row: 1, col: 2 }}
			/>,
		);
		expect(screen.getByLabelText("row1col2 - player")).toBeVisible();
		expect(screen.queryByText("2")).not.toBeInTheDocument();
		rerender(
			<DungeonLayout
				{...props}
				floorItems={pile}
				downStair={{ row: 1, col: 2 }}
			/>,
		);
		expect(screen.getByLabelText("row1col2 - stairs down")).toBeVisible();
		expect(screen.queryByText("2")).not.toBeInTheDocument();
		rerender(
			<DungeonLayout
				{...props}
				floorItems={pile}
				monsters={[
					{
						intent: { type: "idle" as const },
						id: "1:1",
						kind: "goblin",
						floorNumber: 1,
						coordinate: item.coordinate,
						health: 4,
					},
				]}
			/>,
		);
		expect(screen.getByLabelText("row1col2 - goblin")).toBeVisible();
		expect(screen.queryByText("2")).not.toBeInTheDocument();
		rerender(
			<DungeonLayout
				{...props}
				floorItems={pile}
				dungeonObjects={[
					{
						id: "door:1",
						kind: "door",
						floorNumber: 1,
						coordinate: item.coordinate,
						activated: false,
					},
				]}
			/>,
		);
		// Loot dropped in a doorway shows instead of the door it lies on.
		const doorway = screen.getByLabelText(
			"row1col2 - Iron sword and 1 more item, lying in the doorway",
		);
		expect(within(doorway).getByText("2")).toBeVisible();
		expect(doorway).toHaveAttribute(
			"title",
			"2 items on this tile. Press G to choose one.",
		);
	});
	it("shows treasure on a door tile, and the door once it is taken", () => {
		const door = {
			id: "door:1",
			kind: "door" as const,
			floorNumber: 1,
			coordinate: item.coordinate,
			activated: false,
		};
		const { rerender } = render(
			<DungeonLayout {...props} dungeonObjects={[door]} />,
		);
		expect(
			screen.getByLabelText("row1col2 - Iron sword, lying in the doorway"),
		).toBeVisible();
		rerender(
			<DungeonLayout {...props} floorItems={[]} dungeonObjects={[door]} />,
		);
		expect(screen.getByLabelText("row1col2 - closed door")).toBeVisible();
	});
});
