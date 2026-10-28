import { aggregateFloors } from "../developer/FloorProgression";
import { aggregateItemUsage } from "../developer/ItemUsage";
import {
	type AnalyticsResult,
	aggregateOverview,
	analyticsDefaults,
	observationFromDocument,
} from "../developer/StatisticsAnalytics";
import type { StatisticsEntry } from "../developer/StatisticsData";
import type { RunCheckpoint } from "../domain/game/FloorTelemetry";
import { GAME_VERSION } from "../domain/game/GameVersion";

// Local summaries only: never submitted or written to a live project.
export const checkpoint = (turn = 0): RunCheckpoint => ({
	gameVersion: GAME_VERSION,
	turn,
	level: 1,
	experience: 0,
	attributes: { strength: 10, dexterity: 10, intelligence: 10 },
	attack: 5,
	armor: 0,
	evadeChance: 0,
	magicResistance: 0,
	health: 10,
	maxHealth: 10,
	mana: 5,
	maxMana: 5,
	gold: 0,
	supplies: {},
	equipment: {
		mainHand: null,
		offHand: null,
		chest: null,
		head: null,
		leftRing: null,
		rightRing: null,
	},
});
export const analyticsRun = (
	id: string,
	floors: number[] | null,
	overrides: Partial<StatisticsEntry["summary"]> = {},
): StatisticsEntry => ({
	id,
	summary: {
		seed: Number(id.replaceAll(/\D/g, "")) || 123,
		rows: 40,
		columns: 40,
		floorCount: 20,
		standard: true,
		ranked: true,
		difficulty: 1,
		gameVersion: GAME_VERSION,
		commit: null,
		outcome: "died",
		turns: 100,
		deepestFloor: 20,
		endedFloor: floors?.at(-1) ?? null,
		causeOfDeath: null,
		level: 1,
		gold: 0,
		monstersDefeated: 0,
		encountersSinceTurn: 0,
		omensMet: [],
		thievesMet: 0,
		thiefTake: { sinceTurn: 0, stolen: 0, recovered: 0 },
		mimicsMet: 0,
		arena: null,
		pact: null,
		equipped: {},
		finishedAt: "2026-10-27T12:00:00.000Z",
		usage: { casts: {}, consumables: {}, equippedTurns: {} },
		telemetry:
			floors === null
				? null
				: {
						schemaVersion: 1,
						checkpoints: {
							activeFloor: null,
							floors: floors.map((floorNumber) => ({
								floorNumber,
								visits: floorNumber === 1 ? 3 : 1,
								firstEntry: checkpoint(floorNumber),
								...(floorNumber === 1
									? {
											lastExit: {
												toFloor: null,
												reason: "town-scroll" as const,
												snapshot: checkpoint(90),
											},
										}
									: {}),
							})),
						},
						combat: {
							floors: {},
							town: {
								damage: {},
								damageByMonster: {},
								damageByCondition: {},
								healing: {},
								defeated: {},
								heroicDefeated: 0,
								summonedDefeated: 0,
								pressure: {},
								omens: {},
								pacts: {},
								usage: { casts: {}, consumables: {}, equippedTurns: {} },
							},
						},
						economy: {
							initialGold: 0,
							initialItems: {},
							initialSpells: {},
							floors: {},
							town: {
								acquired: {},
								learned: {},
								goldIn: {},
								goldOut: {},
								purchases: {},
								sales: {},
							},
						},
					},
		...overrides,
	},
});
export const analyticsFixtures = () => [
	analyticsRun(
		"run1",
		Array.from({ length: 20 }, (_, i) => i + 1),
		{ outcome: "won", turns: 1000, endedFloor: null },
	),
	analyticsRun("run2", [1, 2], { turns: 20 }),
	analyticsRun("run3", [1, 2, 10, 18], { turns: 900 }),
	analyticsRun("run4", [1, 3], { endedFloor: null, turns: 200 }),
	analyticsRun("run5", null, {
		gameVersion: "older",
		usage: null,
		encountersSinceTurn: null,
		omensMet: null,
		endedFloor: undefined,
	}),
	analyticsRun("run6", [1, 5], {
		standard: false,
		rows: 20,
		columns: 20,
		floorCount: 5,
		difficulty: 1.25,
	}),
];

// A complete aggregate response for UI/browser tests, without raw telemetry.
export const analyticsResult = (
	entries = analyticsFixtures(),
	filters = analyticsDefaults(),
): AnalyticsResult => {
	const observations = entries.map((r) =>
		observationFromDocument(r.id, r.summary),
	);
	const overview = aggregateOverview(entries, observations);
	return {
		complete: true,
		filters,
		scanned: entries.length,
		selected: entries.length,
		loadedAt: "2026-10-28T01:00:00.000Z",
		versions: [...new Set(entries.map((r) => r.summary.gameVersion))],
		rows: entries.map(
			({
				id,
				summary: { usage: _u, telemetry: _t, equipped: _e, ...summary },
			}) => ({ id, summary }),
		),
		overview,
		floors: aggregateFloors(entries, observations, overview.reach),
		items: aggregateItemUsage(entries, observations),
	};
};

export const progressionFixtures = () => {
	const rows = analyticsFixtures();
	rows.forEach((row, index) => {
		const telemetry = row.summary.telemetry;
		if (!telemetry?.checkpoints || !telemetry.combat) return;
		for (const floor of telemetry.checkpoints.floors) {
			const maxHealth = 20 + index * 15 + floor.floorNumber * 2,
				maxMana = index === 1 ? 0 : 10 + floor.floorNumber;
			floor.firstEntry = {
				...floor.firstEntry,
				level: floor.floorNumber + index,
				experience: floor.floorNumber ** 2 * 20,
				health: Math.floor(maxHealth * (0.4 + index * 0.08)),
				maxHealth,
				mana: Math.floor(maxMana * 0.5),
				maxMana,
				gold: floor.floorNumber * 20 + index,
				supplies: {
					"healing-potion": floor.floorNumber % 4,
					"exit-scroll": floor.floorNumber % 3,
				},
				attributes: {
					strength: 10 + floor.floorNumber,
					dexterity: 10 + index,
					intelligence: 10 + floor.floorNumber,
				},
				armor: floor.floorNumber,
				evadeChance: 20,
				magicResistance: 15,
			};
			telemetry.combat.floors[floor.floorNumber] = {
				...telemetry.combat.town,
				damage: {
					melee: floor.floorNumber * (index + 1) * 2,
					trap: floor.floorNumber % 3,
				},
				healing: { potion: floor.floorNumber * (index + 1) },
			};
		}
		telemetry.combat.town.healing = { sanctuary: 999 };
	});
	return rows;
};

export const itemUsageFixtures = () => {
	const rows = progressionFixtures();
	for (const index of [0, 1]) {
		const access = rows[index].summary.telemetry?.economy;
		if (!access) throw Error("Expected access fixture");
		access.initialItems = { "short-sword": 1, "healing-potion": 2 };
		access.initialSpells = { heal: 1 };
	}
	rows[0].summary.usage = {
		equippedTurns: { "short-sword": 10 },
		casts: { heal: 2 },
		consumables: { "healing-potion": 1 },
	};
	rows[1].summary.usage = null;
	const usageOnly = rows[2].summary.telemetry;
	if (!usageOnly) throw Error("Expected telemetry fixture");
	usageOnly.economy = null;
	rows[2].summary.usage = {
		equippedTurns: { "short-sword": 5 },
		casts: { heal: 3 },
		consumables: { "healing-potion": 2 },
	};
	const acquired = rows[3].summary.telemetry?.economy;
	if (!acquired) throw Error("Expected acquisition fixture");
	acquired.town.acquired = {
		"short-sword": 2,
		"spellguard-shield": 1,
		"healing-potion": 3,
	};
	acquired.town.learned = { heal: 1 };
	acquired.floors[3] = {
		acquired: { "short-sword": 1, "enchantment-scroll": 1 },
		learned: { fireball: 1 },
		goldIn: {},
		goldOut: {},
		purchases: {},
		sales: {},
	};
	return rows;
};
