import { describe, expect, it } from "vitest";
import { statisticsCsv } from "../statistics-csv.mjs";

describe("Statistics CSV", () => {
	it("exports only standard runs by default and quotes nested values", () => {
		const rows = [
			{
				seed: 1,
				standard: true,
				causeOfDeath: { type: "monster-hit", monster: "goblin" },
				equipped: { head: null },
				endedFloor: 3,
				thiefTake: { sinceTurn: 0, stolen: 100, recovered: 60 },
			},
			{ seed: 2, standard: false },
		];
		const csv = statisticsCsv(rows);
		expect(csv.split("\n")[0]).toContain("endedFloor");
		expect(csv).toContain(
			'"{""sinceTurn"":0,""stolen"":100,""recovered"":60}"',
		);
		expect(csv.split("\n")).toHaveLength(3);
		expect(csv).toContain('"1"');
		expect(csv).not.toContain('"2"');
		expect(csv).toContain(
			'"{""type"":""monster-hit"",""monster"":""goblin""}"',
		);
		expect(statisticsCsv(rows, true).split("\n")).toHaveLength(4);
	});
});
