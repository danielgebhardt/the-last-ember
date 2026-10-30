// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	bodyDistance,
	bodyFitsAt,
	bodyHasLineOfSight,
	bodySpan,
	bodyTiles,
	nearestBodyTile,
	occupies,
} from "../domain/monsters/MonsterFootprint";

const boss = {
	kind: "iron-juggernaut",
	coordinate: { row: 4, col: 4 },
} as const;
const goblin = { kind: "goblin", coordinate: { row: 4, col: 4 } } as const;

describe("Monster bodies", () => {
	it("gives arena minibosses a 2×2 body and everything else one tile", () => {
		for (const kind of [
			"pyre-lord",
			"iron-juggernaut",
			"broodmother",
			"bone-lich",
		] as const)
			expect(bodySpan({ kind })).toBe(2);
		for (const kind of ["goblin", "iron-champion", "ember-warden"] as const)
			expect(bodySpan({ kind })).toBe(1);
		expect(bodyTiles(boss)).toEqual([
			{ row: 4, col: 4 },
			{ row: 4, col: 5 },
			{ row: 5, col: 4 },
			{ row: 5, col: 5 },
		]);
		expect(bodyTiles(goblin)).toEqual([{ row: 4, col: 4 }]);
	});
	it("occupies only its own tiles", () => {
		expect(occupies(boss, { row: 5, col: 5 })).toBe(true);
		expect(occupies(boss, { row: 6, col: 5 })).toBe(false);
		expect(occupies(goblin, { row: 4, col: 5 })).toBe(false);
	});
	it("is next to the 8 tiles along its edges, but not to its diagonal corners", () => {
		const beside = [
			{ row: 3, col: 4 },
			{ row: 3, col: 5 },
			{ row: 6, col: 4 },
			{ row: 6, col: 5 },
			{ row: 4, col: 3 },
			{ row: 5, col: 3 },
			{ row: 4, col: 6 },
			{ row: 5, col: 6 },
		];
		for (const point of beside) expect(bodyDistance(boss, point)).toBe(1);
		for (const corner of [
			{ row: 3, col: 3 },
			{ row: 3, col: 6 },
			{ row: 6, col: 3 },
			{ row: 6, col: 6 },
		])
			expect(bodyDistance(boss, corner)).toBe(2);
		expect(bodyDistance(boss, { row: 5, col: 4 })).toBe(0);
		expect(bodyDistance(boss, { row: 4, col: 10 })).toBe(5);
		expect(nearestBodyTile(boss, { row: 0, col: 10 })).toEqual({
			row: 4,
			col: 5,
		});
	});
	it("fits only where all four tiles are open and unblocked", () => {
		const terrain = ["#####", "#...#", "#...#", "#..##", "#####"].map((row) =>
			row.split(""),
		);
		const kind = { kind: "bone-lich" } as const;
		expect(bodyFitsAt(terrain, kind, { row: 1, col: 1 })).toBe(true);
		expect(bodyFitsAt(terrain, kind, { row: 2, col: 2 })).toBe(false);
		expect(
			bodyFitsAt(
				terrain,
				kind,
				{ row: 1, col: 1 },
				(point) => point.row === 2 && point.col === 2,
			),
		).toBe(false);
	});
	it("sees from any tile of its body", () => {
		// Only the body's right column has a clear line past the wall.
		const terrain = ["#######", "#.....#", "#..#..#", "#.....#", "#######"].map(
			(row) => row.split(""),
		);
		const lich = { kind: "bone-lich", coordinate: { row: 1, col: 1 } } as const;
		expect(bodyHasLineOfSight(terrain, lich, { row: 2, col: 5 })).toBe(true);
	});
});
