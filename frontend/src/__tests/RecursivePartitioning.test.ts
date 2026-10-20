// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
	type PartitionNode,
	type Region,
	recursivePartition,
} from "../domain/dungeon/Partitioning.ts";
import { createSeededRandom } from "../domain/dungeon/Seed.ts";
import { getTerminalRegions, rect } from "./testhelpers.ts";

describe("Recursive partitioning", () => {
	it("when recursively partitioning a region, it should return the region as a terminal partition when unable to split", () => {
		const regionTooSmall: Region = rect([0, 2, 0, 2]);

		const minChildSize = 4;

		const partitions: PartitionNode = recursivePartition(
			regionTooSmall,
			minChildSize,
		);

		expect(partitions.region).toStrictEqual(regionTooSmall);
		expect(partitions.children).toBeUndefined();
	});

	it("when recursively partitioning a region, it should return the the partitions with children", () => {
		const regionWithChildren: Region = rect([0, 3, 0, 7]);

		const minChildSize = 4;

		const expectedChild1: PartitionNode = {
			region: rect([0, 3, 0, 3]),
		};

		const expectedChild2: PartitionNode = {
			region: rect([0, 3, 4, 7]),
		};

		const partitions: PartitionNode = recursivePartition(
			regionWithChildren,
			minChildSize,
		);

		expect(partitions.region).toStrictEqual(regionWithChildren);
		expect(partitions.children).toBeDefined();
		expect(partitions.children?.[0]).toStrictEqual(expectedChild1);
		expect(partitions.children?.[1]).toStrictEqual(expectedChild2);
	});

	it("should throw RangeError when minChildSize is 0 or negative numbers", () => {
		const testRegion: Region = rect([0, 3, 0, 7]);

		for (const invalidSize of [0, -1, 1.5]) {
			expect(() => recursivePartition(testRegion, invalidSize)).toThrow(
				new RangeError("minChildSize must be a positive integer"),
			);
		}
	});

	it("should recursively partition a region through multiple levels", () => {
		const rootRegion: Region = rect([0, 3, 0, 3]);

		const partitionTree = recursivePartition(rootRegion, 2);
		const terminalRegions = getTerminalRegions(partitionTree);

		expect(terminalRegions).toStrictEqual([
			rect([0, 1, 0, 1]),
			rect([2, 3, 0, 1]),
			rect([0, 1, 2, 3]),
			rect([2, 3, 2, 3]),
		]);
	});

	it("should initially split a tall region horizontally", () => {
		const tallRegion: Region = rect([0, 7, 0, 3]);

		const partitionTree = recursivePartition(tallRegion, 4);

		expect(partitionTree.children?.[0].region).toStrictEqual(
			rect([0, 3, 0, 3]),
		);

		expect(partitionTree.children?.[1].region).toStrictEqual(
			rect([4, 7, 0, 3]),
		);
	});

	it("should produce repeatable partitions for the same inputs", () => {
		const rootRegion: Region = rect([5, 16, 10, 29]);

		const firstResult = recursivePartition(rootRegion, 3);
		const secondResult = recursivePartition(rootRegion, 3);

		expect(firstResult).toStrictEqual(secondResult);
	});

	it.each([
		{
			direction: "horizontal",
			value: 0,
			expected: [rect([0, 1, 0, 3]), rect([2, 3, 0, 3])],
		},
		{
			direction: "vertical",
			value: 0.99,
			expected: [rect([0, 3, 0, 1]), rect([0, 3, 2, 3])],
		},
	])(
		"chooses $direction when both directions are valid",
		({ value, expected }) => {
			const region: Region = rect([0, 3, 0, 3]);

			const result = recursivePartition(region, 2, () => value);

			expect(result.children?.map((child) => child.region)).toStrictEqual(
				expected,
			);
		},
	);

	it.each([0, 0.99])(
		"chooses vertical when it is the only valid direction, with random %s",
		(value) => {
			const region: Region = rect([0, 1, 0, 5]);

			const result = recursivePartition(region, 2, () => value);

			expect(result.children).toBeDefined();

			for (const child of result.children ?? []) {
				expect(child.region.startRow).toBe(0);
				expect(child.region.endRow).toBe(1);
				expect(
					child.region.endCol - child.region.startCol + 1,
				).toBeGreaterThanOrEqual(2);
			}
		},
	);

	it.each([0, 0.99])(
		"chooses horizontal when it is the only valid direction, with random %s",
		(value) => {
			const region: Region = rect([0, 5, 0, 1]);

			const result = recursivePartition(region, 2, () => value);

			expect(result.children).toBeDefined();

			for (const child of result.children ?? []) {
				expect(child.region.startCol).toBe(0);
				expect(child.region.endCol).toBe(1);
				expect(
					child.region.endRow - child.region.startRow + 1,
				).toBeGreaterThanOrEqual(2);
			}
		},
	);

	it.each([0, 0.99])(
		"leaves an unsplittable region terminal, with random %s",
		(value) => {
			const region: Region = rect([5, 7, 10, 12]);

			expect(recursivePartition(region, 2, () => value)).toStrictEqual({
				region,
			});
		},
	);

	it("uses the supplied random source for split positions below the root", () => {
		const region: Region = rect([0, 1, 0, 9]);

		const result = recursivePartition(region, 2, () => 0);
		const rightChild = result.children?.[1];

		expect(rightChild?.region).toStrictEqual(rect([0, 1, 2, 9]));

		expect(rightChild?.children?.map((child) => child.region)).toStrictEqual([
			rect([0, 1, 2, 3]),
			rect([0, 1, 4, 9]),
		]);
	});

	it("produces the same partition tree from the same seed", () => {
		const region: Region = rect([5, 16, 10, 25]);

		const first = recursivePartition(region, 3, createSeededRandom(123));
		const second = recursivePartition(region, 3, createSeededRandom(123));

		expect(first).toStrictEqual(second);
	});

	it("can produce different partition trees across seeds", () => {
		const region: Region = rect([5, 16, 10, 25]);

		const trees = Array.from({ length: 20 }, (_, seed) =>
			recursivePartition(region, 3, createSeededRandom(seed)),
		);
		const uniqueTrees = new Set(trees.map((tree) => JSON.stringify(tree)));

		expect(uniqueTrees.size).toBeGreaterThan(1);
	});

	it("does not modify the original region during seeded partitioning", () => {
		const region: Region = rect([5, 16, 10, 25]);
		const original = { ...region };

		recursivePartition(region, 3, createSeededRandom(123));

		expect(region).toStrictEqual(original);
	});
});
