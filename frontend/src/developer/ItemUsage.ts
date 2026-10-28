import type {
	EconomyMetrics,
	EconomyTelemetry,
} from "../domain/game/EconomyTelemetry";
import {
	type RunUsage,
	USAGE_CONSUMABLE_KINDS,
	USAGE_EQUIPMENT_KINDS,
} from "../domain/game/RunUsage";
import { SPELL_DEFINITIONS, type SpellKind } from "../domain/game/Spells";
import { ITEM_DEFINITIONS, type ItemKind } from "../domain/items/Item";
import { type AnalyticsObservation, median } from "./StatisticsAnalytics";
import type { MetadataEntry } from "./StatisticsData";

export type AccessTelemetry = Partial<
	Pick<EconomyTelemetry, "initialItems" | "initialSpells">
> & {
	floors?: Partial<
		Record<number, Pick<EconomyMetrics, "acquired" | "learned">>
	>;
	town?: Partial<Pick<EconomyMetrics, "acquired" | "learned">>;
};
export type UsageRow = {
	kind: string;
	name: string;
	accessRuns: number;
	users: number;
	total: number | null;
	eligibleOwners: number;
	eligibleUsers: number;
	unusedOwners: number;
	unknownUsageOwners: number;
	rate: number | null;
	medianPerOwner: ReturnType<typeof median>;
};
export type UsageCoverage = {
	selected: number;
	access: number;
	usage: number;
	both: number;
};
export type UsageComparison = { coverage: UsageCoverage; rows: UsageRow[] };
export type UsageCategory = "equipment" | "spells" | "consumables";
const sum = (values: number[]) => {
	const value = values.reduce((total, n) => total + n, 0);
	if (!Number.isSafeInteger(value))
		throw Error(
			"Selected usage totals exceed the safe numeric range. Narrow the selection.",
		);
	return value;
};
export const aggregateItemUsage = (
	rows: readonly MetadataEntry[],
	observations: readonly AnalyticsObservation[],
): Record<UsageCategory, UsageComparison> => {
	const ids = new Set(rows.map((r) => r.id)),
		selected = observations.filter((o) => ids.has(o.id));
	const comparison = (
		category: UsageCategory,
		kinds: readonly string[],
	): UsageComparison => {
		const spells = category === "spells",
			usageKey: keyof RunUsage = spells
				? "casts"
				: category === "equipment"
					? "equippedTurns"
					: "consumables";
		const accessKnown = (o: AnalyticsObservation) =>
			(spells ? o.access?.initialSpells : o.access?.initialItems) != null;
		const withAccess = selected.filter(accessKnown),
			withUsage = selected.filter((o) => o.usageData?.[usageKey] != null);
		const both = withAccess.filter((o) => o.usageData?.[usageKey] != null);
		const hasAccess = (o: AnalyticsObservation, kind: string) => {
			const access = o.access;
			const initial: Partial<Record<string, number>> | undefined = spells
				? access?.initialSpells
				: access?.initialItems;
			if ((initial?.[kind] ?? 0) > 0) return true;
			return [...Object.values(access?.floors ?? {}), access?.town].some(
				(metrics) => {
					const map: Partial<Record<string, number>> | undefined = spells
						? metrics?.learned
						: metrics?.acquired;
					return (map?.[kind] ?? 0) > 0;
				},
			);
		};
		const used = (o: AnalyticsObservation, kind: string) =>
			(
				o.usageData?.[usageKey] as Partial<Record<string, number>> | undefined
			)?.[kind] ?? 0;
		return {
			coverage: {
				selected: rows.length,
				access: withAccess.length,
				usage: withUsage.length,
				both: both.length,
			},
			rows: kinds.map((kind) => {
				const owners = withAccess.filter((o) => hasAccess(o, kind)),
					eligible = both.filter((o) => hasAccess(o, kind)),
					users = eligible.filter((o) => used(o, kind) > 0);
				return {
					kind,
					name: spells
						? SPELL_DEFINITIONS[kind as SpellKind].name
						: ITEM_DEFINITIONS[kind as ItemKind].name,
					accessRuns: owners.length,
					users: withUsage.filter((o) => used(o, kind) > 0).length,
					total: withUsage.length
						? sum(withUsage.map((o) => used(o, kind)))
						: null,
					eligibleOwners: eligible.length,
					eligibleUsers: users.length,
					unusedOwners: eligible.length - users.length,
					unknownUsageOwners: owners.length - eligible.length,
					rate: eligible.length ? users.length / eligible.length : null,
					medianPerOwner: median(eligible.map((o) => used(o, kind))),
				};
			}),
		};
	};
	return {
		equipment: comparison("equipment", USAGE_EQUIPMENT_KINDS),
		spells: comparison("spells", Object.keys(SPELL_DEFINITIONS)),
		consumables: comparison("consumables", USAGE_CONSUMABLE_KINDS),
	};
};
export type UsageSort =
	| "name"
	| "accessRuns"
	| "users"
	| "rate"
	| "total"
	| "medianPerOwner"
	| "unusedOwners";
export const sortUsageRows = (
	rows: readonly UsageRow[],
	key: UsageSort,
	direction: "asc" | "desc",
) =>
	[...rows].sort((a, b) => {
		if (key === "name")
			return a.name.localeCompare(b.name) * (direction === "asc" ? 1 : -1);
		const left = key === "medianPerOwner" ? a.medianPerOwner.value : a[key],
			right = key === "medianPerOwner" ? b.medianPerOwner.value : b[key];
		if (left === null && right !== null) return 1;
		if (right === null && left !== null) return -1;
		return (
			(left !== null && right !== null
				? (left - right) * (direction === "asc" ? 1 : -1)
				: 0) || a.name.localeCompare(b.name)
		);
	});
