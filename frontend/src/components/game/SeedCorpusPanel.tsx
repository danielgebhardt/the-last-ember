import { useId, useState } from "react";
import {
	type AdventureRecord,
	type CorpusSummary,
	corpusCsv,
	seedCorpusReport,
} from "../../domain/dev/SeedCorpus";
import { DEFAULT_RUN_CONFIGURATION } from "../../domain/dungeon/RunConfiguration";
import { MONSTER_DEFINITIONS } from "../../domain/monsters/Monster";
import { OBJECT_DEFINITIONS } from "../../domain/objects/DungeonObject";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
const fixed = (value: number) => value.toFixed(2);
const floors = (min: number | null, max: number | null) =>
	min === null ? "—" : min === max ? `${min}` : `${min}–${max}`;

const Table = ({
	caption,
	head,
	rows,
}: {
	caption: string;
	head: readonly string[];
	rows: readonly (readonly (string | number)[])[];
}) => (
	<table className="w-full text-left text-xs tabular-nums">
		<caption className="mb-1 text-left text-sm font-semibold">
			{caption}
		</caption>
		<thead>
			<tr className="border-b">
				{head.map((cell) => (
					<th key={cell} className="py-1 pr-3 font-medium">
						{cell}
					</th>
				))}
			</tr>
		</thead>
		<tbody>
			{rows.map((row) => (
				<tr key={String(row[0])} className="border-b border-border/40">
					{row.map((cell, index) => (
						<td key={`${row[0]}:${index}`} className="py-1 pr-3">
							{cell}
						</td>
					))}
				</tr>
			))}
		</tbody>
	</table>
);

const download = (name: string, type: string, content: string) => {
	const url = URL.createObjectURL(new Blob([content], { type }));
	const link = document.createElement("a");
	link.href = url;
	link.download = name;
	link.click();
	URL.revokeObjectURL(url);
};

const Report = ({ summary }: { summary: CorpusSummary }) => {
	const { discoveries, afflictionSources, monsters, economy, encounters } =
		summary;
	const floorRows = monsters.perFloor.map((count, index) => [
		index + 1,
		count.toFixed(1),
		(monsters.huntersPerReturnFloor[index] ?? 0).toFixed(1),
		Math.round(economy.goldPerFloor[index]),
		Math.round(economy.cumulativeGold[index]),
	]);
	return (
		<div className="grid gap-5">
			<Table
				caption={`Rare discoveries · ${percent(discoveries.any)} of adventures have one`}
				head={["Discovery", "Adventures", "Floors"]}
				rows={discoveries.byKind.map((d) => [
					OBJECT_DEFINITIONS[d.kind].name,
					percent(d.share),
					floors(d.minFloor, d.maxFloor),
				])}
			/>
			<Table
				caption={`Affliction sources · ${fixed(afflictionSources.perAdventure)} per adventure, ${fixed(afflictionSources.remedyDropsPerAdventure)} guaranteed remedy drops`}
				head={["Monster", "Per adventure", "Floors"]}
				rows={afflictionSources.byKind.map((s) => [
					MONSTER_DEFINITIONS[s.kind].name,
					fixed(s.perAdventure),
					floors(s.minFloor, s.maxFloor),
				])}
			/>
			<Table
				caption={`By floor · ${fixed(monsters.sentriesPerAdventure)} alarm sentries per adventure`}
				head={[
					"Floor",
					"Monsters",
					"Return hunters",
					"Gold placed",
					"Gold so far",
				]}
				rows={floorRows}
			/>
			<Table
				caption="Monster mix"
				head={["Monster", "Share of all monsters"]}
				rows={monsters.kindMix.map((m) => [
					MONSTER_DEFINITIONS[m.kind].name,
					percent(m.share),
				])}
			/>
			<Table
				caption="Optional encounters"
				head={["Encounter", "Per adventure"]}
				rows={encounters.map((e) => [
					OBJECT_DEFINITIONS[e.kind].name,
					fixed(e.perAdventure),
				])}
			/>
			<Table
				caption="Town prices for comparison with gold placed"
				head={["Purchase", "Gold"]}
				rows={economy.prices.map((p) => [p.name, p.price])}
			/>
		</div>
	);
};

// Developer-only: generates adventures from the real rules and reports what they
// place. Nothing here touches the current adventure.
const SeedCorpusPanel = () => {
	const startId = useId(),
		countId = useId();
	const [start, setStart] = useState(0);
	const [count, setCount] = useState(200);
	const [progress, setProgress] = useState<number | null>(null);
	const [result, setResult] = useState<{
		records: readonly AdventureRecord[];
		summary: CorpusSummary;
	} | null>(null);
	const configuration = DEFAULT_RUN_CONFIGURATION;
	const run = async () => {
		setResult(null);
		setProgress(0);
		const seeds = Array.from({ length: count }, (_, i) => start + i);
		const report = await seedCorpusReport(seeds, configuration, setProgress);
		setResult(report);
		setProgress(null);
	};
	return (
		<section aria-label="Seed report" className="grid gap-4">
			<h3 className="text-lg font-semibold">Seed report</h3>
			<p className="text-sm text-muted-foreground">
				Generates adventures with the current rules and reports what they place:
				discoveries, affliction sources, monsters, return hunters, gold and
				encounters. It does not simulate play. Default configuration:{" "}
				{configuration.rows}×{configuration.cols}, {configuration.floorCount}{" "}
				floors. For larger runs use <code>node scripts/review-corpus.mjs</code>.
			</p>
			<div className="flex flex-wrap items-end gap-3">
				<label htmlFor={startId} className="grid gap-1 text-sm">
					First seed
					<Input
						id={startId}
						type="number"
						min={0}
						value={start}
						onChange={(event) =>
							setStart(Math.max(0, Number(event.target.value)))
						}
						className="w-32"
					/>
				</label>
				<label htmlFor={countId} className="grid gap-1 text-sm">
					Adventures
					<Input
						id={countId}
						type="number"
						min={1}
						max={2000}
						value={count}
						onChange={(event) =>
							setCount(Math.min(2000, Math.max(1, Number(event.target.value))))
						}
						className="w-32"
					/>
				</label>
				<Button onClick={run} disabled={progress !== null}>
					{progress === null
						? "Run report"
						: `Generating ${progress} / ${count}`}
				</Button>
				{result && (
					<>
						<Button
							variant="outline"
							onClick={() =>
								download(
									"seed-report.json",
									"application/json",
									JSON.stringify({ configuration, ...result.summary }, null, 2),
								)
							}
						>
							Download JSON
						</Button>
						<Button
							variant="outline"
							onClick={() =>
								download(
									"seed-report.csv",
									"text/csv",
									corpusCsv(result.records),
								)
							}
						>
							Download CSV
						</Button>
					</>
				)}
			</div>
			<output aria-live="polite" className="sr-only">
				{progress !== null
					? `Generating ${progress} of ${count}`
					: result
						? `Report ready for ${result.summary.adventures} adventures`
						: ""}
			</output>
			{result && <Report summary={result.summary} />}
		</section>
	);
};
export default SeedCorpusPanel;
