import { isThiefId } from "../monsters/TreasureThief";
import { isMimicChest } from "../objects/MimicChests";
import { sameCoordinate, savedLevel, unique } from "./SaveConsistencyHelpers";
import type { SaveDocument } from "./SaveDocument";

export const hasConsistentHistory = (document: SaveDocument): boolean => {
	const { state } = document;
	const { run, quest } = state;
	if (
		state.usage &&
		(Object.values(state.usage.casts).reduce((sum, count) => sum + count, 0) >
			state.turn ||
			Object.values(state.usage.equippedTurns).some(
				(count) => count > state.turn,
			))
	)
		return false;
	if (
		state.disabledFeatures?.length &&
		(!state.developerRun ||
			state.ranked ||
			state.rankingVersion ||
			!unique(state.disabledFeatures))
	)
		return false;
	const facts = state.encounters;
	if (
		facts &&
		(facts.sinceTurn > state.turn ||
			(facts.theft &&
				(facts.theft.sinceTurn > state.turn ||
					facts.theft.sinceTurn < facts.sinceTurn ||
					facts.theft.nextId > state.activityHistory.nextId ||
					(facts.theft.sinceTurn === 0 &&
						facts.theft.recovered > facts.theft.stolen))) ||
			!unique(facts.omens) ||
			!unique(facts.thieves) ||
			!unique(facts.mimicFloors) ||
			facts.omens.some(
				(kind) =>
					!state.omens.some(
						(omen) =>
							omen.kind === kind &&
							document.explored.some(
								(floor) => floor.floorNumber === omen.floorNumber,
							),
					),
			) ||
			facts.thieves.some(
				(id) =>
					!/^\d+:\d+$/.test(id) ||
					!isThiefId(id) ||
					Number(id.split(":")[0]) < 1 ||
					Number(id.split(":")[0]) > run.floors.length,
			) ||
			facts.mimicFloors.some(
				(floor) =>
					!state.objects.some(
						(object) =>
							object.floorNumber === floor &&
							object.activated &&
							isMimicChest(run.seed, object, state.disabledFeatures),
					),
			) ||
			(facts.arenaEntered &&
				!state.arenas.some((arena) =>
					document.explored.some(
						(floor) => floor.floorNumber === arena.floorNumber,
					),
				)))
	)
		return false;
	const level = savedLevel(document);
	const entries = state.activityHistory.entries;
	if (
		!entries.every(
			(entry, i) =>
				entry.id < state.activityHistory.nextId &&
				(!i || entry.id > entries[i - 1].id) &&
				entry.event.turn <= state.turn &&
				(entry.event.type !== "town-portal-returned" ||
					entry.event.toFloor <= run.floors.length) &&
				(entry.event.type !== "exit-scroll-used" ||
					entry.event.fromFloor <= run.floors.length) &&
				(!i || entry.event.turn >= entries[i - 1].event.turn),
		)
	)
		return false;
	if (
		quest.victory &&
		(!quest.cureRecovered ||
			run.activeFloor !== 1 ||
			!sameCoordinate(run.playerCoordinate, quest.entrance) ||
			quest.victory.seed !== run.seed ||
			quest.victory.floors !== run.floors.length ||
			quest.victory.turns !== state.turn ||
			quest.victory.health !== state.player.health ||
			quest.victory.experience !== state.progression.experience ||
			quest.victory.level !== level ||
			quest.victory.monstersDefeated !== state.monstersDefeated)
	)
		return false;
	return true;
};
