import { Download, FlaskConical, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { statisticsCsv } from "../../scripts/statistics-csv.mjs";
import { useAccount } from "../accounts/AccountProvider";
import { Button } from "../components/ui/button";
import { EmberMenuHeader, EmberPanel } from "../components/ui/EmberMenu";
import {
	SheetContent,
	SheetDescription,
	SheetTitle,
} from "../components/ui/sheet";
import { DIFFICULTY_PRESETS } from "../domain/game/Difficulty";
import {
	filterStatistics,
	type StatisticsEntry,
	type StatisticsFilters,
	statisticsBreakdowns,
} from "./StatisticsData";

const label = (value: string) => value.replaceAll("-", " ");
const inputClass =
	"h-9 rounded-md border bg-background px-2 text-sm text-foreground";
const Counts = ({
	title,
	rows,
	note,
}: {
	title: string;
	rows: readonly (readonly [string, number])[];
	note?: string;
}) => (
	<EmberPanel>
		<h3 className="font-serif text-base font-semibold">{title}</h3>
		{note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
		<dl className="mt-3 grid gap-2">
			{rows.length ? (
				rows.map(([key, count]) => (
					<div
						key={key}
						className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 text-sm"
					>
						<dt className="truncate capitalize">{label(key)}</dt>
						<dd className="tabular-nums">{count}</dd>
						<div
							aria-hidden="true"
							className="col-span-2 h-1.5 overflow-hidden rounded-full bg-muted"
						>
							<div
								className="h-full rounded-full bg-primary/65"
								style={{
									width: `${(100 * count) / Math.max(...rows.map((r) => r[1]), 1)}%`,
								}}
							/>
						</div>
					</div>
				))
			) : (
				<p className="text-sm text-muted-foreground">No recorded encounters.</p>
			)}
		</dl>
	</EmberPanel>
);
export default function DeveloperStatisticsPage() {
	const account = useAccount(),
		current = useRef(account);
	current.current = account;
	const uid = account.user?.uid;
	const title = useRef<HTMLHeadingElement>(null),
		abort = useRef<AbortController | null>(null);
	const detailAbort = useRef<AbortController | null>(null);
	const [from, setFrom] = useState(() =>
		new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
	);
	const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
	const [entries, setEntries] = useState<StatisticsEntry[]>([]);
	const [loading, setLoading] = useState(false),
		[loaded, setLoaded] = useState(false),
		[error, setError] = useState<string | null>(null);
	const [filters, setFilters] = useState<StatisticsFilters>({
		version: "all",
		difficulty: "all",
		standard: "all",
		outcome: "all",
	});
	const [page, setPage] = useState(0),
		[detail, setDetail] = useState<StatisticsEntry | null>(null);
	const [detailLoading, setDetailLoading] = useState(false),
		[detailError, setDetailError] = useState<string | null>(null);
	const [loadedRange, setLoadedRange] = useState("");
	useEffect(
		() => () => {
			abort.current?.abort();
			detailAbort.current?.abort();
		},
		[],
	);
	const closeDetail = () => {
		detailAbort.current?.abort();
		setDetail(null);
		setDetailLoading(false);
		setDetailError(null);
	};
	const inspect = async (entry: StatisticsEntry) => {
		detailAbort.current?.abort();
		const controller = new AbortController();
		detailAbort.current = controller;
		setDetail(entry);
		setDetailLoading(true);
		setDetailError(null);
		try {
			const token = await current.current.idToken();
			if (
				controller.signal.aborted ||
				current.current.user?.uid !== uid ||
				!current.current.user?.developer
			)
				return;
			const response = await fetch(
				`/api/developer-statistics?${new URLSearchParams({ id: entry.id })}`,
				{
					headers: { authorization: `Bearer ${token}` },
					signal: controller.signal,
				},
			);
			const data = await response.json();
			if (!response.ok)
				throw Error(data.error ?? "Run detail could not be loaded.");
			if (
				controller.signal.aborted ||
				current.current.user?.uid !== uid ||
				!current.current.user?.developer
			)
				return;
			if (data.rows?.[0]?.id !== entry.id)
				throw Error("This run is no longer available.");
			setDetail(data.rows[0]);
		} catch (failure) {
			if (!controller.signal.aborted)
				setDetailError(
					failure instanceof Error
						? failure.message
						: "Run detail could not be loaded.",
				);
		} finally {
			if (!controller.signal.aborted) setDetailLoading(false);
		}
	};
	const rows = useMemo(
		() => filterStatistics(entries, filters),
		[entries, filters],
	);
	const counts = useMemo(
		() => statisticsBreakdowns(rows.map((r) => r.summary)),
		[rows],
	);
	const load = async () => {
		abort.current?.abort();
		const controller = new AbortController();
		abort.current = controller;
		setLoading(true);
		setLoaded(false);
		setError(null);
		setEntries([]);
		setPage(0);
		closeDetail();
		try {
			let after: string | null = null;
			const all: StatisticsEntry[] = [];
			do {
				const token = await current.current.idToken();
				if (
					controller.signal.aborted ||
					current.current.user?.uid !== uid ||
					current.current.user?.developer !== true
				)
					return;
				const params = new URLSearchParams();
				if (from) params.set("from", from);
				if (to) params.set("to", to);
				if (after) params.set("after", after);
				const response = await fetch(`/api/developer-statistics?${params}`, {
					headers: { authorization: `Bearer ${token}` },
					signal: controller.signal,
				});
				const data = await response.json();
				if (!response.ok)
					throw Error(data.error ?? "Statistics could not be loaded.");
				if (
					controller.signal.aborted ||
					current.current.user?.uid !== uid ||
					current.current.user?.developer !== true
				)
					return;
				all.push(...data.rows);
				setEntries([...all]);
				after = data.next;
			} while (after);
			setLoaded(true);
			setLoadedRange(
				`${from || "the beginning"} through ${to || "today"} (UTC)`,
			);
		} catch (failure) {
			if (!controller.signal.aborted)
				setError(
					failure instanceof Error
						? failure.message
						: "Couldn't load statistics.",
				);
		} finally {
			if (!controller.signal.aborted) setLoading(false);
		}
	};
	const download = () => {
		const blob = new Blob(
			[
				statisticsCsv(
					rows.map((r) => r.summary),
					true,
				),
			],
			{ type: "text/csv;charset=utf-8" },
		);
		const url = URL.createObjectURL(blob),
			a = document.createElement("a");
		a.href = url;
		a.download = "run-statistics.csv";
		a.click();
		URL.revokeObjectURL(url);
	};
	const change = (key: keyof StatisticsFilters, value: string) => {
		setFilters((old) => ({ ...old, [key]: value }));
		setPage(0);
		closeDetail();
	};
	if (account.user?.developer !== true) return null;
	return (
		<SheetContent
			initialFocus={title}
			className="ember-menu-frame overflow-y-auto data-[side=right]:w-full sm:data-[side=right]:max-w-6xl"
		>
			<EmberMenuHeader
				className="pr-12"
				icon={<FlaskConical />}
				heading={
					<SheetTitle
						ref={title}
						tabIndex={-1}
						className="ember-menu-title outline-none"
					>
						Developer statistics
					</SheetTitle>
				}
				subtitle={
					<SheetDescription className="ember-menu-description">
						Study recorded adventures. Developer runs never enter this data.
					</SheetDescription>
				}
			/>
			<div className="grid gap-4 px-4 pb-6">
				<EmberPanel>
					<form
						className="flex flex-wrap items-end gap-3"
						onSubmit={(event) => {
							event.preventDefault();
							void load();
						}}
					>
						<label className="grid gap-1 text-xs font-medium">
							From (UTC)
							<input
								aria-label="From date (UTC)"
								type="date"
								className={inputClass}
								value={from}
								onChange={(e) => setFrom(e.target.value)}
							/>
						</label>
						<label className="grid gap-1 text-xs font-medium">
							Through (UTC)
							<input
								aria-label="Through date (UTC)"
								type="date"
								className={inputClass}
								value={to}
								onChange={(e) => setTo(e.target.value)}
							/>
						</label>
						<Button type="submit" disabled={loading}>
							<Search aria-hidden="true" />
							{loaded ? "Reload summaries" : "Load statistics"}
						</Button>
						{loading && (
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									abort.current?.abort();
									setLoading(false);
									setError(
										"Loading stopped. Load statistics again for a complete date range.",
									);
								}}
							>
								Stop
							</Button>
						)}
						<p className="w-full text-xs text-muted-foreground">
							Reads summaries once per date range, in 200-run pages. The
							remaining filters work locally. Clear dates for all history;
							loading a large history uses more Firestore reads.
						</p>
					</form>
				</EmberPanel>
				{error && (
					<p
						role="alert"
						className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive"
					>
						{error}
					</p>
				)}
				{loading && (
					<p role="status" className="text-sm text-muted-foreground">
						Loading… {entries.length} summaries received. Breakdowns will appear
						when the date range is complete.
					</p>
				)}
				{loaded && (
					<>
						<p className="text-xs text-muted-foreground">
							Loaded {entries.length} summaries for {loadedRange}. Change dates
							and reload to choose another range.
						</p>
						<EmberPanel className="flex flex-wrap items-end gap-3">
							{(
								[
									{
										key: "version",
										name: "Version",
										options: [
											["all", "All versions"],
											...[...new Set(entries.map((r) => r.summary.gameVersion))]
												.sort()
												.map((v) => [v, v]),
										],
									},
									{
										key: "difficulty",
										name: "Difficulty",
										options: [
											["all", "All difficulties"],
											...Object.values(DIFFICULTY_PRESETS).map((d) => [
												String(d.multiplier),
												d.label,
											]),
										],
									},
									{
										key: "standard",
										name: "Dungeon",
										options: [
											["all", "Standard and custom"],
											["standard", "Standard"],
											["custom", "Custom"],
										],
									},
									{
										key: "outcome",
										name: "Outcome",
										options: [
											["all", "Wins and deaths"],
											["won", "Victory"],
											["died", "Death"],
										],
									},
								] as const
							).map((filter) => (
								<label
									key={filter.key}
									className="grid gap-1 text-xs font-medium"
								>
									{filter.name}
									<select
										aria-label={filter.name}
										className={inputClass}
										value={filters[filter.key]}
										onChange={(e) => change(filter.key, e.target.value)}
									>
										{filter.options.map(([value, name]) => (
											<option key={value} value={value}>
												{name}
											</option>
										))}
									</select>
								</label>
							))}
							<Button type="button" variant="outline" onClick={download}>
								<Download aria-hidden="true" />
								Export filtered CSV
							</Button>
						</EmberPanel>
						<div className="grid grid-cols-3 gap-3">
							{[
								["Recorded runs", counts.total],
								["Victories", counts.wins],
								["Deaths", counts.total - counts.wins],
							].map(([name, value]) => (
								<EmberPanel key={name} className="py-3">
									<p className="text-xs text-muted-foreground">{name}</p>
									<p className="mt-1 font-serif text-2xl font-semibold tabular-nums text-primary">
										{value}
									</p>
								</EmberPanel>
							))}
						</div>
						<div className="grid gap-4 md:grid-cols-2">
							<Counts
								title="Deaths by floor"
								rows={counts.deathFloors}
								note="Floor where the run ended; older summaries may not record it."
							/>
							<Counts title="Causes of death" rows={counts.deathCauses} />
							<EmberPanel>
								<h3 className="font-serif text-base font-semibold">
									Arena win rate
								</h3>
								<p className="mt-1 text-xs text-muted-foreground">
									Miniboss defeated among runs that entered the arena.
								</p>
								<dl className="mt-3 grid gap-3">
									{counts.arenas.length ? (
										counts.arenas.map(([boss, { met, defeated }]) => (
											<div
												key={boss}
												className="flex justify-between gap-3 text-sm"
											>
												<dt className="capitalize">{label(boss)}</dt>
												<dd className="tabular-nums">
													{defeated}/{met} ·{" "}
													{Math.round((100 * defeated) / met)}%
												</dd>
											</div>
										))
									) : (
										<p className="text-sm text-muted-foreground">
											No recorded arena entries.
										</p>
									)}
								</dl>
							</EmberPanel>
							<Counts title="Pact choices" rows={counts.pacts} />
							<Counts
								title="Omen frequency"
								rows={counts.omens}
								note={`Runs revealing each omen, among ${counts.omenRuns} runs tracked from turn zero. Partial older tracking is excluded.`}
							/>
							<EmberPanel>
								<h3 className="font-serif text-base font-semibold">
									The thief’s take
								</h3>
								{counts.theft.runs > 0 ? (
									<>
										<p className="mt-1 text-xs text-muted-foreground">
											From {counts.theft.runs} runs with complete gold tracking.
										</p>
										<dl className="mt-3 grid gap-2 text-sm">
											{[
												["Gold stolen", counts.theft.stolen],
												["Gold recovered", counts.theft.recovered],
												[
													"Unrecovered",
													counts.theft.stolen - counts.theft.recovered,
												],
											].map(([name, value]) => (
												<div key={name} className="flex justify-between gap-3">
													<dt>{name}</dt>
													<dd className="tabular-nums">
														{value.toLocaleString()}
													</dd>
												</div>
											))}
										</dl>
									</>
								) : (
									<p className="mt-2 text-sm text-muted-foreground">
										No complete gold tracking in this date range yet.
									</p>
								)}
								<p className="mt-2 text-sm text-muted-foreground">
									Older summaries did not record gold totals. Partial tracking
									is available in run detail and excluded from this breakdown.
								</p>
							</EmberPanel>
						</div>
						<div className="overflow-hidden rounded-lg border">
							<table className="w-full text-left text-sm tabular-nums">
								<caption className="sr-only">Recorded run summaries</caption>
								<thead className="bg-muted/50 text-xs text-muted-foreground">
									<tr>
										{[
											"Seed",
											"Version",
											"Outcome",
											"Deepest",
											"Turns",
											"Level",
											"Finished (UTC)",
											"Detail",
										].map((name) => (
											<th scope="col" className="px-2 py-3" key={name}>
												{name}
											</th>
										))}
									</tr>
								</thead>
								<tbody className="divide-y">
									{rows.slice(page * 20, page * 20 + 20).map((entry) => (
										<tr key={entry.id}>
											<td className="px-2 py-2 font-mono text-xs">
												{entry.summary.seed}
											</td>
											<td className="px-2 py-2 text-xs">
												{entry.summary.gameVersion}
											</td>
											<td className="px-2 py-2">{entry.summary.outcome}</td>
											<td className="px-2 py-2">
												{entry.summary.deepestFloor}
											</td>
											<td className="px-2 py-2">
												{entry.summary.turns.toLocaleString()}
											</td>
											<td className="px-2 py-2">{entry.summary.level}</td>
											<td className="px-2 py-2 text-xs">
												{entry.summary.finishedAt.slice(0, 10)}
											</td>
											<td className="px-2 py-2">
												<Button
													type="button"
													size="sm"
													variant="ghost"
													aria-label={`Inspect run ${entry.summary.seed}`}
													disabled={detailLoading && detail?.id === entry.id}
													onClick={() => void inspect(entry)}
												>
													Inspect
												</Button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
							{!rows.length && (
								<p className="p-6 text-center text-sm text-muted-foreground">
									No runs match these filters.
								</p>
							)}
						</div>
						<div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
							<p>
								{rows.length} matching / {entries.length} loaded
							</p>
							<div className="flex items-center gap-2">
								<Button
									type="button"
									size="sm"
									variant="outline"
									disabled={page === 0}
									onClick={() => setPage((p) => p - 1)}
								>
									Previous
								</Button>
								Page {page + 1}
								<Button
									type="button"
									size="sm"
									variant="outline"
									disabled={(page + 1) * 20 >= rows.length}
									onClick={() => setPage((p) => p + 1)}
								>
									Next
								</Button>
							</div>
						</div>
						{detail && (
							<EmberPanel>
								<div className="flex items-center justify-between gap-2">
									<h3 className="font-serif text-base font-semibold">
										Run detail · Seed {detail.summary.seed}
									</h3>
									<Button
										type="button"
										variant="ghost"
										aria-label="Close run detail"
										onClick={closeDetail}
									>
										<X aria-hidden="true" />
									</Button>
								</div>
								{detailLoading && (
									<p
										role="status"
										className="mt-3 text-sm text-muted-foreground"
									>
										Loading run detail…
									</p>
								)}
								{detailError && (
									<div className="mt-3 flex items-center gap-3">
										<p role="alert" className="text-sm text-destructive">
											{detailError}
										</p>
										<Button
											type="button"
											size="sm"
											variant="outline"
											onClick={() => void inspect(detail)}
										>
											Retry detail
										</Button>
									</div>
								)}
								<pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted/40 p-3 text-xs">
									{JSON.stringify(detail.summary, null, 2)}
								</pre>
							</EmberPanel>
						)}
					</>
				)}
			</div>
		</SheetContent>
	);
}
