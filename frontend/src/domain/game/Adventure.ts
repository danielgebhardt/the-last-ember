import { selectPlayerStart } from "../dungeon/DungeonLocations";
import type { DungeonRun } from "../dungeon/DungeonRun";
import type { Coordinate } from "../dungeon/DungeonTypes";

export type VictorySummary = Readonly<{
	seed: number;
	floors: number;
	turns: number;
	monstersDefeated: number;
	gold?: number;
	health: number;
	level: number;
	experience: number;
}>;
export type QuestState = Readonly<{
	goalFloor: number;
	entrance: Coordinate;
	cureRecovered: boolean;
	victory: VictorySummary | null;
}>;
export const createQuest = (run: DungeonRun): QuestState => ({
	goalFloor: run.floors.length,
	entrance: {
		...(run.activeFloor === 1
			? run.playerCoordinate
			: selectPlayerStart(run.floors[0])),
	},
	cureRecovered: false,
	victory: null,
});

// The Warden carries the flame until it falls; then the flame waits to be claimed.
export const questInstruction = (
	quest: QuestState,
	wardenStanding = true,
): string =>
	quest.victory
		? "The flame is restored. Your town is saved."
		: quest.cureRecovered
			? "Escape the depths. Return to the entrance on floor 1."
			: wardenStanding
				? `Defeat the Ember Warden on floor ${quest.goalFloor}.`
				: `Claim the Warden's Flame on floor ${quest.goalFloor}.`;
