import { minibossId } from "../arena/Arena";
import { isStandardDungeon } from "../dungeon/RunConfiguration";
import { defeatRecap } from "../game/DefeatRecap";
import { GAME_VERSION } from "../game/GameVersion";
import { levelForExperience } from "../game/Progression";
import type { SaveDocument } from "./SaveDocument";

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
		standard: isStandardDungeon(configuration),
		ranked: state.ranked === true,
		difficulty: configuration.difficulty,
		gameVersion: GAME_VERSION,
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
