// Stable columns keep successive exports comparable. Nested values stay JSON in a
// quoted CSV cell; no account IDs or document IDs are included in the export.
export const STATISTICS_COLUMNS = [
	"seed",
	"rows",
	"columns",
	"floorCount",
	"standard",
	"ranked",
	"difficulty",
	"gameVersion",
	"commit",
	"outcome",
	"turns",
	"deepestFloor",
	"causeOfDeath",
	"level",
	"gold",
	"monstersDefeated",
	"encountersSinceTurn",
	"omensMet",
	"pact",
	"arena",
	"thievesMet",
	"mimicsMet",
	"equipped",
	"finishedAt",
];
const cell = (value) => {
	const text =
		value == null
			? ""
			: typeof value === "object"
				? JSON.stringify(value)
				: String(value);
	return `"${text.replaceAll('"', '""')}"`;
};
export const statisticsCsv = (rows, all = false) =>
	`${[
		STATISTICS_COLUMNS.join(","),
		...rows
			.filter((row) => all || row.standard === true)
			.map((row) => STATISTICS_COLUMNS.map((key) => cell(row[key])).join(",")),
	].join("\n")}\n`;
