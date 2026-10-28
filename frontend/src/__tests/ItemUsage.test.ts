import { expect, it } from "vitest";
import { aggregateItemUsage, sortUsageRows } from "../developer/ItemUsage";
import { observationFromDocument } from "../developer/StatisticsAnalytics";
import { analyticsRun } from "./AnalyticsTestFixtures";

const fixtures = () => {
	const starter = analyticsRun("starter", []),
		acquired = analyticsRun("acquired", []),
		accessOnly = analyticsRun("accessOnly", [], { usage: null }),
		usageOnly = analyticsRun("usageOnly", null),
		zero = analyticsRun("zero", []);
	for (const run of [starter, acquired, accessOnly]) {
		const access = run.summary.telemetry?.economy;
		if (!access) throw Error("Expected access telemetry");
		access.initialItems = { "short-sword": 1, "healing-potion": 2 };
		access.initialSpells = { heal: 1 };
	}
	const access = acquired.summary.telemetry?.economy;
	if (!access) throw Error("Expected economy");
	access.initialItems = {};
	access.initialSpells = {};
	access.town.acquired = {
		"short-sword": 4,
		"healing-potion": 3,
		"spellguard-shield": 1,
	};
	access.town.learned = { heal: 1 };
	access.floors[2] = {
		acquired: { "short-sword": 3, "enchantment-scroll": 1 },
		learned: { fireball: 1 },
		purchases: {},
		sales: {},
		goldIn: {},
		goldOut: {},
	};
	starter.summary.usage = {
		casts: { heal: 2 },
		consumables: { "healing-potion": 1 },
		equippedTurns: { "short-sword": 10 },
	};
	usageOnly.summary.usage = {
		casts: { heal: 3 },
		consumables: { "healing-potion": 2 },
		equippedTurns: { "short-sword": 5 },
	};
	return [starter, acquired, accessOnly, usageOnly, zero];
};
const aggregate = (rows = fixtures()) =>
	aggregateItemUsage(
		rows,
		rows.map((r) => observationFromDocument(r.id, r.summary)),
	);
it("unions starting ownership/knowledge with dungeon/town acquisitions and learning, counting a run once", () => {
	const result = aggregate();
	expect(result.equipment.coverage).toEqual({
		selected: 5,
		access: 4,
		usage: 4,
		both: 3,
	});
	expect(
		result.equipment.rows.find((r) => r.kind === "short-sword"),
	).toMatchObject({
		accessRuns: 3,
		users: 2,
		total: 15,
		eligibleOwners: 2,
		eligibleUsers: 1,
		unusedOwners: 1,
		unknownUsageOwners: 1,
		rate: 0.5,
		medianPerOwner: { value: 5, n: 2 },
	});
	expect(result.spells.rows.find((r) => r.kind === "heal")).toMatchObject({
		accessRuns: 3,
		users: 2,
		total: 5,
		eligibleOwners: 2,
		eligibleUsers: 1,
		rate: 0.5,
		medianPerOwner: { value: 1, n: 2 },
	});
	expect(
		result.consumables.rows.find((r) => r.kind === "healing-potion"),
	).toMatchObject({
		accessRuns: 3,
		total: 3,
		unusedOwners: 1,
		unknownUsageOwners: 1,
	});
	expect(result.spells.rows.find((r) => r.kind === "fireball")).toMatchObject({
		accessRuns: 1,
		eligibleOwners: 1,
		eligibleUsers: 0,
		rate: 0,
		unusedOwners: 1,
	});
	expect(
		result.equipment.rows.find((r) => r.kind === "spellguard-shield"),
	).toMatchObject({ accessRuns: 1, unusedOwners: 1 });
	expect(
		result.consumables.rows.find((r) => r.kind === "enchantment-scroll"),
	).toMatchObject({ accessRuns: 1, unusedOwners: 1 });
});
it("distinguishes unknown usage, measured zero and zero-access percentages, including empty cohorts", () => {
	const accessOnly = fixtures()[2];
	const unknown = aggregate([accessOnly]).equipment.rows.find(
		(r) => r.kind === "short-sword",
	);
	expect(unknown).toMatchObject({
		accessRuns: 1,
		total: null,
		eligibleOwners: 0,
		unusedOwners: 0,
		unknownUsageOwners: 1,
		rate: null,
		medianPerOwner: { value: null, n: 0 },
	});
	const zero = aggregate([analyticsRun("zero", [])]).equipment.rows.find(
		(r) => r.kind === "short-sword",
	);
	expect(zero).toMatchObject({
		accessRuns: 0,
		total: 0,
		rate: null,
		unusedOwners: 0,
	});
	const empty = aggregate([]);
	expect(empty.equipment.coverage).toEqual({
		selected: 0,
		access: 0,
		usage: 0,
		both: 0,
	});
	expect(
		empty.equipment.rows.every((r) => r.total === null && r.rate === null),
	).toBe(true);
});
it("keeps partial group coverage independent and does not infer knowledge from acquired books", () => {
	const row = analyticsRun("partial", []);
	const observation = observationFromDocument(row.id, {
		usage: { casts: {} },
		telemetry: { schemaVersion: 1, economy: { initialItems: {} } },
	});
	const result = aggregateItemUsage([row], [observation]);
	expect(result.equipment.coverage).toMatchObject({
		access: 1,
		usage: 0,
		both: 0,
	});
	expect(result.spells.coverage).toMatchObject({
		access: 0,
		usage: 1,
		both: 0,
	});
	const access = row.summary.telemetry?.economy;
	if (!access) throw Error("Expected economy");
	access.town.acquired = { "book-fireball": 1 };
	expect(
		aggregate([row]).spells.rows.find((r) => r.kind === "fireball")?.accessRuns,
	).toBe(0);
});
it("sorts measured rates with unknown rates last and stable names on ties", () => {
	const rows = aggregate().equipment.rows;
	const ordered = sortUsageRows(rows, "rate", "desc");
	expect(ordered[0].kind).toBe("short-sword");
	expect(ordered.at(-1)?.rate).toBeNull();
	expect(sortUsageRows(rows, "unusedOwners", "desc")[0].unusedOwners).toBe(1);
	expect(sortUsageRows(rows, "name", "asc").map((r) => r.name)).toEqual(
		rows.map((r) => r.name).sort((a, b) => a.localeCompare(b)),
	);
});
it("refuses unsafe summed totals instead of silently rounding counts", () => {
	const rows = fixtures();
	if (!rows[0].summary.usage) throw Error("Expected usage");
	rows[0].summary.usage.equippedTurns["short-sword"] = Number.MAX_SAFE_INTEGER;
	expect(() => aggregate(rows)).toThrow("safe numeric range");
});
