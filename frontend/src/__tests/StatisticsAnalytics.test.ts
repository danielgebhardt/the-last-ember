import { expect, it } from "vitest";
import {
	aggregateOverview,
	analyticsDefaults,
	observationFromDocument,
} from "../developer/StatisticsAnalytics";
import { filterStatistics } from "../developer/StatisticsData";
import { GAME_VERSION } from "../domain/game/GameVersion";
import { analyticsFixtures, analyticsRun } from "./AnalyticsTestFixtures";

it("uses the application version and exactly 30 inclusive UTC dates", () => {
	expect(analyticsDefaults(new Date("2026-10-28T01:00:00Z"))).toEqual({
		from: "2026-09-29",
		to: "2026-10-28",
		version: GAME_VERSION,
		difficulty: "1",
		standard: "standard",
		outcome: "all",
	});
});
it("aggregates one complete cohort with exact medians and observed reach, never mapped/unreached floors", () => {
	const rows = analyticsFixtures();
	const result = aggregateOverview(
		rows,
		rows.map((r) => observationFromDocument(r.id, r.summary)),
	);
	expect(result.total).toBe(6);
	expect(result.wins).toBe(1);
	expect(result.deaths).toBe(5);
	expect(result.turns).toEqual({ value: 150, n: 6 });
	expect(result.deepest).toEqual({ value: 5, n: 5 });
	expect(result.coverage).toEqual({
		checkpoints: 5,
		usage: 5,
		combat: 5,
		economy: 5,
		availabilityAndUsage: 5,
	});
	expect(result.reach.find((r) => r.floor === 2)).toMatchObject({
		reached: 3,
		total: 6,
		observed: 5,
		runIds: ["run1", "run2", "run3"],
	});
	expect(result.reach.find((r) => r.floor === 19)?.reached).toBe(1);
	expect(result.deathFloors).toContainEqual(["Town", 1]);
	expect(result.deathFloors).toContainEqual(["Unknown", 1]);
	expect(result.mixedVersions).toBe(true);
	expect(result.mixedConfigurations).toBe(true);
});
it("preserves unknown, measured zero and not applicable, including an empty cohort", () => {
	const old = analyticsRun("old", null, { usage: null });
	const zero = analyticsRun("zero", []);
	const rows = [old, zero];
	const result = aggregateOverview(
		rows,
		rows.map((r) => observationFromDocument(r.id, r.summary)),
	);
	expect(result.deepest).toEqual({ value: 0, n: 1 });
	expect(result.coverage.availabilityAndUsage).toBe(1);
	expect(result.reach.every((r) => r.reached === 0)).toBe(true);
	expect(aggregateOverview([], []).turns).toEqual({ value: null, n: 0 });
	const accessOnly = analyticsRun("access", [], { usage: null });
	const usageOnly = analyticsRun("usage", null);
	expect(
		aggregateOverview(
			[accessOnly, usageOnly],
			[accessOnly, usageOnly].map((r) =>
				observationFromDocument(r.id, r.summary),
			),
		).coverage,
	).toMatchObject({ usage: 1, economy: 1, availabilityAndUsage: 0 });
});
it("filters before aggregation and preserves actual custom floor observations", () => {
	const rows = filterStatistics(analyticsFixtures(), {
		version: "all",
		difficulty: "1.25",
		standard: "custom",
		outcome: "all",
	});
	const result = aggregateOverview(
		rows,
		rows.map((r) => observationFromDocument(r.id, r.summary)),
	);
	expect(result.total).toBe(1);
	expect(result.reach.map((r) => r.floor)).toEqual([1, 5]);
	expect(result.reach.map((r) => r.reached)).toEqual([1, 1]);
});
