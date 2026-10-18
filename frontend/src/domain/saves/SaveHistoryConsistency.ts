import { sameCoordinate, savedLevel } from "./SaveConsistencyHelpers";
import type { SaveDocument } from "./SaveDocument";

export const hasConsistentHistory = (document: SaveDocument): boolean => {
	const { state } = document;
	const { run, quest } = state;
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
