import { useState } from "react";
import { Button } from "../components/ui/button";
import { EmberPanel } from "../components/ui/EmberMenu";
import {
	sortUsageRows,
	type UsageCategory,
	type UsageComparison,
	type UsageRow,
	type UsageSort,
} from "./ItemUsage";

const categories = {
	equipment: {
		label: "Equipment",
		access: "Owned",
		units: "equipped turns",
		definition:
			"Used means at least one committed dungeon turn equipped. Identical rings count once per kind per turn. This does not measure damage dealt, effectiveness, or briefly equipping an item in town.",
	},
	spells: {
		label: "Spells",
		access: "Known",
		units: "successful casts",
		definition:
			"Known means starting knowledge or successful later learning. Usage counts successful casts, including utility spells; it does not count targets hit or measure effectiveness.",
	},
	consumables: {
		label: "Consumables",
		access: "Owned",
		units: "consumed",
		definition:
			"Owned means starting supplies or later first acquisitions. Usage counts actual consumption, including town use and enchantment scrolls. Purchases are already part of acquisitions and are not added again.",
	},
} as const;
const inputClass =
	"h-9 min-w-0 rounded-md border bg-background px-2 text-sm text-foreground";
const number = (value: number) =>
	value.toLocaleString(undefined, { maximumFractionDigits: 2 });
const unavailable = (row: UsageRow, coverage: UsageComparison["coverage"]) =>
	!coverage.selected
		? "Not applicable"
		: !coverage.access || row.unknownUsageOwners
			? "Unknown"
			: "Not applicable";
export default function StatisticsItemUsage({
	items,
}: {
	items: Record<UsageCategory, UsageComparison>;
}) {
	const [category, setCategory] = useState<UsageCategory>("equipment"),
		[sort, setSort] = useState<UsageSort>("unusedOwners"),
		[direction, setDirection] = useState<"asc" | "desc">("desc"),
		[search, setSearch] = useState(""),
		[show, setShow] = useState("all"),
		[page, setPage] = useState(0);
	const data = items[category],
		meta = categories[category],
		coverage = data.coverage;
	const rows = sortUsageRows(
		data.rows.filter(
			(row) =>
				(row.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()) ||
					row.kind.includes(search.toLocaleLowerCase())) &&
				(show === "all" ||
					(show === "unused" && row.unusedOwners > 0) ||
					(show === "unknown" && row.unknownUsageOwners > 0)),
		),
		sort,
		direction,
	);
	return (
		<section className="grid gap-4" aria-label="Availability and usage results">
			<EmberPanel>
				<h3 className="font-serif text-lg font-semibold">
					Availability and use
				</h3>
				<p className="mt-1 text-xs text-muted-foreground">
					Access means owned or learned at some point, from starting
					kit/knowledge plus acquisitions/learning in town or the dungeon.
					Generated, seen, affordable and unbought items are not access. These
					associations do not establish a causal balance effect.
				</p>
				<div className="mt-3 flex flex-wrap items-end gap-3">
					<label className="grid gap-1 text-xs font-medium">
						Comparison category
						<select
							aria-label="Comparison category"
							className={inputClass}
							value={category}
							onChange={(e) => {
								setCategory(e.target.value as UsageCategory);
								setPage(0);
							}}
						>
							{Object.entries(categories).map(([key, value]) => (
								<option key={key} value={key}>
									{value.label}
								</option>
							))}
						</select>
					</label>
					<label className="grid gap-1 text-xs font-medium">
						Find kind
						<input
							aria-label="Find kind"
							type="search"
							className={inputClass}
							value={search}
							onChange={(e) => {
								setSearch(e.target.value);
								setPage(0);
							}}
						/>
					</label>
					<label className="grid gap-1 text-xs font-medium">
						Show comparisons
						<select
							aria-label="Show comparisons"
							className={inputClass}
							value={show}
							onChange={(e) => {
								setShow(e.target.value);
								setPage(0);
							}}
						>
							<option value="all">All kinds</option>
							<option value="unused">Unused by covered owners</option>
							<option value="unknown">Owners with unknown usage</option>
						</select>
					</label>
					<label className="grid gap-1 text-xs font-medium">
						Sort comparisons
						<select
							aria-label="Sort comparisons"
							className={inputClass}
							value={sort}
							onChange={(e) => {
								setSort(e.target.value as UsageSort);
								setPage(0);
							}}
						>
							<option value="unusedOwners">Unused owners</option>
							<option value="name">Name</option>
							<option value="accessRuns">Owned / known runs</option>
							<option value="users">Used runs</option>
							<option value="rate">Use among owners</option>
							<option value="total">Total recorded usage</option>
							<option value="medianPerOwner">Median per covered owner</option>
						</select>
					</label>
					<label className="grid gap-1 text-xs font-medium">
						Sort direction
						<select
							aria-label="Sort direction"
							className={inputClass}
							value={direction}
							onChange={(e) => {
								setDirection(e.target.value as "asc" | "desc");
								setPage(0);
							}}
						>
							<option value="desc">Descending</option>
							<option value="asc">Ascending</option>
						</select>
					</label>
				</div>
				<p className="mt-3 text-sm">{meta.definition}</p>
				<dl className="mt-3 grid gap-2 text-sm md:grid-cols-3">
					{[
						["Access coverage", coverage.access],
						["Usage coverage", coverage.usage],
						["Both groups", coverage.both],
					].map(([label, count]) => (
						<div key={label}>
							<dt className="text-muted-foreground">{label}</dt>
							<dd className="tabular-nums">
								{count}/{coverage.selected} selected runs
							</dd>
						</div>
					))}
				</dl>
				<p className="mt-3 text-xs text-muted-foreground">
					Owned/known runs use access coverage. Used runs and totals use usage
					coverage, including runs with unknown access. Rates and medians use
					only owners with both groups recorded; median usage includes their
					measured zeros. Owners missing usage are unknown, never unused. Zero
					eligible owners makes a rate not applicable when access is known;
					missing required history stays unknown.
				</p>
			</EmberPanel>
			<EmberPanel>
				<h3 className="font-serif font-semibold">{meta.label} comparisons</h3>
				{!coverage.selected && (
					<p className="mt-2 text-sm">
						No selected runs. Choose filters and load data to compare usage.
					</p>
				)}
				<div className="mt-3 overflow-x-auto">
					<table className="w-full text-left text-sm tabular-nums">
						<caption className="sr-only">
							{meta.label} availability and usage
						</caption>
						<thead className="text-xs text-muted-foreground">
							<tr>
								<th scope="col" className="min-w-28 py-2 pr-3">
									Kind
								</th>
								<th scope="col" className="pr-3">
									{meta.access} runs
								</th>
								<th scope="col" className="pr-3">
									Used runs
								</th>
								<th scope="col" className="pr-3">
									Use among covered owners
								</th>
								<th scope="col" className="pr-3">
									Total {meta.units}
								</th>
								<th scope="col" className="pr-3">
									Median per covered owner
								</th>
								<th scope="col">Owner usage status</th>
							</tr>
						</thead>
						<tbody>
							{rows.slice(page * 15, page * 15 + 15).map((row) => (
								<tr key={row.kind} className="border-t border-border/50">
									<th scope="row" className="py-3 pr-3 font-normal">
										{row.name}
									</th>
									<td className="pr-3">
										{coverage.access
											? `${row.accessRuns}/${coverage.access}`
											: coverage.selected
												? "Unknown"
												: "Not applicable"}
									</td>
									<td className="pr-3">
										{coverage.usage
											? `${row.users}/${coverage.usage}`
											: coverage.selected
												? "Unknown"
												: "Not applicable"}
									</td>
									<td className="pr-3">
										{row.rate === null ? (
											unavailable(row, coverage)
										) : (
											<>
												<span>
													{number(100 * row.rate)}% · {row.eligibleUsers}/
													{row.eligibleOwners}
												</span>
												<div
													aria-hidden="true"
													className="mt-1 h-1.5 rounded bg-muted"
												>
													<div
														className="h-full rounded bg-primary/70"
														style={{ width: `${100 * row.rate}%` }}
													/>
												</div>
											</>
										)}
									</td>
									<td className="pr-3">
										{row.total === null
											? coverage.selected
												? "Unknown"
												: "Not applicable"
											: number(row.total)}
									</td>
									<td className="pr-3">
										{row.medianPerOwner.value === null
											? unavailable(row, coverage)
											: number(row.medianPerOwner.value)}
										<span className="block text-xs text-muted-foreground">
											n={row.medianPerOwner.n}
										</span>
									</td>
									<td>
										{coverage.access ? (
											<>
												{row.unusedOwners} unused
												<span className="block text-xs text-muted-foreground">
													{row.unknownUsageOwners} unknown
												</span>
											</>
										) : coverage.selected ? (
											"Unknown"
										) : (
											"Not applicable"
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				{!rows.length && (
					<p className="mt-3 text-sm">
						No kinds match these comparison filters.
					</p>
				)}
				<div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
					<p>{rows.length} kinds match · local sorting and filtering</p>
					<div className="flex items-center gap-2">
						<Button
							type="button"
							size="sm"
							variant="outline"
							disabled={!page}
							onClick={() => setPage((p) => p - 1)}
						>
							Previous kinds
						</Button>
						Page {page + 1}
						<Button
							type="button"
							size="sm"
							variant="outline"
							disabled={(page + 1) * 15 >= rows.length}
							onClick={() => setPage((p) => p + 1)}
						>
							Next kinds
						</Button>
					</div>
				</div>
			</EmberPanel>
		</section>
	);
}
