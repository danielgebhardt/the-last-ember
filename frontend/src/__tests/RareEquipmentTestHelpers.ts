import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { createGameState, type GameState } from "../domain/game/GameState";
import type { RareEquipmentKind } from "../domain/items/Item";
import {
	allocateRunRareEquipment,
	selectRunRareEquipment,
} from "../domain/items/RareEquipment";
import { isWarden } from "../domain/monsters/EmberWarden";
import { isThief } from "../domain/monsters/TreasureThief";
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
// A fresh adventure given the original single allocation, as older saves hold it. It
// skips the Warden, thieves and per-third finds, which came later.
const legacyRareAllocation = (fresh: GameState) => {
	const floorItems = fresh.floorItems.filter(
		(entry) => !entry.item.id.startsWith("rare-find:"),
	);
	const legacy = allocateRunRareEquipment(
		fresh.run,
		fresh.monsters.filter((monster) => !isWarden(monster) && !isThief(monster)),
		floorItems,
		fresh.objects,
	);
	return {
		...fresh,
		rareEquipment: legacy.allocation,
		floorItems: [...floorItems, ...legacy.items],
	};
};
// An adventure holding the original single allocation, as older saves do.
export const rareEquipmentAdventure = (
	kind: RareEquipmentKind,
	source: "town" | "dungeon",
) =>
	withFlameOnFloor(
		legacyRareAllocation(
			createGameState(
				connectDungeonFloors(
					generateDungeonRun(
						rareEquipmentSeed(kind, source),
						5,
						COMPACT_TEST_CONFIGURATION,
					),
				),
			),
		),
	);
