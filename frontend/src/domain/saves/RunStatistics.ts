import { minibossId } from "../arena/Arena";
import {
	isStandardDungeon,
	isStandardSight,
} from "../dungeon/RunConfiguration";
import { defeatRecap } from "../game/DefeatRecap";
import { GAME_VERSIONS } from "../game/GameVersion";
import { levelForExperience } from "../game/Progression";
import type { SaveDocument } from "./SaveDocument";

// The release an adventure started on: a run finished offline may be submitted
// after a deploy. Adventures older than floor telemetry all started on the first
// release, and an unreleased label never reaches the version filters.
const startedOn = (state: SaveDocument["state"]) => {
	// Floor records are ordered by floor number, not by entry.
	const first = [...(state.floorTelemetry?.floors ?? [])].sort(
		(a, b) => a.firstEntry.turn - b.firstEntry.turn,
	)[0];
	return (
		[state.rankingVersion, first?.firstEntry.gameVersion].find(
			(version) => version && GAME_VERSIONS.includes(version),
		) ?? GAME_VERSIONS[0]
	);
};

export const summarizeRun = (document: SaveDocument, commit: string | null) => {
	const { state, configuration } = document;
	const arena = state.encounters?.arenaEntered ? state.arenas[0] : undefined;
	const death = state.quest.victory
		? null
		: defeatRecap(state.activityHistory, state.turn).at(-1)?.event;
	return {
		seed: state.run.seed,
		rows: configuration.rows,
		columns: configuration.cols,
		floorCount: configuration.floorCount,
		standard: isStandardDungeon(configuration) && isStandardSight(document.fog),
		ranked: state.ranked === true,
		difficulty: configuration.difficulty,
		gameVersion: startedOn(state),
		commit,
		outcome: state.quest.victory ? "won" : "died",
		turns: state.turn,
		deepestFloor: Math.max(
			1,
			...document.explored.map((floor) => floor.floorNumber),
		),
		endedFloor: state.run.activeFloor,
		causeOfDeath: death
			? {
					type: death.type,
					...("monster" in death ? { monster: death.monster } : {}),
					...("condition" in death ? { condition: death.condition } : {}),
					...("spell" in death ? { spell: death.spell } : {}),
				}
			: null,
		level: levelForExperience(state.progression.experience),
		gold: state.gold,
		monstersDefeated: state.monstersDefeated,
		telemetry:
			state.floorTelemetry || state.combatTelemetry || state.economyTelemetry
				? {
						schemaVersion: 1 as const,
						checkpoints: state.floorTelemetry
							? structuredClone(state.floorTelemetry)
							: null,
						combat: state.combatTelemetry
							? structuredClone(state.combatTelemetry)
							: null,
						economy: state.economyTelemetry
							? structuredClone(state.economyTelemetry)
							: null,
					}
				: null,
		// Project only validated counters; never accept a client-provided summary.
		// Null means unknown, whereas empty maps mean measured zero usage.
		usage: state.usage
			? {
					casts: { ...state.usage.casts },
					consumables: { ...state.usage.consumables },
					equippedTurns: { ...state.usage.equippedTurns },
				}
			: null,
		encountersSinceTurn: state.encounters?.sinceTurn ?? null,
		omensMet: state.encounters?.omens ?? null,
		thievesMet: state.encounters ? state.encounters.thieves.length : null,
		thiefTake: state.encounters?.theft
			? {
					sinceTurn: state.encounters.theft.sinceTurn,
					stolen: state.encounters.theft.stolen,
					recovered: state.encounters.theft.recovered,
				}
			: null,
		mimicsMet: state.encounters ? state.encounters.mimicFloors.length : null,
		arena: arena
			? {
					miniboss: arena.miniboss,
					fell: !state.monsters.some(
						(monster) =>
							monster.id === minibossId(arena.floorNumber) &&
							monster.health > 0,
					),
				}
			: null,
		pact: state.progression.pact ?? null,
		equipped: Object.fromEntries(
			Object.entries(state.equipment).map(([slot, item]) => [
				slot,
				item ? { kind: item.kind, enchantment: item.enchantment ?? 0 } : null,
			]),
		),
		finishedAt: document.savedAt,
	};
};
export type RunStatistics = ReturnType<typeof summarizeRun>;

export const MAX_STATISTICS_BYTES = 512 * 1024;
export const MAX_STATISTICS_LIST_ROW_BYTES = 16 * 1024;
export const MAX_STATISTICS_RESPONSE_BYTES = 4 * 1024 * 1024;
export const statisticsBytes = (value: unknown) =>
	new TextEncoder().encode(JSON.stringify(value)).byteLength;
// Keep list/filter reads small; full private telemetry is fetched on Inspect.
export const STATISTICS_LIST_FIELDS = [
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
	"endedFloor",
	"causeOfDeath",
	"level",
	"gold",
	"monstersDefeated",
	"usage",
	"encountersSinceTurn",
	"omensMet",
	"thievesMet",
	"thiefTake",
	"mimicsMet",
	"arena",
	"pact",
	"equipped",
	"finishedAt",
] as const satisfies readonly (keyof RunStatistics)[];
export const statisticsListSummary = (summary: object) =>
	Object.fromEntries(
		STATISTICS_LIST_FIELDS.filter((key) => Object.hasOwn(summary, key)).map(
			(key) => [key, (summary as Record<string, unknown>)[key]],
		),
	);
