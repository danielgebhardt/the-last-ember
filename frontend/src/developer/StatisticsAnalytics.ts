import type { FloorRecord } from "../domain/game/FloorTelemetry";
import { GAME_VERSION } from "../domain/game/GameVersion";
import type { RunUsage } from "../domain/game/RunUsage";
import type { FloorAggregate, FloorCombat } from "./FloorProgression";
import type {
	AccessTelemetry,
	UsageCategory,
	UsageComparison,
} from "./ItemUsage";
import {
	type MetadataEntry,
	type StatisticsFilters,
	statisticsBreakdowns,
} from "./StatisticsData";

export type AnalyticsFilters = StatisticsFilters & { from: string; to: string };
export const analyticsDefaults = (now = new Date()): AnalyticsFilters => ({
	from: new Date(Date.parse(now.toISOString().slice(0, 10)) - 29 * 86400000)
		.toISOString()
		.slice(0, 10),
	to: now.toISOString().slice(0, 10),
	version: GAME_VERSION,
	difficulty: "1",
	standard: "standard",
	outcome: "all",
});

// Only the server holds these projected observations. Extend here for later slices.
export type AnalyticsObservation = {
	id: string;
	floors: FloorRecord[] | null;
	usage: boolean;
	usageData: Partial<RunUsage> | null;
	combat: boolean;
	combatFloors: FloorCombat | null;
	economy: boolean;
	access: AccessTelemetry | null;
};
type ProjectedTelemetry = {
	usage?: {
		casts?: unknown;
		consumables?: unknown;
		equippedTurns?: unknown;
	} | null;
	telemetry?: {
		schemaVersion?: number;
		checkpoints?: { floors?: FloorRecord[] } | null;
		combat?: { town?: { damage?: unknown }; floors?: FloorCombat } | null;
		economy?: AccessTelemetry | null;
	} | null;
};
export const observationFromDocument = (
	id: string,
	document: ProjectedTelemetry,
): AnalyticsObservation => {
	const telemetry =
		document.telemetry?.schemaVersion === 1 ? document.telemetry : null;
	const usageData: Partial<RunUsage> = {};
	for (const key of ["casts", "consumables", "equippedTurns"] as const) {
		const value = document.usage?.[key];
		if (value !== null && typeof value === "object" && !Array.isArray(value))
			usageData[key] = value;
	}
	return {
		id,
		floors: telemetry?.checkpoints?.floors ?? null,
		usage: usageData.casts != null,
		usageData: document.usage ? usageData : null,
		combat: telemetry?.combat?.town?.damage != null,
		combatFloors: telemetry?.combat?.floors ?? null,
		economy: telemetry?.economy?.initialItems != null,
		access: telemetry?.economy ?? null,
	};
};
export const median = (values: readonly number[]) => {
	const sorted = [...values].sort((a, b) => a - b),
		middle = Math.floor(sorted.length / 2);
	return {
		value: sorted.length
			? sorted.length % 2
				? sorted[middle]
				: sorted[middle - 1] / 2 + sorted[middle] / 2
			: null,
		n: sorted.length,
	};
};
export const aggregateOverview = (
	rows: readonly MetadataEntry[],
	observations: readonly AnalyticsObservation[],
) => {
	const selected = new Map(rows.map((r) => [r.id, r]));
	const tracked = observations.filter((o) => selected.has(o.id));
	const points = tracked.filter((o) => o.floors !== null);
	const count = (predicate: (o: AnalyticsObservation) => boolean) =>
		tracked.filter(predicate).length;
	const floors = new Set(
		points.flatMap((o) => o.floors?.map((f) => f.floorNumber) ?? []),
	);
	if (rows.length && rows.every((r) => r.summary.standard))
		for (let floor = 1; floor <= 20; floor++) floors.add(floor);
	return {
		...statisticsBreakdowns(rows.map((r) => r.summary)),
		deaths: rows.filter((r) => r.summary.outcome === "died").length,
		turns: median(rows.map((r) => r.summary.turns)),
		deepest: median(
			points.map((o) =>
				Math.max(0, ...(o.floors ?? []).map((f) => f.floorNumber)),
			),
		),
		coverage: {
			checkpoints: points.length,
			usage: count((o) => o.usage),
			combat: count((o) => o.combat),
			economy: count((o) => o.economy),
			availabilityAndUsage: count((o) => o.usage && o.economy),
		},
		reach: [...floors]
			.sort((a, b) => a - b)
			.map((floor) => {
				const runIds = points
					.filter((o) => o.floors?.some((f) => f.floorNumber === floor))
					.map((o) => o.id);
				return {
					floor,
					reached: runIds.length,
					total: rows.length,
					observed: points.length,
					runIds,
				};
			}),
		mixedVersions: new Set(rows.map((r) => r.summary.gameVersion)).size > 1,
		mixedConfigurations:
			new Set(
				rows.map(
					(r) =>
						`${r.summary.rows}x${r.summary.columns}x${r.summary.floorCount}`,
				),
			).size > 1,
	};
};
export type Overview = ReturnType<typeof aggregateOverview>;
export type AnalyticsResult = {
	complete: true;
	filters: AnalyticsFilters;
	scanned: number;
	selected: number;
	loadedAt: string;
	versions: string[];
	rows: MetadataEntry[];
	overview: Overview;
	floors: FloorAggregate[];
	items: Record<UsageCategory, UsageComparison>;
};
export type AnalyticsIncomplete = {
	complete: false;
	error: string;
	scanned: number;
	selected: number;
};
