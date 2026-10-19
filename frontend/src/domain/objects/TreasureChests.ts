import { hashStringToUint32 } from "../dungeon/DungeonRun";
import { createSeededRandom } from "../dungeon/Seed";
import { appendActivityEvents } from "../game/ActivityHistory";
import type { GameState } from "../game/GameState";
import type { FloorItem } from "../items/FloorItems";
import { selectLootKind } from "../items/Loot";
import type { DungeonObject } from "./DungeonObject";
export const chestReward = (
	seed: number,
	chest: DungeonObject,
	includeDiseaseRemedy = false,
): FloorItem => {
	const random = createSeededRandom(
		hashStringToUint32(
			`${seed}:${chest.floorNumber}:object:${chest.id}:reward`,
		),
	);
	const kind =
		selectLootKind(
			chest.floorNumber,
			"found",
			random,
			{},
			includeDiseaseRemedy,
		) ?? "healing-potion";
	return {
		item: { id: `${chest.id}:reward`, kind },
		floorNumber: chest.floorNumber,
		coordinate: { ...chest.coordinate },
	};
};
export const openChest = (
	state: GameState,
	chest: DungeonObject,
): GameState | { error: string } => {
	if (chest.activated) return { error: "This chest has already been opened." };
	const reward = chestReward(state.run.seed, chest, state.dungeonRemedies);
	return {
		...state,
		objects: state.objects.map((object) =>
			object.id === chest.id ? { ...object, activated: true } : object,
		),
		floorItems: [...state.floorItems, reward],
		activityHistory: appendActivityEvents(state.activityHistory, [
			{ type: "chest-opened", item: reward.item.kind, turn: state.turn },
		]),
	};
};
