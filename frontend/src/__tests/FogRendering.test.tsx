import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DungeonLayout from "../components/dungeon/DungeonLayout.tsx";
import TileIcon from "../components/dungeon/TileIcon.tsx";
import { FLOOR, WALL } from "../domain/dungeon/Tiles.ts";

vi.mock("../components/dungeon/TileIcon.tsx", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("../components/dungeon/TileIcon.tsx")>();
	return { default: vi.fn(actual.default) };
});

const terrain = [
	[WALL, WALL, WALL, WALL, WALL],
	[WALL, FLOOR, FLOOR, FLOOR, FLOOR],
	[WALL, WALL, WALL, WALL, WALL],
];
const visible = [
	[false, false, false, false, false],
	[false, true, true, false, false],
	[false, false, false, false, false],
];
const explored = visible.map((row) => [...row]);
explored[0][2] = true;
explored[1][4] = true;
const props = {
	dungeon: terrain,
	playerPosition: { row: 1, col: 1 },
	downStair: { row: 1, col: 4 },
	onMoveRequested: vi.fn(),
};

describe("Fog display states", () => {
	it("shows visible terrain and the player normally", () => {
		render(<DungeonLayout {...props} visible={visible} explored={explored} />);
		expect(
			screen.getByRole("cell", { name: "row1col1 - player" }),
		).toHaveAttribute("data-visibility", "visible");
		expect(
			screen.getByRole("cell", { name: "row1col2 - floor" }),
		).toHaveAttribute("data-visibility", "visible");
		expect(screen.getByRole("cell", { name: "row1col2 - floor" })).toHaveClass(
			"dungeon-flagstone",
		);
	});

	it("marks remembered walls and stairs without calling them visible", () => {
		render(<DungeonLayout {...props} visible={visible} explored={explored} />);
		const stair = screen.getByRole("cell", {
			name: "row1col4 - remembered stairs down",
		});
		expect(stair).toHaveAttribute("data-visibility", "remembered");
		expect(stair.querySelectorAll("svg")).toHaveLength(1);
		expect(
			screen.getByRole("cell", { name: "row0col2 - remembered wall" }),
		).toHaveAttribute("data-visibility", "remembered");
		expect(
			screen.getByRole("cell", { name: "row0col2 - remembered wall" }),
		).toHaveClass("dungeon-remembered-wall");
	});

	it("does not leak terrain or a staircase through undiscovered icons or labels", () => {
		render(<DungeonLayout {...props} visible={visible} />);
		for (const position of ["row0col0", "row1col3", "row1col4"]) {
			const tile = screen.getByRole("cell", {
				name: `${position} - undiscovered`,
			});
			expect(tile).toHaveAttribute("data-visibility", "unknown");
			expect(tile).not.toHaveClass(
				"dungeon-stone-wall",
				"dungeon-flagstone",
				"dungeon-remembered-wall",
			);
			expect(tile.querySelector("svg")).toBeNull();
			expect(tile).toHaveTextContent("");
		}
	});

	it("shows the whole map when no visibility mask is supplied", () => {
		render(<DungeonLayout {...props} />);
		expect(
			screen.getByRole("cell", { name: "row1col4 - stairs down" }),
		).toBeVisible();
		expect(
			screen.queryByRole("cell", { name: /undiscovered|remembered/ }),
		).toBeNull();
	});

	it("always shows the controlled player position", () => {
		render(
			<DungeonLayout
				{...props}
				visible={terrain.map((row) => row.map(() => false))}
			/>,
		);
		expect(
			screen.getByRole("cell", { name: "row1col1 - player" }),
		).toHaveAttribute("data-visibility", "visible");
	});

	it("does not redraw icons in unchanged cells when visibility changes", () => {
		const { rerender } = render(
			<DungeonLayout {...props} visible={visible} explored={explored} />,
		);
		vi.mocked(TileIcon).mockClear();
		const expanded = [...visible];
		expanded[1] = [...visible[1]];
		expanded[1][3] = true;
		rerender(
			<DungeonLayout {...props} visible={expanded} explored={explored} />,
		);
		expect(TileIcon).toHaveBeenCalledTimes(1);
		expect(
			screen.getByRole("cell", { name: "row1col3 - floor" }),
		).toBeVisible();
	});
});
