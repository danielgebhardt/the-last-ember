import { expect, it } from "vitest";
import {
	filterStatistics,
	type StatisticsEntry,
	statisticsBreakdowns,
} from "../developer/StatisticsData";
import { summarizeRun } from "../domain/saves/RunStatistics";
import { savedAdventure } from "./SaveTestHelpers";

it("filters all four dimensions without changing the loaded data", () => {
	const base = summarizeRun(savedAdventure(), null);
	const rows: StatisticsEntry[] = [
		{
			id: "a",
			summary: {
				...base,
				gameVersion: "old",
				difficulty: 1,
				standard: true,
				outcome: "died",
			},
		},
		{
			id: "b",
			summary: {
				...base,
				gameVersion: "new",
				difficulty: 1.25,
				standard: false,
				outcome: "won",
			},
		},
	];
	for (const filters of [
		{ version: "new", difficulty: "all", standard: "all", outcome: "all" },
		{ version: "all", difficulty: "1.25", standard: "all", outcome: "all" },
		{ version: "all", difficulty: "all", standard: "custom", outcome: "all" },
		{ version: "all", difficulty: "all", standard: "all", outcome: "won" },
	])
		expect(filterStatistics(rows, filters).map((r) => r.id)).toEqual(["b"]);
	expect(rows).toHaveLength(2);
});
it("uses actual end floors, distinguishes missing old fields, and gives each breakdown the right denominator", () => {
	const base = summarizeRun(savedAdventure(), null);
	const result = statisticsBreakdowns([
		{
			...base,
			outcome: "died",
			endedFloor: 2,
			deepestFloor: 20,
			causeOfDeath: { type: "player-condition-hit", condition: "poisoned" },
			arena: { miniboss: "pyre-lord", fell: true },
			encountersSinceTurn: 0,
			omensMet: ["dark"],
			pact: "hunter",
			thiefTake: { sinceTurn: 0, stolen: 100, recovered: 60 },
		},
		{
			...base,
			outcome: "died",
			endedFloor: undefined,
			causeOfDeath: null,
			arena: { miniboss: "pyre-lord", fell: false },
			encountersSinceTurn: 20,
			thiefTake: { sinceTurn: 20, stolen: 999, recovered: 0 },
			omensMet: ["dark"],
		},
		{
			...base,
			outcome: "won",
			arena: null,
			encountersSinceTurn: 0,
			omensMet: [],
		},
	]);
	expect(result.deathFloors).toEqual([
		["Floor 2", 1],
		["Not recorded", 1],
	]);
	expect(result.arenas).toEqual([["pyre-lord", { met: 2, defeated: 1 }]]);
	expect(result.omens).toEqual([["dark", 1]]);
	expect(result.omenRuns).toBe(2);
	expect(result.wins).toBe(1);
	expect(result.theft).toEqual({ runs: 1, stolen: 100, recovered: 60 });
	expect(result.pacts).toContainEqual(["hunter", 1]);
});
