// @vitest-environment node

import { describe, expect, it } from "vitest";
import { splitRegion } from "../domain/dungeon/Partitioning.ts";
import { rect } from "./testhelpers";

describe("Region splitting", () => {
	it.each([
		["square, vertical", [0, 5, 0, 5], "vertical", [0, 5, 0, 2], [0, 5, 3, 5]],
		[
			"square, horizontal",
			[0, 5, 0, 5],
			"horizontal",
			[0, 2, 0, 5],
			[3, 5, 0, 5],
		],
		[
			"rectangle, vertical",
			[0, 5, 0, 9],
			"vertical",
			[0, 5, 0, 4],
			[0, 5, 5, 9],
		],
		[
			"rectangle, horizontal",
			[0, 9, 0, 5],
			"horizontal",
			[0, 4, 0, 5],
			[5, 9, 0, 5],
		],
		[
			"offset, vertical",
			[2, 7, 10, 19],
			"vertical",
			[2, 7, 10, 14],
			[2, 7, 15, 19],
		],
		[
			"offset, horizontal",
			[10, 19, 2, 7],
			"horizontal",
			[10, 14, 2, 7],
			[15, 19, 2, 7],
		],
		// Odd sizes split on whole tiles; the extra tile goes to the second child.
		["odd width", [0, 4, 10, 14], "vertical", [0, 4, 10, 11], [0, 4, 12, 14]],
	] as const)(
		"splits a %s region into two adjacent children covering it exactly",
		(_, parent, direction, first, second) => {
			expect(splitRegion(rect([...parent]), direction, 2)).toStrictEqual([
				rect([...first]),
				rect([...second]),
			]);
		},
	);

	it.each([
		["children would be below the minimum", [0, 5, 0, 5], "vertical", 4],
		["children would be below the minimum", [0, 5, 0, 5], "horizontal", 4],
		["the other dimension is below the minimum", [0, 0, 0, 5], "vertical", 2],
		["the other dimension is below the minimum", [0, 5, 0, 0], "horizontal", 2],
	] as const)("refuses a split when %s", (_, parent, direction, minimum) => {
		expect(splitRegion(rect([...parent]), direction, minimum)).toBeUndefined();
	});

	it("allows the other dimension to equal the minimum", () => {
		expect(splitRegion(rect([0, 1, 0, 5]), "vertical", 2)).toBeDefined();
		expect(splitRegion(rect([0, 5, 0, 1]), "horizontal", 2)).toBeDefined();
	});
});
