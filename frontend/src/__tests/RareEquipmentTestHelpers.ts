import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { createGameState } from "../domain/game/GameState";
import type { RareEquipmentKind } from "../domain/items/Item";
import { selectRunRareEquipment } from "../domain/items/RareEquipment";
import { withFlameOnFloor } from "./SaveTestHelpers";
import { COMPACT_TEST_CONFIGURATION } from "./TestRunConfiguration";
export const rareEquipmentSeed = (
	kind: RareEquipmentKind,
	source: "town" | "dungeon",
) => {
	for (let seed = 0; seed < 1000; seed++) {
		const selected = selectRunRareEquipment(seed, 5);
		if (selected?.kind === kind && selected.source === source) return seed;
	}
	throw new Error("Rare equipment seed missing");
};
export const rareEquipmentAdventure = (
	kind: RareEquipmentKind,
	source: "town" | "dungeon",
) =>
	withFlameOnFloor(
		createGameState(
			connectDungeonFloors(
				generateDungeonRun(
					rareEquipmentSeed(kind, source),
					5,
					COMPACT_TEST_CONFIGURATION,
				),
			),
		),
	);
