import { expect, it } from "vitest";
import { aggregateFloors } from "../developer/FloorProgression";
import {
	aggregateOverview,
	observationFromDocument,
} from "../developer/StatisticsAnalytics";
import { analyticsRun, checkpoint } from "./AnalyticsTestFixtures";

const cohort = () => {
	const small = analyticsRun("small", [1, 2]),
		large = analyticsRun("large", [1]),
		old = analyticsRun("old", null, { usage: null });
	const s = small.summary.telemetry,
		l = large.summary.telemetry;
	if (!s?.checkpoints || !s.combat || !l?.checkpoints || !l.combat)
		throw Error("Expected fixture telemetry");
	s.checkpoints.floors[0].firstEntry = {
		...checkpoint(1),
		level: 2,
		experience: 10,
		health: 5,
		maxHealth: 10,
		mana: 0,
		maxMana: 0,
		gold: 0,
		supplies: { "healing-potion": 2, "enchantment-scroll": 1 },
	};
	s.checkpoints.floors[0].lastExit = {
		toFloor: null,
		reason: "town-scroll",
		snapshot: { ...checkpoint(90), health: 1, gold: 1000, level: 20 },
	};
	s.combat.floors[1] = {
		...s.combat.town,
		damage: { melee: 30, trap: 5 },
		healing: { potion: 17 },
	};
	s.combat.town.healing = { sanctuary: 999 };
	l.checkpoints.floors[0].firstEntry = {
		...checkpoint(1),
		level: 8,
		experience: 100,
		health: 90,
		maxHealth: 100,
		mana: 2,
		maxMana: 4,
		supplies: { "exit-scroll": 3 },
	};
	l.combat.floors[1] = {
		...l.combat.town,
		damage: { melee: 10 },
		healing: { spell: 5 },
	};
	return [small, large, old];
};
const aggregate = (rows = cohort()) => {
	const observations = rows.map((r) =>
		observationFromDocument(r.id, r.summary),
	);
	return aggregateFloors(
		rows,
		observations,
		aggregateOverview(rows, observations).reach,
	);
};
it("uses first-entry observations and medians of each run's resource percentages, not cohort ratios or latest exits", () => {
	const floor = aggregate()[0];
	expect(floor).toMatchObject({ floor: 1, reached: 2, total: 3, observed: 2 });
	expect(floor.entry.healthPercent).toEqual({
		value: 70,
		n: 2,
		notApplicable: 0,
	});
	expect(floor.entry.health).toEqual({ value: 47.5, n: 2, notApplicable: 0 });
	expect(floor.entry.manaPercent).toEqual({
		value: 50,
		n: 1,
		notApplicable: 1,
	});
	expect(floor.entry.level.value).toBe(5);
	expect(floor.entry.experience.value).toBe(55);
	expect(floor.entry.gold.value).toBe(0);
	expect(floor.entry.potions.value).toBe(1);
	expect(floor.entry.scrolls.value).toBe(2);
	expect(floor.runIds).toEqual(["small", "large"]);
});
it("uses accumulated received damage/healing across revisits and keeps town out of floor totals", () => {
	const floor = aggregate()[0];
	expect(floor.damage).toMatchObject({
		n: 2,
		total: 45,
		bySource: { melee: 40, trap: 5, ranged: 0 },
	});
	expect(floor.healing).toMatchObject({
		n: 2,
		total: 22,
		bySource: { potion: 17, spell: 5, sanctuary: 0 },
	});
	const second = aggregate()[1];
	expect(second.entry.health).toEqual({ value: 10, n: 1, notApplicable: 0 });
	expect(second.damage).toMatchObject({ n: 1, total: 0 });
});
it("excludes unknown combat and counter-only histories from floor samples, and distinguishes zero from no observations", () => {
	const rows = cohort(),
		noCombat = analyticsRun("noCombat", [1]),
		onlyCounters = analyticsRun("onlyCounters", []);
	if (!noCombat.summary.telemetry || !onlyCounters.summary.telemetry)
		throw Error("Expected telemetry");
	noCombat.summary.telemetry.combat = null;
	onlyCounters.summary.telemetry.checkpoints = null;
	const result = aggregate([...rows, noCombat, onlyCounters]);
	expect(result[0].damage.n).toBe(2);
	expect(result[0].entry.health.n).toBe(3);
	expect(result[2]).toMatchObject({
		floor: 3,
		reached: 0,
		damage: { n: 0, total: null },
		entry: { level: { value: null, n: 0, notApplicable: 0 } },
	});
	expect(aggregate([])).toEqual([]);
});
it("preserves actual custom reached floor numbers and finite per-metric coverage", () => {
	const custom = analyticsRun("custom", [1, 5], {
		standard: false,
		rows: 20,
		columns: 20,
		floorCount: 5,
	});
	const points = custom.summary.telemetry?.checkpoints?.floors;
	if (!points) throw Error("Expected checkpoints");
	points[1].firstEntry.maxMana = 0;
	points[1].firstEntry.mana = 0;
	const result = aggregate([custom]);
	expect(result.map((f) => f.floor)).toEqual([1, 5]);
	expect(result[1].entry.manaPercent).toEqual({
		value: null,
		n: 0,
		notApplicable: 1,
	});
});

it("refuses counter totals outside the exact integer range", () => {
	const rows = cohort();
	const damage = rows[0].summary.telemetry?.combat?.floors[1]?.damage;
	if (!damage) throw Error("Expected counters");
	damage.melee = Number.MAX_SAFE_INTEGER;
	expect(() => aggregate(rows)).toThrow("safe numeric range");
});
