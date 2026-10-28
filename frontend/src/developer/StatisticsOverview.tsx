import { EmberPanel } from "../components/ui/EmberMenu";
import type { Overview } from "./StatisticsAnalytics";

const label = (value: string) => value.replaceAll("-", " ");
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
				<p className="text-sm text-muted-foreground">
					No observations for this selection.
				</p>
			)}
		</dl>
	</EmberPanel>
);

const percent = (n: number, total: number) =>
	total ? `${((100 * n) / total).toFixed(1)}%` : "Not applicable";
export default function StatisticsOverview({ counts }: { counts: Overview }) {
	const total = counts.total;
	return (
		<section className="grid gap-4" aria-label="Overview results">
			<div className="grid grid-cols-3 gap-3">
				{[
					["Submitted runs", String(total), "Finished and submitted"],
					[
						"Victories",
						String(counts.wins),
						`${counts.wins}/${total} submitted runs`,
					],
					[
						"Deaths",
						String(counts.deaths),
						`${counts.deaths}/${total} submitted runs`,
					],
					[
						"Win rate",
						percent(counts.wins, total),
						`${counts.wins}/${total} submitted runs`,
					],
					[
						"Median deepest floor",
						counts.deepest.value === null
							? total
								? "Unknown"
								: "Not applicable"
							: counts.deepest.value === 0
								? "No dungeon entry"
								: String(counts.deepest.value),
						`n=${counts.deepest.n} with checkpoints`,
					],
					[
						"Median run length",
						counts.turns.value === null
							? "Not applicable"
							: `${counts.turns.value.toLocaleString()} turns`,
						`n=${counts.turns.n} submitted runs`,
					],
				].map(([name, value, note]) => (
					<EmberPanel key={name} className="min-w-0 py-3">
						<h3 className="text-xs text-muted-foreground">{name}</h3>
						<p className="mt-1 font-serif text-xl font-semibold tabular-nums text-primary">
							{value}
						</p>
						<p className="mt-1 text-xs text-muted-foreground">{note}</p>
					</EmberPanel>
				))}
			</div>
			<EmberPanel>
				<h3 className="font-serif text-base font-semibold">
					Telemetry coverage
				</h3>
				<dl className="mt-2 grid gap-2 md:grid-cols-3">
					{(
						[
							["Floor checkpoints", counts.coverage.checkpoints],
							["Damage and healing", counts.coverage.combat],
							["Ownership and knowledge", counts.coverage.economy],
							["Usage counters", counts.coverage.usage],
							["Availability + usage", counts.coverage.availabilityAndUsage],
						] as const
					).map(([name, n]) => (
						<div key={name} className="text-sm">
							<dt className="text-muted-foreground">{name}</dt>
							<dd className="tabular-nums">
								{n}/{total} runs · {percent(n, total)}
							</dd>
						</div>
					))}
				</dl>
				<p className="mt-3 text-xs text-muted-foreground">
					Missing history is unknown; tracked empty maps are measured zero.
					Unreached floors and zero denominators are not applicable.
					Availability + usage counts the intersection of both groups.
				</p>
			</EmberPanel>
			<EmberPanel>
				<h3 className="font-serif text-base font-semibold">
					Observed floor reach among submitted runs
				</h3>
				<p className="mt-1 text-xs text-muted-foreground">
					Each run counts once per first-entered floor, including revisits.{" "}
					{counts.coverage.checkpoints}/{total} runs have checkpoints;{" "}
					{total - counts.coverage.checkpoints} have unknown reach. Percentages
					use all {total} selected runs and are minimum observed reach when
					history is missing. Deepest-floor medians use checkpoints, never map
					previews.
				</p>
				<p className="mt-1 text-xs text-muted-foreground">
					Bar height: observed reach from 0–100%; floor numbers below. Read
					exact values in the table.
				</p>
				{counts.reach.length ? (
					<div className="mt-3 grid gap-1">
						<div
							aria-hidden="true"
							className="flex items-end gap-1 border-b border-border"
						>
							{counts.reach.map((r) => (
								<div
									key={r.floor}
									className="flex min-w-0 flex-1 flex-col items-center justify-end"
								>
									<div className="flex h-24 w-full items-end">
										<div
											className="w-full rounded-t-sm bg-primary/70"
											style={{
												height: `${total ? (100 * r.reached) / total : 0}%`,
											}}
										/>
									</div>
									<span className="text-[10px] tabular-nums">{r.floor}</span>
								</div>
							))}
						</div>
						<details className="mt-2">
							<summary className="cursor-pointer text-sm">
								Floor reach values
							</summary>
							<table className="mt-2 w-full text-left text-sm tabular-nums">
								<caption className="sr-only">Observed floor reach</caption>
								<thead>
									<tr>
										<th scope="col">Floor</th>
										<th scope="col">Reached / submitted</th>
										<th scope="col">Observed reach</th>
									</tr>
								</thead>
								<tbody>
									{counts.reach.map((r) => (
										<tr key={r.floor}>
											<th scope="row" className="py-1 font-normal">
												{r.floor}
											</th>
											<td>
												{r.reached}/{r.total}
											</td>
											<td>
												{r.observed
													? percent(r.reached, r.total)
													: r.total
														? "Unknown"
														: "Not applicable"}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</details>
					</div>
				) : (
					<p className="mt-2 text-sm">No observed floor entries.</p>
				)}
			</EmberPanel>
			<div className="grid gap-4 md:grid-cols-2">
				<Counts
					title="Deaths by floor"
					rows={counts.deathFloors}
					note={`Among ${counts.deaths} deaths. Town and unknown historical end locations remain separate.`}
				/>
				<Counts
					title="Causes of death"
					rows={counts.deathCauses}
					note={`Among ${counts.deaths} deaths; unknown causes are shown explicitly.`}
				/>
			</div>
			<details>
				<summary className="cursor-pointer text-sm font-medium">
					Encounters, pacts and theft
				</summary>
				<div className="mt-3 grid gap-4 md:grid-cols-2">
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
											{defeated}/{met} · {Math.round((100 * defeated) / met)}%
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
											<dd className="tabular-nums">{value.toLocaleString()}</dd>
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
							Older summaries did not record gold totals. Partial tracking is
							available in run detail and excluded from this breakdown.
						</p>
					</EmberPanel>
				</div>
			</details>
		</section>
	);
}
