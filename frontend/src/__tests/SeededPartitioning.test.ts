// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
	type Region,
	recursivePartition,
	splitRegion,
} from "../domain/dungeon/Partitioning.ts";
import { createSeededRandom } from "../domain/dungeon/Seed.ts";
import { getRegionArea, getTerminalRegions, rect } from "./testhelpers.ts";

describe("Seeded region splitting", () => {
	// Random picks the split column/row among the valid positions, earliest to latest.
	it.each([
		["vertical", [0, 5, 0, 5], 0, 2, [0, 5, 0, 1], [0, 5, 2, 5]],
		["vertical", [0, 5, 0, 5], 0.99, 2, [0, 5, 0, 3], [0, 5, 4, 5]],
		["vertical", [0, 5, 0, 5], 0.5, 2, [0, 5, 0, 2], [0, 5, 3, 5]],
		["vertical", [2, 7, 2, 7], 0.5, 2, [2, 7, 2, 4], [2, 7, 5, 7]],
		["horizontal", [0, 5, 0, 5], 0, 2, [0, 1, 0, 5], [2, 5, 0, 5]],
		["horizontal", [0, 5, 0, 5], 0.99, 2, [0, 3, 0, 5], [4, 5, 0, 5]],
		["horizontal", [0, 5, 0, 5], 0.5, 2, [0, 2, 0, 5], [3, 5, 0, 5]],
		["horizontal", [2, 7, 2, 7], 0.5, 2, [2, 4, 2, 7], [5, 7, 2, 7]],
	] as const)(
		"splits %s %j at random %s (minimum %s)",
		(direction, parent, value, minimum, first, second) => {
			expect(
				splitRegion(rect([...parent]), direction, minimum, () => value),
			).toStrictEqual([rect([...first]), rect([...second])]);
		},
	);

	it.each([0, 0.25, 0.5, 0.75, 0.99])(
		"uses the only valid split regardless of random %s",
		(value) => {
			const parent = rect([2, 7, 2, 7]);
			expect(splitRegion(parent, "vertical", 3, () => value)).toStrictEqual([
				rect([2, 7, 2, 4]),
				rect([2, 7, 5, 7]),
			]);
			expect(splitRegion(parent, "horizontal", 3, () => value)).toStrictEqual([
				rect([2, 4, 2, 7]),
				rect([5, 7, 2, 7]),
			]);
		},
	);

	describe.each([
		{ label: "without a seed", seed: undefined },
		{ label: "with seed 0", seed: 0 },
		{ label: "with seed 1", seed: 1 },
		{ label: "with seed 123", seed: 123 },
		{ label: "with seed 999", seed: 999 },
	])("recursive partition invariants $label", ({ seed }) => {
		const rootRegion: Region = {
			startRow: 5,
			endRow: 16,
			startCol: 10,
			endCol: 29,
		};
		const minChildSize = 3;
		const random = seed === undefined ? undefined : createSeededRandom(seed);
		const partitionTree = recursivePartition(rootRegion, minChildSize, random);
		const terminalRegions = getTerminalRegions(partitionTree);

		it("keeps every terminal region within the root bounds", () => {
			for (const region of terminalRegions) {
				expect(region.startRow).toBeGreaterThanOrEqual(rootRegion.startRow);
				expect(region.endRow).toBeLessThanOrEqual(rootRegion.endRow);
				expect(region.startCol).toBeGreaterThanOrEqual(rootRegion.startCol);
				expect(region.endCol).toBeLessThanOrEqual(rootRegion.endCol);
			}
		});

		it("makes every terminal region satisfy the minimum dimensions", () => {
			for (const region of terminalRegions) {
				const rowCount = region.endRow - region.startRow + 1;
				const colCount = region.endCol - region.startCol + 1;

				expect(rowCount).toBeGreaterThanOrEqual(minChildSize);
				expect(colCount).toBeGreaterThanOrEqual(minChildSize);
			}
		});

		it("stops only when terminal regions cannot be split further", () => {
			for (const region of terminalRegions) {
				expect(splitRegion(region, "vertical", minChildSize)).toBeUndefined();
				expect(splitRegion(region, "horizontal", minChildSize)).toBeUndefined();
			}
		});

		it("produces terminal regions that do not overlap", () => {
			const coveredCoordinates = new Set<string>();

			for (const region of terminalRegions) {
				for (let row = region.startRow; row <= region.endRow; row++) {
					for (let col = region.startCol; col <= region.endCol; col++) {
						const coordinate = `${row},${col}`;

						expect(coveredCoordinates.has(coordinate)).toBe(false);
						coveredCoordinates.add(coordinate);
					}
				}
			}
		});

		it("completely covers the root region", () => {
			const terminalArea = terminalRegions.reduce(
				(total, region) => total + getRegionArea(region),
				0,
			);

			expect(terminalArea).toBe(getRegionArea(rootRegion));
		});
	});
});
