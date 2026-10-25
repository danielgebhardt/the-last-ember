import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../dungeon/DungeonRun";
import type { RunConfiguration } from "../dungeon/RunConfiguration";
import { createGameState, type GameState } from "../game/GameState";
import { isOmenSpawn } from "../game/Omens";
import { generateEscapeEncounters } from "../monsters/EscapeEncounters";
import {
	MONSTER_DEFINITIONS,
	type MonsterKind,
	monsterAffliction,
} from "../monsters/Monster";
import {
	type DungeonObjectKind,
	OBJECT_DEFINITIONS,
} from "../objects/DungeonObject";
import { goldAmount } from "../objects/Gold";
import { SANCTUARY_CONDITION_FEES } from "../town/Sanctuary";
import { TOWN_POTION_OFFERS, TOWN_SCROLL_OFFERS } from "../town/TownEconomy";
import { TOWN_EQUIPMENT_OFFERS } from "../town/TownEquipmentStock";
import { FORGE_TIER_PRICES } from "../town/TownForge";
import { LIBRARY_PRICE } from "../town/TownLibrary";

// Generated content only: what an adventure places, never what a player would reach,
// kill or survive. Uses the real generators, so the report follows every rule change.
export const corpusAdventure = (
	seed: number,
	configuration: RunConfiguration,
): GameState =>
	createGameState(
		connectDungeonFloors(
			generateDungeonRun(seed, configuration.floorCount, configuration),
		),
		configuration.difficulty ?? 1,
	);

const RARE_KINDS = (
	Object.keys(OBJECT_DEFINITIONS) as DungeonObjectKind[]
).filter((kind) => OBJECT_DEFINITIONS[kind].placement === "rare-discovery");
const ENCOUNTER_KINDS = (
	Object.keys(OBJECT_DEFINITIONS) as DungeonObjectKind[]
).filter(
	(kind) =>
		!["door", "gold", "chest"].includes(kind) && !RARE_KINDS.includes(kind),
);

// One adventure's placements, kept small so hundreds fit in memory.
export type AdventureRecord = Readonly<{
	seed: number;
	floors: number;
	discovery: { kind: DungeonObjectKind; floor: number } | null;
	afflictionSources: readonly { kind: MonsterKind; floor: number }[];
	remedyDrops: number;
	monstersPerFloor: readonly number[];
	monsterKinds: Readonly<Partial<Record<MonsterKind, number>>>;
	sentries: number;
	// Gold on the ground plus gold from killing every placed monster, per floor.
	goldPerFloor: readonly number[];
	encounters: Readonly<Partial<Record<DungeonObjectKind, number>>>;
	// Hunters a return floor would gain if the ember were taken with the floor as placed.
	huntersPerReturnFloor: readonly number[];
}>;

export const recordAdventure = (state: GameState): AdventureRecord => {
	const floors = state.run.floors.length;
	const perFloor = () => Array.from({ length: floors }, () => 0);
	const monstersPerFloor = perFloor();
	const goldPerFloor = perFloor();
	const monsterKinds: Partial<Record<MonsterKind, number>> = {};
	for (const monster of state.monsters) {
		monstersPerFloor[monster.floorNumber - 1]++;
		monsterKinds[monster.kind] = (monsterKinds[monster.kind] ?? 0) + 1;
		goldPerFloor[monster.floorNumber - 1] += goldAmount(
			state.run.seed,
			monster.floorNumber,
			monster.id,
		);
	}
	const encounters: Partial<Record<DungeonObjectKind, number>> = {};
	let discovery: AdventureRecord["discovery"] = null;
	for (const object of state.objects) {
		if (object.kind === "gold")
			goldPerFloor[object.floorNumber - 1] += goldAmount(
				state.run.seed,
				object.floorNumber,
				object.id,
			);
		else if (RARE_KINDS.includes(object.kind))
			discovery = { kind: object.kind, floor: object.floorNumber };
		else if (ENCOUNTER_KINDS.includes(object.kind))
			encounters[object.kind] = (encounters[object.kind] ?? 0) + 1;
	}
	// The sparse budget's own sources; omen gatherings are reported with their omen.
	const sources = state.monsters.filter(
		(m) => monsterAffliction(m.kind) !== undefined && !isOmenSpawn(m),
	);
	return {
		seed: state.run.seed,
		floors,
		discovery,
		afflictionSources: sources.map((m) => ({
			kind: m.kind,
			floor: m.floorNumber,
		})),
		remedyDrops: state.monsters.filter((m) => m.remedyDrop).length,
		monstersPerFloor,
		monsterKinds,
		sentries: state.monsters.filter(
			(m) => MONSTER_DEFINITIONS[m.kind].alarmRadius !== undefined,
		).length,
		goldPerFloor,
		encounters,
		huntersPerReturnFloor: Array.from(
			{ length: Math.max(0, state.quest.goalFloor - 1) },
			(_, index) => generateEscapeEncounters(state, index + 1).length,
		),
	};
};

const average = (values: readonly number[]) =>
	values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
const share = (count: number, total: number) => (total ? count / total : 0);
const tally = <K extends string>(keys: readonly K[]) =>
	Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;

// Reference prices to compare with the gold a run places by each floor.
export const TOWN_PRICE_REFERENCE = [
	...Object.entries(TOWN_POTION_OFFERS).map(([kind, o]) => ({
		name: kind,
		price: o.price,
	})),
	...Object.entries(TOWN_SCROLL_OFFERS).map(([kind, o]) => ({
		name: kind,
		price: o.price,
	})),
	...Object.values(TOWN_EQUIPMENT_OFFERS).map((o) => ({
		// The store sells some kinds both plain and enchanted.
		name: o.item.enchantment
			? `${o.item.kind} +${o.item.enchantment}`
			: o.item.kind,
		price: o.price,
	})),
	...Object.entries(SANCTUARY_CONDITION_FEES).map(([kind, price]) => ({
		name: `sanctuary ${kind}`,
		price,
	})),
	...FORGE_TIER_PRICES.map((price, tier) => ({
		name: `forge tier ${tier + 1} (+1)`,
		price,
	})),
	{ name: "library book", price: LIBRARY_PRICE },
].sort((a, b) => a.price - b.price);

export type CorpusSummary = ReturnType<typeof summarizeCorpus>;
export const summarizeCorpus = (records: readonly AdventureRecord[]) => {
	const total = records.length;
	const floors = Math.max(0, ...records.map((r) => r.floors));
	const discoveries = tally(RARE_KINDS);
	const discoveryFloors: Partial<Record<DungeonObjectKind, number[]>> = {};
	for (const record of records)
		if (record.discovery) {
			discoveries[record.discovery.kind]++;
			discoveryFloors[record.discovery.kind] = [
				...(discoveryFloors[record.discovery.kind] ?? []),
				record.discovery.floor,
			];
		}
	const sourceKinds = new Map<MonsterKind, number[]>();
	for (const record of records)
		for (const { kind, floor } of record.afflictionSources)
			sourceKinds.set(kind, [...(sourceKinds.get(kind) ?? []), floor]);
	const byFloor = (pick: (r: AdventureRecord) => readonly number[]) =>
		Array.from({ length: floors }, (_, i) =>
			average(records.map((r) => pick(r)[i] ?? 0)),
		);
	const goldPerFloor = byFloor((r) => r.goldPerFloor);
	const cumulativeGold = goldPerFloor.map((_, floor) =>
		goldPerFloor.slice(0, floor + 1).reduce((a, b) => a + b, 0),
	);
	const kindTotals = new Map<MonsterKind, number>();
	for (const record of records)
		for (const [kind, count] of Object.entries(record.monsterKinds))
			kindTotals.set(
				kind as MonsterKind,
				(kindTotals.get(kind as MonsterKind) ?? 0) + (count ?? 0),
			);
	const allMonsters = [...kindTotals.values()].reduce((a, b) => a + b, 0);
	return {
		adventures: total,
		discoveries: {
			any: share(records.filter((r) => r.discovery !== null).length, total),
			byKind: RARE_KINDS.map((kind) => {
				const placed = discoveryFloors[kind] ?? [];
				return {
					kind,
					share: share(discoveries[kind], total),
					minFloor: placed.length ? Math.min(...placed) : null,
					maxFloor: placed.length ? Math.max(...placed) : null,
				};
			}),
		},
		afflictionSources: {
			perAdventure: average(records.map((r) => r.afflictionSources.length)),
			remedyDropsPerAdventure: average(records.map((r) => r.remedyDrops)),
			byKind: [...sourceKinds.entries()]
				.map(([kind, placed]) => ({
					kind,
					perAdventure: placed.length / Math.max(1, total),
					minFloor: Math.min(...placed),
					maxFloor: Math.max(...placed),
				}))
				.sort((a, b) => b.perAdventure - a.perAdventure),
		},
		monsters: {
			perFloor: byFloor((r) => r.monstersPerFloor),
			sentriesPerAdventure: average(records.map((r) => r.sentries)),
			kindMix: [...kindTotals.entries()]
				.map(([kind, count]) => ({ kind, share: share(count, allMonsters) }))
				.sort((a, b) => b.share - a.share),
			huntersPerReturnFloor: byFloor((r) => r.huntersPerReturnFloor),
		},
		economy: {
			goldPerFloor,
			cumulativeGold,
			prices: TOWN_PRICE_REFERENCE,
		},
		encounters: ENCOUNTER_KINDS.map((kind) => ({
			kind,
			perAdventure: average(records.map((r) => r.encounters[kind] ?? 0)),
		})),
	};
};

// Seeds run in small batches so a browser can show progress and stay responsive.
export const seedCorpusReport = async (
	seeds: readonly number[],
	configuration: RunConfiguration,
	onProgress?: (done: number) => void,
	batch = 10,
) => {
	const records: AdventureRecord[] = [];
	for (let i = 0; i < seeds.length; i += batch) {
		for (const seed of seeds.slice(i, i + batch))
			records.push(recordAdventure(corpusAdventure(seed, configuration)));
		onProgress?.(records.length);
		await new Promise((resolve) => setTimeout(resolve));
	}
	return { configuration, records, summary: summarizeCorpus(records) };
};

// One row per adventure for spreadsheets.
export const corpusCsv = (records: readonly AdventureRecord[]): string => {
	const header = [
		"seed",
		"discovery",
		"discovery_floor",
		"affliction_sources",
		"sentries",
		"monsters",
		"gold",
		"hunters",
	];
	const rows = records.map((r) =>
		[
			r.seed,
			r.discovery?.kind ?? "",
			r.discovery?.floor ?? "",
			r.afflictionSources.length,
			r.sentries,
			r.monstersPerFloor.reduce((a, b) => a + b, 0),
			r.goldPerFloor.reduce((a, b) => a + b, 0),
			r.huntersPerReturnFloor.reduce((a, b) => a + b, 0),
		].join(","),
	);
	return [header.join(","), ...rows].join("\n");
};
