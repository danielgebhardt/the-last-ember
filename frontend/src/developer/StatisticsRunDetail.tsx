import { useId, useState } from "react";
import { difficultyLabel } from "../domain/game/Difficulty";
import type { EconomyMetrics } from "../domain/game/EconomyTelemetry";
import type { RunCheckpoint } from "../domain/game/FloorTelemetry";
import type { RunUsage } from "../domain/game/RunUsage";
import { SPELL_DEFINITIONS } from "../domain/game/Spells";
import { ITEM_DEFINITIONS } from "../domain/items/Item";
import { DAMAGE_LABELS, HEALING_LABELS } from "./FloorProgression";
import type { StatisticsSummary } from "./StatisticsData";

const words = (key: string) =>
	key.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("-", " ");
const names: Record<string, { name: string }> = {
	...ITEM_DEFINITIONS,
	...SPELL_DEFINITIONS,
};
const label = (key: string) => names[key]?.name ?? words(key);
const location = (floor: number | null | undefined) =>
	floor === undefined ? "Unknown" : floor === null ? "Town" : `Floor ${floor}`;
function Facts({ values }: { values: Record<string, string | number> }) {
	return (
		<dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm lg:grid-cols-3">
			{Object.entries(values).map(([key, value]) => (
				<div key={key} className="min-w-0">
					<dt className="text-muted-foreground">{key}</dt>
					<dd className="break-words">{value}</dd>
				</div>
			))}
		</dl>
	);
}
function Counts({
	title,
	values,
	labels,
}: {
	title: string;
	values: Record<string, number | undefined> | null | undefined;
	labels?: Record<string, string>;
}) {
	const entries = Object.entries(values ?? {}).filter(
		([, n]) => n !== undefined && n !== 0,
	);
	return (
		<section className="min-w-0">
			<h5 className="mb-1 font-semibold">{title}</h5>
			{!values ? (
				<p>Unknown — not recorded.</p>
			) : entries.length === 0 ? (
				<p>0 recorded.</p>
			) : (
				<dl className="space-y-1">
					{entries.map(([key, n]) => (
						<div key={key} className="flex justify-between gap-4">
							<dt>{labels?.[key] ?? label(key)}</dt>
							<dd>{n?.toLocaleString()}</dd>
						</div>
					))}
				</dl>
			)}
		</section>
	);
}
function Equipment({
	equipment,
}: {
	equipment:
		| RunCheckpoint["equipment"]
		| StatisticsSummary["equipped"]
		| undefined;
}) {
	return equipment ? (
		<Facts
			values={Object.fromEntries(
				Object.entries(equipment).map(([slot, item]) => [
					words(slot),
					item
						? `${label(item.kind)} (${item.enchantment >= 0 ? "+" : ""}${item.enchantment})`
						: "None",
				]),
			)}
		/>
	) : (
		<p>Unknown — equipment not recorded.</p>
	);
}
function Usage({ usage }: { usage: RunUsage | null | undefined }) {
	return (
		<div className="grid gap-4 text-sm lg:grid-cols-3">
			<Counts title="Equipped dungeon turns" values={usage?.equippedTurns} />
			<Counts title="Successful casts" values={usage?.casts} />
			<Counts title="Consumed" values={usage?.consumables} />
		</div>
	);
}
function Checkpoint({ title, point }: { title: string; point: RunCheckpoint }) {
	const resource = (n: number, max: number) =>
		`${n} / ${max} (${max === 0 ? "N/A" : `${Math.round((n / max) * 100)}%`})`;
	return (
		<section className="space-y-3 rounded-md border p-3">
			<h5 className="font-semibold">{title}</h5>
			<Facts
				values={{
					"Game version": point.gameVersion,
					Turn: point.turn,
					Level: point.level,
					Experience: point.experience,
					Strength: point.attributes.strength,
					Dexterity: point.attributes.dexterity,
					Intelligence: point.attributes.intelligence,
					Attack: point.attack,
					Armor: point.armor,
					Evasion: `${point.evadeChance}%`,
					"Magic resistance": `${point.magicResistance}%`,
					HP: resource(point.health, point.maxHealth),
					Mana: resource(point.mana, point.maxMana),
					"Carried gold": point.gold,
				}}
			/>
			<Counts title="Carried supplies" values={point.supplies} />
			<h6 className="font-semibold">Equipped kinds and enchantments</h6>
			<Equipment equipment={point.equipment} />
		</section>
	);
}
function Trades({
	title,
	trades,
}: {
	title: string;
	trades: EconomyMetrics["purchases"] | undefined;
}) {
	const entries = Object.entries(trades ?? {}).flatMap(([store, items]) =>
		Object.entries(items ?? {}).map(([kind, total]) => ({
			store,
			kind,
			...total,
		})),
	);
	return (
		<section>
			<h5 className="mb-1 font-semibold">{title}</h5>
			{trades === undefined ? (
				<p>Unknown — not recorded.</p>
			) : entries.length === 0 ? (
				<p>0 recorded.</p>
			) : (
				<ul className="space-y-1">
					{entries.map(({ store, kind, quantity, gold }) => (
						<li key={`${store}-${kind}`}>
							{words(store)} · {label(kind)}: {quantity} for {gold} gold
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
export default function StatisticsRunDetail({
	summary: s,
}: {
	summary: StatisticsSummary;
}) {
	const [selected, setSelected] = useState("town");
	const locationId = useId();
	const checkpoints = s.telemetry?.checkpoints,
		combat = s.telemetry?.combat,
		economy = s.telemetry?.economy;
	const floors = [
		...new Set([
			...(checkpoints?.floors.map((f) => f.floorNumber) ?? []),
			...Object.keys(combat?.floors ?? {}).map(Number),
			...Object.keys(economy?.floors ?? {}).map(Number),
		]),
	].sort((a, b) => a - b);
	const floor = selected === "town" ? null : Number(selected);
	const record = checkpoints?.floors.find((f) => f.floorNumber === floor);
	const fighting = floor === null ? combat?.town : combat?.floors[floor];
	const trading = floor === null ? economy?.town : economy?.floors[floor];
	const final = checkpoints?.final;
	return (
		<section
			className="mt-4 space-y-6 text-sm"
			aria-label="Readable run detail"
		>
			<section className="space-y-3">
				<h4 className="font-semibold">Run summary</h4>
				<Facts
					values={{
						Seed: s.seed,
						Configuration: `${s.columns} × ${s.rows} × ${s.floorCount} · ${s.standard ? "Standard" : "Custom"}`,
						Difficulty: `${difficultyLabel(s.difficulty)} (${s.difficulty})`,
						"Game version": s.gameVersion,
						Commit: s.commit ?? "Unknown",
						Outcome: s.outcome === "won" ? "Victory" : "Death",
						"Finished (UTC)": s.finishedAt,
						"Final location": location(s.endedFloor),
						Turns: s.turns,
						"Deepest mapped floor": s.deepestFloor,
						"Final level": s.level,
						"Final gold": s.gold,
						"Monsters defeated": s.monstersDefeated,
						Ranked: s.ranked ? "Yes" : "No",
						"Cause of death":
							s.outcome === "won"
								? "N/A"
								: s.causeOfDeath
									? Object.values(s.causeOfDeath).map(words).join(" · ")
									: "Unknown",
					}}
				/>
				<h5 className="font-semibold">Final equipment</h5>
				<Equipment equipment={s.equipped} />
			</section>
			<details className="space-y-3">
				<summary className="cursor-pointer font-semibold">
					Run encounters, pact and theft
				</summary>
				<Facts
					values={{
						"Encounter tracking from turn": s.encountersSinceTurn ?? "Unknown",
						Omens: s.omensMet
							? s.omensMet.map(words).join(", ") || "0 recorded"
							: "Unknown",
						Thieves: s.thievesMet ?? "Unknown",
						Mimics: s.mimicsMet ?? "Unknown",
						Pact: s.pact ? words(s.pact) : "None",
						Arena: s.arena
							? `${words(s.arena.miniboss)} · ${s.arena.fell ? "Defeated" : "Not defeated"}`
							: "N/A — no arena entry",
						"Theft tracking from turn": s.thiefTake?.sinceTurn ?? "Unknown",
						"Gold stolen": s.thiefTake?.stolen ?? "Unknown",
						"Gold recovered": s.thiefTake?.recovered ?? "Unknown",
					}}
				/>
				<p className="text-muted-foreground">
					Tracking that begins after turn zero is partial history.
				</p>
			</details>
			<section className="space-y-3">
				<h4 className="font-semibold">Telemetry coverage for this run</h4>
				<Facts
					values={{
						Checkpoints: checkpoints ? "Recorded" : "Unknown",
						Combat: combat ? "Recorded" : "Unknown",
						"Ownership and economy": economy ? "Recorded" : "Unknown",
						Usage: s.usage ? "Recorded" : "Unknown",
					}}
				/>
				<p className="text-muted-foreground">
					Missing groups are unknown. Empty tracked counters mean zero; absent
					exits are N/A. This is a checkpoint summary, not a replay.
					First-entry/latest-exit differences are not total floor time, damage
					or consumption.
				</p>
			</section>
			<section className="space-y-3">
				<h4 className="font-semibold">Whole-run usage</h4>
				<Usage usage={s.usage} />
			</section>
			<section className="space-y-3">
				<h4 className="font-semibold">Starting ownership and knowledge</h4>
				<p>Initial gold: {economy?.initialGold ?? "Unknown"}</p>
				<div className="grid gap-4 lg:grid-cols-2">
					<Counts title="Starting items" values={economy?.initialItems} />
					<Counts
						title="Initially known spells"
						values={economy?.initialSpells}
					/>
				</div>
			</section>
			<section className="space-y-3">
				<h4 className="font-semibold">Reached floors and local activity</h4>
				<p>
					{checkpoints
						? `Observed entries: ${checkpoints.floors.length ? checkpoints.floors.map((f) => `Floor ${f.floorNumber} (${f.visits} visits)`).join(", ") : "0"}.`
						: "Reached floors: Unknown — checkpoints not recorded."}
				</p>
				<div className="flex items-center gap-3">
					<label htmlFor={locationId}>Run location</label>
					<select
						id={locationId}
						className="h-9 rounded-md border bg-background px-2 text-foreground"
						value={selected}
						onChange={(e) => setSelected(e.target.value)}
					>
						<option value="town">Town</option>
						{floors.map((n) => (
							<option key={n} value={n}>
								Floor {n}
							</option>
						))}
					</select>
				</div>
				<p className="text-muted-foreground">
					Counters accumulate all visits at {location(floor)}. Town activity
					stays separate. Missing categories within a recorded group are zero.
					Acquisitions exclude starting items; purchases are a subset, not extra
					acquisitions. Trade receipts break down gold flows; do not add them
					again. Theft recovery is recovered gold.
				</p>
				{floor !== null && (
					<div className="space-y-3">
						{record ? (
							<>
								<p>Visits: {record.visits}</p>
								<Checkpoint title="First entry" point={record.firstEntry} />
								{record.lastExit ? (
									<>
										<p>
											Latest exit: {words(record.lastExit.reason)} to{" "}
											{location(record.lastExit.toFloor)}
										</p>
										<Checkpoint
											title="Latest exit"
											point={record.lastExit.snapshot}
										/>
									</>
								) : (
									<p>Latest exit: N/A — no exit recorded.</p>
								)}
							</>
						) : (
							<p>
								First entry / latest exit:{" "}
								{checkpoints
									? "N/A — no observed entry."
									: "Unknown — checkpoints not recorded."}
							</p>
						)}
					</div>
				)}
				<div className="grid gap-4 lg:grid-cols-2">
					<Counts
						title="Damage received"
						values={combat ? (fighting?.damage ?? {}) : null}
						labels={DAMAGE_LABELS}
					/>
					<Counts
						title="Healing received"
						values={combat ? (fighting?.healing ?? {}) : null}
						labels={HEALING_LABELS}
					/>
				</div>
				<h5 className="font-semibold">Local usage</h5>
				<Usage
					usage={
						combat
							? (fighting?.usage ?? {
									casts: {},
									consumables: {},
									equippedTurns: {},
								})
							: null
					}
				/>
				<div className="grid gap-4 lg:grid-cols-2">
					<Counts
						title="Acquired items"
						values={economy ? (trading?.acquired ?? {}) : null}
					/>
					<Counts
						title="Learned spells"
						values={economy ? (trading?.learned ?? {}) : null}
					/>
					<Counts
						title="Gold received"
						values={economy ? (trading?.goldIn ?? {}) : null}
					/>
					<Counts
						title="Gold spent or lost"
						values={economy ? (trading?.goldOut ?? {}) : null}
					/>
					<Trades
						title="Purchases"
						trades={economy ? (trading?.purchases ?? {}) : undefined}
					/>
					<Trades
						title="Sales"
						trades={economy ? (trading?.sales ?? {}) : undefined}
					/>
				</div>
			</section>
			<section className="space-y-3">
				<h4 className="font-semibold">Final / death checkpoint</h4>
				{final ? (
					<>
						<p>
							{location(final.floorNumber)} ·{" "}
							{final.outcome === "won" ? "Victory" : "Death"} · separate
							terminal observation, not an exit.
						</p>
						<Checkpoint title="Terminal snapshot" point={final.snapshot} />
					</>
				) : (
					<p>
						{checkpoints
							? "N/A — no terminal checkpoint recorded."
							: "Unknown — checkpoints not recorded."}
					</p>
				)}
			</section>
		</section>
	);
}
