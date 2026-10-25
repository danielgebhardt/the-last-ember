import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { createGameState } from "../domain/game/GameState";
import type { RareEquipmentKind } from "../domain/items/Item";
import { rareFindId } from "../domain/items/RareFinds";
import { withFlameOnFloor } from "./SaveTestHelpers";
import { COMPACT_TEST_CONFIGURATION } from "./TestRunConfiguration";

const adventure = (seed: number) =>
	withFlameOnFloor(
		createGameState(
			connectDungeonFloors(
				generateDungeonRun(seed, 5, COMPACT_TEST_CONFIGURATION),
			),
		),
	);
// A five-floor adventure. From "dungeon", its per-third find of this kind lies on a
// floor; from "town", the kind is only the armor store's copy.
export const rareEquipmentAdventure = (
	kind: RareEquipmentKind,
	source: "town" | "dungeon",
) => {
	for (let seed = 0; seed < 2000; seed++) {
		const state = adventure(seed);
		const found = state.floorItems.some(
			(entry) => entry.item.id === rareFindId(kind),
		);
		if (found === (source === "dungeon")) return state;
	}
	throw new Error(`No five-floor adventure with a ${source} ${kind}`);
};
