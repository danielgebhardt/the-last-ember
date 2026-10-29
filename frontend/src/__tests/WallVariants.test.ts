import { describe, expect, it } from "vitest";
import { terrainTexture } from "../components/dungeon/TileVisuals";
import { FLOOR, WALL } from "../domain/dungeon/Tiles";

const grid = Array.from({ length: 20 }, (_, row) =>
	Array.from({ length: 20 }, (_, col) => terrainTexture(WALL, row, col)),
);

describe("Wall variations", () => {
	it("keeps the wall texture and picks the same drawing for a tile every time", () => {
		for (const [row, cells] of grid.entries())
			for (const [col, texture] of cells.entries()) {
				expect(texture).toMatch(/^dungeon-stone-wall( dungeon-wall-[234])?$/);
				expect(terrainTexture(WALL, row, col)).toBe(texture);
			}
		expect(terrainTexture(FLOOR, 3, 4)).toBe("dungeon-flagstone");
	});
	it("mixes all four drawings without long runs along rows or columns", () => {
		const counts = new Map<string | undefined, number>();
		for (const texture of grid.flat())
			counts.set(texture, (counts.get(texture) ?? 0) + 1);
		expect(counts.size).toBe(4);
		for (const count of counts.values()) expect(count).toBeGreaterThan(60);
		const longestRun = (line: (string | undefined)[]) =>
			line.reduce(
				(best, texture, index) => {
					const run =
						index > 0 && line[index - 1] === texture ? best.run + 1 : 1;
					return { run, longest: Math.max(best.longest, run) };
				},
				{ run: 0, longest: 0 },
			).longest;
		const columns = grid[0].map((_, col) => grid.map((cells) => cells[col]));
		for (const line of [...grid, ...columns])
			expect(longestRun(line)).toBeLessThan(5);
	});
});
