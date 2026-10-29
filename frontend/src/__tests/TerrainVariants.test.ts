import { describe, expect, it } from "vitest";
import { terrainTexture } from "../components/dungeon/TileVisuals";
import {
	ENTRANCE,
	FLOOR,
	PLAYER,
	STAIRS_DOWN,
	STAIRS_UP,
	WALL,
} from "../domain/dungeon/Tiles";

const gridOf = (tile: string) =>
	Array.from({ length: 20 }, (_, row) =>
		Array.from({ length: 20 }, (_, col) => terrainTexture(tile, row, col)),
	);

const longestRun = (line: (string | undefined)[]) =>
	line.reduce(
		(best, texture, index) => {
			const run = index > 0 && line[index - 1] === texture ? best.run + 1 : 1;
			return { run, longest: Math.max(best.longest, run) };
		},
		{ run: 0, longest: 0 },
	).longest;

describe.each([
	{ tile: WALL, base: "dungeon-stone-wall", variant: "dungeon-wall" },
	{ tile: FLOOR, base: "dungeon-flagstone", variant: "dungeon-floor" },
])("$base variations", ({ tile, base, variant }) => {
	const grid = gridOf(tile);
	it("keeps the base texture and picks the same drawing for a tile every time", () => {
		const pattern = new RegExp(`^${base}( ${variant}-[234])?$`);
		for (const [row, cells] of grid.entries())
			for (const [col, texture] of cells.entries()) {
				expect(texture).toMatch(pattern);
				expect(terrainTexture(tile, row, col)).toBe(texture);
			}
	});
	it("mixes all four drawings without long runs along rows or columns", () => {
		const counts = new Map<string | undefined, number>();
		for (const texture of grid.flat())
			counts.set(texture, (counts.get(texture) ?? 0) + 1);
		expect(counts.size).toBe(4);
		for (const count of counts.values()) expect(count).toBeGreaterThan(60);
		const columns = grid[0].map((_, col) => grid.map((cells) => cells[col]));
		for (const line of [...grid, ...columns])
			expect(longestRun(line)).toBeLessThan(5);
	});
});

it("keeps the floor's drawing under the player, the entrance and the stairs", () => {
	for (let row = 0; row < 10; row += 1)
		for (let col = 0; col < 10; col += 1)
			for (const tile of [PLAYER, ENTRANCE, STAIRS_UP, STAIRS_DOWN])
				expect(terrainTexture(tile, row, col)).toBe(
					terrainTexture(FLOOR, row, col),
				);
});
