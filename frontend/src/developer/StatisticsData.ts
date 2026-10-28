import type { RunStatistics } from "../domain/saves/RunStatistics";
export type StatisticsSummary = Omit<
	RunStatistics,
	"endedFloor" | "thiefTake" | "usage" | "telemetry"
> & {
	endedFloor?: number;
	thiefTake?: RunStatistics["thiefTake"];
	usage?: RunStatistics["usage"];
	telemetry?: RunStatistics["telemetry"];
};
export type StatisticsEntry = { id: string; summary: StatisticsSummary };
export type StatisticsFilters = {
	version: string;
	difficulty: string;
	standard: string;
	outcome: string;
};
export const filterStatistics = (
	entries: readonly StatisticsEntry[],
	filters: StatisticsFilters,
) =>
	entries.filter(
		({ summary: r }) =>
			(filters.version === "all" || r.gameVersion === filters.version) &&
			(filters.difficulty === "all" ||
				r.difficulty === Number(filters.difficulty)) &&
			(filters.standard === "all" ||
				r.standard === (filters.standard === "standard")) &&
			(filters.outcome === "all" || r.outcome === filters.outcome),
	);
export const counted = (values: readonly string[]) =>
	Object.entries(
		values.reduce<Record<string, number>>((all, value) => {
			all[value] = (all[value] ?? 0) + 1;
			return all;
		}, {}),
	).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
export const statisticsBreakdowns = (rows: readonly StatisticsSummary[]) => {
	const deaths = rows.filter((r) => r.outcome === "died");
	const tracked = rows.filter(
		(r) => r.encountersSinceTurn === 0 && r.omensMet !== null,
	);
	const arenas = new Map<string, { met: number; defeated: number }>();
	for (const row of rows)
		if (row.arena) {
			const entry = arenas.get(row.arena.miniboss) ?? { met: 0, defeated: 0 };
			entry.met++;
			if (row.arena.fell) entry.defeated++;
			arenas.set(row.arena.miniboss, entry);
		}
	return {
		theft: rows.reduce(
			(all, row) => {
				if (row.thiefTake?.sinceTurn === 0) {
					all.runs++;
					all.stolen += row.thiefTake.stolen;
					all.recovered += row.thiefTake.recovered;
				}
				return all;
			},
			{ runs: 0, stolen: 0, recovered: 0 },
		),
		total: rows.length,
		wins: rows.length - deaths.length,
		deathFloors: counted(
			deaths.map((r) =>
				r.endedFloor ? `Floor ${r.endedFloor}` : "Not recorded",
			),
		),
		deathCauses: counted(
			deaths.map((r) => {
				const cause = r.causeOfDeath;
				return cause
					? String(
							("monster" in cause && cause.monster) ||
								("condition" in cause && cause.condition) ||
								("spell" in cause && cause.spell) ||
								cause.type,
						)
					: "Not recorded";
			}),
		),
		arenas: [...arenas.entries()].sort((a, b) => a[0].localeCompare(b[0])),
		pacts: counted(rows.map((r) => r.pact ?? "None")),
		omens: counted(tracked.flatMap((r) => r.omensMet ?? [])),
		omenRuns: tracked.length,
	};
};
