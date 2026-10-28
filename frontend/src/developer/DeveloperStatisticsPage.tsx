import { Tabs } from "@base-ui/react/tabs";
import { FlaskConical, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAccount } from "../accounts/AccountProvider";
import { Button } from "../components/ui/button";
import { EmberMenuHeader, EmberPanel } from "../components/ui/EmberMenu";
import { EmberTab, EmberTabsList } from "../components/ui/EmberTabs";
import {
	SheetContent,
	SheetDescription,
	SheetTitle,
} from "../components/ui/sheet";
import { DIFFICULTY_PRESETS } from "../domain/game/Difficulty";
import { GAME_VERSION } from "../domain/game/GameVersion";
import {
	type AnalyticsFilters,
	type AnalyticsResult,
	analyticsDefaults,
} from "./StatisticsAnalytics";
import type { MetadataEntry, StatisticsEntry } from "./StatisticsData";
import StatisticsFloorProgression from "./StatisticsFloorProgression";
import StatisticsItemUsage from "./StatisticsItemUsage";
import StatisticsOverview from "./StatisticsOverview";
import StatisticsRunDetail from "./StatisticsRunDetail";

const inputClass =
	"h-9 min-w-0 rounded-md border bg-background px-2 text-sm text-foreground";
export default function DeveloperStatisticsPage() {
	const account = useAccount(),
		current = useRef(account);
	current.current = account;
	const uid = account.user?.uid;
	const title = useRef<HTMLHeadingElement>(null),
		abort = useRef<AbortController | null>(null),
		detailAbort = useRef<AbortController | null>(null);
	const [view, setView] = useState("overview");
	const detailTitle = useRef<HTMLHeadingElement>(null),
		detailOrigin = useRef<HTMLElement | null>(null);
	const [filters, setFilters] = useState(analyticsDefaults);
	const [result, setResult] = useState<AnalyticsResult | null>(null);
	const [loading, setLoading] = useState(false),
		[error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(0),
		[detail, setDetail] = useState<MetadataEntry | null>(null);
	const [loadedDetail, setLoadedDetail] = useState<StatisticsEntry | null>(
		null,
	);
	const [detailLoading, setDetailLoading] = useState(false),
		[detailError, setDetailError] = useState<string | null>(null);
	useEffect(
		() => () => {
			abort.current?.abort();
			detailAbort.current?.abort();
		},
		[],
	);
	useEffect(() => {
		if (detail?.id) detailTitle.current?.focus();
	}, [detail?.id]);
	const closeDetail = (restoreFocus = false) => {
		detailAbort.current?.abort();
		setDetail(null);
		setLoadedDetail(null);
		setDetailLoading(false);
		setDetailError(null);
		if (restoreFocus)
			(detailOrigin.current?.isConnected
				? detailOrigin.current
				: title.current
			)?.focus();
	};
	const inspect = async (entry: MetadataEntry) => {
		if (detail?.id !== entry.id)
			detailOrigin.current =
				document.activeElement instanceof HTMLElement
					? document.activeElement
					: null;
		detailAbort.current?.abort();
		const controller = new AbortController();
		detailAbort.current = controller;
		setDetail(entry);
		setLoadedDetail(null);
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
			setLoadedDetail(data.rows[0]);
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

	const rows = result?.rows ?? [];
	const stale =
		result !== null &&
		JSON.stringify(filters) !== JSON.stringify(result.filters);
	const change = (key: keyof AnalyticsFilters, value: string) => {
		abort.current?.abort();
		setLoading(false);
		setError(null);
		setFilters((old) => ({ ...old, [key]: value }));
		setPage(0);
		closeDetail();
	};
	const load = async () => {
		abort.current?.abort();
		const controller = new AbortController();
		abort.current = controller;
		setLoading(true);
		setResult(null);
		setError(null);
		setPage(0);
		closeDetail();
		const active = () =>
			!controller.signal.aborted &&
			current.current.user?.uid === uid &&
			current.current.user?.developer === true;
		try {
			const token = await current.current.idToken();
			if (!active()) return;
			const response = await fetch(
				`/api/developer-statistics?${new URLSearchParams({ aggregate: "overview", ...filters })}`,
				{
					headers: { authorization: `Bearer ${token}` },
					signal: controller.signal,
				},
			);
			const data = await response.json();
			if (!active()) return;
			if (!response.ok || data.complete !== true)
				throw Error(
					`${data.error ?? "Statistics could not be loaded. Try again."}${typeof data.scanned === "number" ? ` Incomplete: ${data.scanned} scanned, ${data.selected} selected; no aggregates published.` : ""}`,
				);
			setResult(data);
		} catch (failure) {
			if (active())
				setError(
					failure instanceof Error
						? failure.message
						: "Statistics could not be loaded. Try again.",
				);
		} finally {
			if (active()) setLoading(false);
		}
	};
	const versions = [
		...new Set([GAME_VERSION, filters.version, ...(result?.versions ?? [])]),
	]
		.filter((v) => v !== "all")
		.sort();
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
						Progression and usage in finished, submitted adventures.
					</SheetDescription>
				}
			/>
			<Tabs.Root
				className="grid gap-4 px-4 pb-6"
				value={view}
				onValueChange={(value) => {
					setView(String(value));
					closeDetail();
				}}
			>
				<EmberPanel>
					<form
						className="flex flex-wrap items-end gap-3"
						onSubmit={(e) => {
							e.preventDefault();
							void load();
						}}
					>
						{(
							[
								["from", "From date (UTC)"],
								["to", "Through date (UTC)"],
							] as const
						).map(([key, name]) => (
							<label key={key} className="grid gap-1 text-xs font-medium">
								{name}
								<input
									aria-label={name}
									type="date"
									className={inputClass}
									value={filters[key]}
									onChange={(e) => change(key, e.target.value)}
								/>
							</label>
						))}
						{(
							[
								{
									key: "version",
									name: "Version",
									options: [
										["all", "All versions"],
										...versions.map((v) => [
											v,
											v === GAME_VERSION ? `${v} (current)` : v,
										]),
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
										["standard", "Standard 40×40×20"],
										["custom", "Custom"],
									],
								},
								{
									key: "outcome",
									name: "Outcome",
									options: [
										["all", "All outcomes"],
										["won", "Victory"],
										["died", "Death"],
									],
								},
							] as const
						).map((filter) => (
							<label
								key={filter.key}
								className="grid min-w-0 gap-1 text-xs font-medium"
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
						<Button type="submit" disabled={loading}>
							<Search aria-hidden="true" />
							{result ? "Refresh statistics" : "Load statistics"}
						</Button>
						{loading && (
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									abort.current?.abort();
									setLoading(false);
									setError(
										"Loading stopped. Load again for a complete selection.",
									);
								}}
							>
								Stop
							</Button>
						)}
						<p className="w-full text-xs text-muted-foreground">
							Finish dates use UTC, including the whole through-date. Clear
							dates for open ranges. Each load scans at most 2,000 metadata
							records and includes at most 500 selected runs; broad selections
							cost more Firestore reads. Change filters and load explicitly; no
							polling.
						</p>
					</form>
				</EmberPanel>

				<EmberTabsList aria-label="Statistics views">
					<EmberTab value="overview">Overview</EmberTab>
					<EmberTab value="floors">Floor progression</EmberTab>
					<EmberTab value="items">Equipment, spells and consumables</EmberTab>
				</EmberTabsList>

				<p className="text-xs text-muted-foreground">
					These are finished, submitted runs. Abandoned, signed-out and
					offline/unsubmitted adventures can be absent. Floor reach is not a
					population survival probability; associations do not establish a
					balance effect.
				</p>
				{loading && (
					<p role="status" className="text-sm">
						Loading the complete selection…
					</p>
				)}
				{error && (
					<p
						role="alert"
						className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive"
					>
						{error}
					</p>
				)}
				{stale && (
					<p role="status" className="text-sm">
						Filters changed. Load statistics to update this selection.
					</p>
				)}
				{result && !stale && (
					<>
						<p className="text-xs text-muted-foreground">
							Complete selection: {result.selected} selected / {result.scanned}{" "}
							scanned · {result.filters.from || "the beginning"} through{" "}
							{result.filters.to || "today"} (UTC) · loaded{" "}
							{result.loadedAt.replace("T", " ").slice(0, 19)} UTC.
						</p>
						{(result.overview.mixedVersions ||
							result.overview.mixedConfigurations) && (
							<p role="status" className="text-sm text-primary">
								This selection mixes{" "}
								{result.overview.mixedVersions ? "game versions" : ""}
								{result.overview.mixedVersions &&
								result.overview.mixedConfigurations
									? " and "
									: ""}
								{result.overview.mixedConfigurations
									? "dungeon configurations"
									: ""}
								. Interpret pooled results with care.
							</p>
						)}
						{!rows.length && (
							<EmberPanel>
								<h3 className="font-serif text-lg">
									No runs match these filters
								</h3>
								<p className="mt-2 text-sm text-muted-foreground">
									No older version was substituted. Choose All versions, change
									difficulty or dungeon, or broaden the dates and load again.
								</p>
								<Button
									type="button"
									variant="outline"
									className="mt-3"
									onClick={() => change("version", "all")}
								>
									Choose all versions
								</Button>
							</EmberPanel>
						)}
						<Tabs.Panel value="overview" keepMounted>
							<StatisticsOverview counts={result.overview} />
						</Tabs.Panel>
						<Tabs.Panel value="floors" keepMounted>
							<StatisticsFloorProgression
								floors={result.floors}
								rows={rows}
								onInspect={(entry) => void inspect(entry)}
								onFloorChange={() => closeDetail()}
							/>
						</Tabs.Panel>
						<Tabs.Panel value="items" keepMounted>
							<StatisticsItemUsage items={result.items} />
						</Tabs.Panel>
						<div className="overflow-x-auto rounded-lg border">
							<table className="w-full text-left text-sm tabular-nums">
								<caption className="sr-only">Recorded run summaries</caption>
								<thead className="bg-muted/50 text-xs text-muted-foreground">
									<tr>
										{[
											"Seed",
											"Version",
											"Outcome",
											"Deepest mapped",
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
								{rows.length} matching / {result.scanned} scanned
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
									<h3
										ref={detailTitle}
										tabIndex={-1}
										className="font-serif text-base font-semibold outline-none"
									>
										Run detail · Seed {detail.summary.seed}
									</h3>
									<Button
										type="button"
										variant="ghost"
										aria-label="Close run detail"
										onClick={() => closeDetail(true)}
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
								{loadedDetail && (
									<StatisticsRunDetail
										key={loadedDetail.id}
										summary={loadedDetail.summary}
									/>
								)}
							</EmberPanel>
						)}
					</>
				)}
			</Tabs.Root>
		</SheetContent>
	);
}
