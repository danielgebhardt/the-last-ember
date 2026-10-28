import { useState } from "react";
import { Button } from "../components/ui/button";
import { EmberPanel } from "../components/ui/EmberMenu";
import {
	DAMAGE_LABELS,
	ENTRY_METRICS,
	type EntryMetric,
	type FloorAggregate,
	HEALING_LABELS,
	type MetricSummary,
} from "./FloorProgression";
import type { MetadataEntry } from "./StatisticsData";

const primary: EntryMetric[] = [
	"level",
	"experience",
	"health",
	"maxHealth",
	"healthPercent",
	"mana",
	"maxMana",
	"manaPercent",
	"gold",
	"potions",
	"scrolls",
];
const secondary: EntryMetric[] = [
	"strength",
	"dexterity",
	"intelligence",
	"attack",
	"armor",
	"evasion",
	"magicResistance",
];
const absent = (floor: FloorAggregate) =>
	floor.reached === 0 && floor.observed > 0 ? "Not applicable" : "Unknown";
const number = (value: number) =>
	value.toLocaleString(undefined, { maximumFractionDigits: 2 });
const metricText = (
	summary: MetricSummary,
	key: EntryMetric,
	floor: FloorAggregate,
) =>
	summary.value !== null
		? `${number(summary.value)}${ENTRY_METRICS[key].unit}`
		: summary.notApplicable
			? "Not applicable"
			: absent(floor);
const EntryTable = ({
	floor,
	keys,
	caption,
}: {
	floor: FloorAggregate;
	keys: EntryMetric[];
	caption: string;
}) => (
	<table className="mt-3 w-full text-left text-sm tabular-nums">
		<caption className="sr-only">{caption}</caption>
		<thead>
			<tr className="text-xs text-muted-foreground">
				<th scope="col" className="py-2">
					First-entry metric
				</th>
				<th scope="col">Median</th>
				<th scope="col">Sample</th>
			</tr>
		</thead>
		<tbody>
			{keys.map((key) => (
				<tr key={key} className="border-t border-border/50">
					<th scope="row" className="py-1.5 font-normal">
						{ENTRY_METRICS[key].label}
					</th>
					<td>{metricText(floor.entry[key], key, floor)}</td>
					<td>
						n={floor.entry[key].n}
						{floor.entry[key].notApplicable > 0 && (
							<span className="block text-xs text-muted-foreground">
								{floor.entry[key].notApplicable} not applicable
							</span>
						)}
					</td>
				</tr>
			))}
		</tbody>
	</table>
);
const Counters = ({
	title,
	metrics,
	labels,
	floor,
	healing = false,
}: {
	title: string;
	metrics: FloorAggregate["damage"] | FloorAggregate["healing"];
	labels: Record<string, string>;
	floor: FloorAggregate;
	healing?: boolean;
}) => {
	const counts = metrics.bySource as Record<string, number | null>;
	const max = Math.max(1, ...Object.values(counts).map((n) => n ?? 0));
	return (
		<EmberPanel>
			<h4 className="font-serif font-semibold">{title}</h4>
			<p className="mt-1 text-sm tabular-nums">
				Total: {metrics.total === null ? absent(floor) : number(metrics.total)}{" "}
				HP · n={metrics.n}/{floor.reached} reached runs
			</p>
			<p className="mt-1 text-xs text-muted-foreground">
				{floor.reached - metrics.n} reached runs have unknown counters. Totals
				accumulate all visits; town is excluded.
			</p>
			<table className="mt-3 w-full text-left text-sm tabular-nums">
				<caption className="sr-only">
					{title} by source on floor {floor.floor}
				</caption>
				<thead>
					<tr className="text-xs text-muted-foreground">
						<th scope="col">Captured source</th>
						<th scope="col" className="text-right">
							Total HP
						</th>
					</tr>
				</thead>
				<tbody>
					{Object.entries(labels).map(([key, label]) => (
						<tr key={key}>
							<th scope="row" className="py-1 font-normal">
								<span>{label}</span>
								<div aria-hidden="true" className="mt-1 h-1 rounded bg-muted">
									<div
										className={`h-full rounded ${healing ? "bg-emerald-600/70 dark:bg-emerald-400/70" : "bg-destructive/70"}`}
										style={{ width: `${(100 * (counts[key] ?? 0)) / max}%` }}
									/>
								</div>
							</th>
							<td className="pl-3 text-right">
								{counts[key] === null ? absent(floor) : number(counts[key])}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</EmberPanel>
	);
};
export default function StatisticsFloorProgression({
	floors,
	rows,
	onInspect,
	onFloorChange,
}: {
	floors: FloorAggregate[];
	rows: MetadataEntry[];
	onInspect: (entry: MetadataEntry) => void;
	onFloorChange: () => void;
}) {
	const [chosen, setChosen] = useState(floors[0]?.floor ?? 1),
		[metric, setMetric] = useState<EntryMetric>("healthPercent"),
		[runPage, setRunPage] = useState(0);
	const selected = floors.find((f) => f.floor === chosen) ?? floors[0];
	const choose = (floor: number) => {
		setChosen(floor);
		setRunPage(0);
		onFloorChange();
	};
	if (!selected)
		return (
			<EmberPanel>
				<h3 className="font-serif text-lg">No floor observations</h3>
				<p className="mt-2 text-sm text-muted-foreground">
					Load a selection with recorded dungeon entries. Missing history is
					unknown; custom runs do not invent baseline floors.
				</p>
			</EmberPanel>
		);
	const max =
		ENTRY_METRICS[metric].unit === "%"
			? 100
			: Math.max(1, ...floors.map((f) => f.entry[metric].value ?? 0));
	const runIds = new Set(selected.runIds),
		runs = rows.filter((r) => runIds.has(r.id));
	return (
		<section className="mt-4 grid gap-4" aria-label="Floor progression results">
			<EmberPanel>
				<h3 className="font-serif text-lg font-semibold">
					First-entry progression
				</h3>
				<p className="mt-1 text-xs text-muted-foreground">
					One first-entry observation per reached floor and run. Medians
					summarize the included runs; HP/mana percentages are calculated per
					run before taking the median. n is specific to each metric. A zero
					maximum makes its percentage not applicable.
				</p>
				<div className="mt-3 flex flex-wrap gap-4">
					<label className="grid gap-1 text-xs font-medium">
						Progression metric
						<select
							aria-label="Progression metric"
							className="h-9 rounded-md border bg-background px-2 text-sm"
							value={metric}
							onChange={(e) => setMetric(e.target.value as EntryMetric)}
						>
							{Object.entries(ENTRY_METRICS).map(([key, { label }]) => (
								<option key={key} value={key}>
									{label}
								</option>
							))}
						</select>
					</label>
					<label className="grid gap-1 text-xs font-medium">
						Selected floor
						<select
							aria-label="Selected floor"
							className="h-9 rounded-md border bg-background px-2 text-sm"
							value={selected.floor}
							onChange={(e) => choose(Number(e.target.value))}
						>
							{floors.map((f) => (
								<option key={f.floor} value={f.floor}>
									Floor {f.floor} · {f.reached} reached runs
								</option>
							))}
						</select>
					</label>
				</div>
				<p className="mt-3 text-xs text-muted-foreground">
					Bar height: median {ENTRY_METRICS[metric].label}, scale 0–
					{number(max)}
					{ENTRY_METRICS[metric].unit}. Floor numbers below. ? means unknown, —
					not applicable, and 0 measured zero. Select a bar or use Selected
					floor; exact values and samples are in the table.
				</p>
				<div className="mt-3 flex gap-1">
					{floors.map((f) => (
						<button
							type="button"
							key={f.floor}
							aria-label={`Select floor ${f.floor}: median ${ENTRY_METRICS[metric].label} ${metricText(f.entry[metric], metric, f)}, n=${f.entry[metric].n}`}
							aria-pressed={selected.floor === f.floor}
							onClick={() => choose(f.floor)}
							className={`flex min-w-0 flex-1 flex-col items-center rounded px-0.5 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected.floor === f.floor ? "bg-primary/10 ring-1 ring-primary" : "hover:bg-muted"}`}
						>
							<span aria-hidden="true" className="flex h-28 w-full items-end">
								{f.entry[metric].value === null ? (
									<span className="w-full text-center text-sm text-muted-foreground">
										{metricText(f.entry[metric], metric, f) === "Unknown"
											? "?"
											: "—"}
									</span>
								) : f.entry[metric].value === 0 ? (
									<span className="w-full text-center text-sm tabular-nums">
										0
									</span>
								) : (
									<span
										className="w-full rounded-t bg-primary/70"
										style={{
											height: `${(100 * (f.entry[metric].value ?? 0)) / max}%`,
										}}
									/>
								)}
							</span>
							<span aria-hidden="true" className="mt-1 text-xs tabular-nums">
								{f.floor}
							</span>
						</button>
					))}
				</div>
				<details className="mt-3">
					<summary className="cursor-pointer text-sm">
						Progression values and samples
					</summary>
					<table className="mt-2 w-full text-left text-sm tabular-nums">
						<caption className="sr-only">
							First-entry {ENTRY_METRICS[metric].label} by floor
						</caption>
						<thead>
							<tr>
								<th scope="col">Floor</th>
								<th scope="col">Median</th>
								<th scope="col">Sample</th>
								<th scope="col">Reached / submitted</th>
							</tr>
						</thead>
						<tbody>
							{floors.map((f) => (
								<tr key={f.floor} className="border-t border-border/50">
									<th scope="row" className="py-1 font-normal">
										{f.floor}
									</th>
									<td>{metricText(f.entry[metric], metric, f)}</td>
									<td>
										n={f.entry[metric].n}
										{f.entry[metric].notApplicable > 0
											? ` · ${f.entry[metric].notApplicable} not applicable`
											: ""}
									</td>
									<td>
										{f.reached}/{f.total}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</details>
			</EmberPanel>
			<EmberPanel>
				<h3 className="font-serif text-lg font-semibold">
					Floor {selected.floor} detail
				</h3>
				<p className="mt-1 text-sm tabular-nums">
					Observed reach: {selected.reached}/{selected.total} selected submitted
					runs ·{" "}
					{selected.observed
						? `${number((100 * selected.reached) / selected.total)}%`
						: "Unknown"}
					.
				</p>
				<p className="mt-1 text-xs text-muted-foreground">
					Checkpoint coverage: {selected.observed}/{selected.total} selected
					runs. Missing reach is unknown; the observed fraction is a minimum
					when coverage is incomplete. Unreached floors are excluded from all
					measurement samples.
				</p>
				<EntryTable
					floor={selected}
					keys={primary}
					caption={`Floor ${selected.floor} first-entry medians`}
				/>
				<details className="mt-3">
					<summary className="cursor-pointer text-sm">
						First-entry attributes and defenses
					</summary>
					<EntryTable
						floor={selected}
						keys={secondary}
						caption={`Floor ${selected.floor} attributes and defenses`}
					/>
				</details>
			</EmberPanel>
			<div className="grid gap-4 md:grid-cols-2">
				<Counters
					title="Damage received"
					metrics={selected.damage}
					labels={DAMAGE_LABELS}
					floor={selected}
				/>
				<Counters
					title="Healing received"
					metrics={selected.healing}
					labels={HEALING_LABELS}
					floor={selected}
					healing
				/>
			</div>
			<EmberPanel>
				<h3 className="font-serif font-semibold">
					Runs reaching floor {selected.floor}
				</h3>
				<p className="mt-1 text-xs text-muted-foreground">
					{runs.length} runs with observed first entry. Inspect loads one full
					run on demand; it does not replay turns.
				</p>
				<ul className="mt-3 grid gap-2 md:grid-cols-2">
					{runs.slice(runPage * 10, runPage * 10 + 10).map((entry) => (
						<li
							key={entry.id}
							className="flex items-center justify-between gap-2 text-sm"
						>
							<span>
								Seed {entry.summary.seed} · {entry.summary.outcome}
							</span>
							<Button
								type="button"
								size="sm"
								variant="outline"
								aria-label={`Inspect floor ${selected.floor} run ${entry.summary.seed}`}
								onClick={() => onInspect(entry)}
							>
								Inspect
							</Button>
						</li>
					))}
				</ul>
				{!runs.length && (
					<p className="mt-2 text-sm">No observed runs reached this floor.</p>
				)}
				{runs.length > 10 && (
					<div className="mt-3 flex items-center gap-3 text-xs">
						<Button
							type="button"
							size="sm"
							variant="outline"
							disabled={!runPage}
							onClick={() => setRunPage((p) => p - 1)}
						>
							Previous floor runs
						</Button>
						Page {runPage + 1}
						<Button
							type="button"
							size="sm"
							variant="outline"
							disabled={(runPage + 1) * 10 >= runs.length}
							onClick={() => setRunPage((p) => p + 1)}
						>
							Next floor runs
						</Button>
					</div>
				)}
			</EmberPanel>
			<p className="text-xs text-muted-foreground">
				Checkpoint history stores first entry, latest exit, visits and a
				separate terminal snapshot. Their differences are not total floor time,
				damage, healing or consumption. Accumulated damage/healing includes
				repeated visits; town treatment stays separate. A death is not a normal
				exit.
			</p>
		</section>
	);
}
