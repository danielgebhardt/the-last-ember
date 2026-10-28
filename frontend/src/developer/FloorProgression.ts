import type {
	CombatMetrics,
	DamageSource,
	HealingSource,
} from "../domain/game/CombatTelemetry";
import type { RunCheckpoint } from "../domain/game/FloorTelemetry";
import { ITEM_DEFINITIONS, type ItemKind } from "../domain/items/Item";
import {
	type AnalyticsObservation,
	median,
	type Overview,
} from "./StatisticsAnalytics";
import type { MetadataEntry } from "./StatisticsData";

export const ENTRY_METRICS = {
	healthPercent: { label: "HP (% max)", unit: "%" },
	manaPercent: { label: "Mana (% max)", unit: "%" },
	level: { label: "Level", unit: "" },
	experience: { label: "Experience", unit: "" },
	health: { label: "Current HP", unit: "" },
	maxHealth: { label: "Maximum HP", unit: "" },
	mana: { label: "Current mana", unit: "" },
	maxMana: { label: "Maximum mana", unit: "" },
	gold: { label: "Carried gold", unit: "" },
	potions: { label: "Carried potions", unit: "" },
	scrolls: { label: "Carried scrolls", unit: "" },
	strength: { label: "Strength", unit: "" },
	dexterity: { label: "Dexterity", unit: "" },
	intelligence: { label: "Intelligence", unit: "" },
	attack: { label: "Attack", unit: "" },
	armor: { label: "Armor", unit: "" },
	evasion: { label: "Evasion", unit: "%" },
	magicResistance: { label: "Magic resistance", unit: "%" },
} as const;
export type EntryMetric = keyof typeof ENTRY_METRICS;
export const DAMAGE_LABELS = {
	melee: "Melee",
	ranged: "Ranged",
	spell: "Enemy spells",
	trap: "Traps",
	condition: "Conditions",
	object: "Object costs/backlash",
	"self-spell": "Own spell splash",
	blade: "Hungering Blade drain",
} satisfies Record<DamageSource, string>;
export const HEALING_LABELS = {
	potion: "Potions",
	spell: "Heal",
	renewal: "Renewal",
	"drain-life": "Drain Life",
	fountain: "Fountains",
	throne: "Thrones",
	hourglass: "Hourglasses",
	arena: "Arena clearance",
	sanctuary: "Sanctuary",
} satisfies Record<HealingSource, string>;
export type FloorCombat = Partial<
	Record<number, Pick<CombatMetrics, "damage" | "healing">>
>;
export type MetricSummary = ReturnType<typeof median> & {
	notApplicable: number;
};
const supplies = (point: RunCheckpoint, type: "potion" | "scroll") =>
	point.supplies
		? Object.entries(point.supplies).reduce(
				(total, [kind, n]) =>
					total +
					((
						type === "potion"
							? ITEM_DEFINITIONS[kind as ItemKind]?.type === "potion"
							: ["scroll", "enchantment"].includes(
									ITEM_DEFINITIONS[kind as ItemKind]?.type,
								)
					)
						? n
						: 0),
				0,
			)
		: undefined;
const entryValue = (
	point: RunCheckpoint,
	key: EntryMetric,
): number | null | undefined => {
	switch (key) {
		case "healthPercent":
			return point.maxHealth === 0
				? null
				: (100 * point.health) / point.maxHealth;
		case "manaPercent":
			return point.maxMana === 0 ? null : (100 * point.mana) / point.maxMana;
		case "potions":
			return supplies(point, "potion");
		case "scrolls":
			return supplies(point, "scroll");
		case "strength":
		case "dexterity":
		case "intelligence":
			return point.attributes?.[key];
		case "evasion":
			return point.evadeChance;
		default:
			return point[key];
	}
};
const metricSummary = (
	points: RunCheckpoint[],
	key: EntryMetric,
): MetricSummary => {
	const values = points.map((p) => entryValue(p, key));
	return {
		...median(
			values.filter(
				(n): n is number => typeof n === "number" && Number.isFinite(n),
			),
		),
		notApplicable: values.filter((n) => n === null).length,
	};
};
const counterSummary = <K extends string>(
	maps: Partial<Record<K, number>>[],
	keys: K[],
) => {
	const sum = (values: number[]) => {
		const total = values.reduce((n, v) => n + v, 0);
		if (!Number.isSafeInteger(total))
			throw Error(
				"Selected counters exceed the safe numeric range. Narrow the selection.",
			);
		return total;
	};
	const bySource = Object.fromEntries(
		keys.map((key) => [
			key,
			maps.length ? sum(maps.map((map) => map[key] ?? 0)) : null,
		]),
	) as Record<K, number | null>;
	return {
		n: maps.length,
		total: maps.length
			? sum(Object.values<number | null>(bySource).map((n) => n ?? 0))
			: null,
		bySource,
	};
};
export const aggregateFloors = (
	rows: readonly MetadataEntry[],
	observations: readonly AnalyticsObservation[],
	reach: Overview["reach"],
) => {
	const ids = new Set(rows.map((r) => r.id));
	const selected = observations.filter((o) => ids.has(o.id));
	return reach.map((row) => {
		const reached = selected.filter((o) =>
			o.floors?.some((f) => f.floorNumber === row.floor),
		);
		const points = reached.flatMap(
			(o) =>
				o.floors
					?.filter((f) => f.floorNumber === row.floor)
					.map((f) => f.firstEntry) ?? [],
		);
		const combat = reached.filter((o) => o.combat);
		return {
			...row,
			entry: Object.fromEntries(
				(Object.keys(ENTRY_METRICS) as EntryMetric[]).map((key) => [
					key,
					metricSummary(points, key),
				]),
			) as Record<EntryMetric, MetricSummary>,
			damage: counterSummary(
				combat.map((o) => o.combatFloors?.[row.floor]?.damage ?? {}),
				Object.keys(DAMAGE_LABELS) as DamageSource[],
			),
			healing: counterSummary(
				combat.map((o) => o.combatFloors?.[row.floor]?.healing ?? {}),
				Object.keys(HEALING_LABELS) as HealingSource[],
			),
		};
	});
};
export type FloorAggregate = ReturnType<typeof aggregateFloors>[number];
