import { hashStringToUint32 } from "../dungeon/DungeonRun";
import { createSeededRandom } from "../dungeon/Seed";
import { MONSTER_DEFINITIONS, type Monster } from "../monsters/Monster";
import { selectEliteReward } from "./EliteRewards";
import type { FloorItem } from "./FloorItems";
import { selectLootKind } from "./Loot";

export const createMonsterDrop = (
	seed: number,
	monster: Monster,
	suppliedRandom?: () => number,
	includeDiseaseRemedy = false,
): FloorItem | undefined => {
	const random =
		suppliedRandom ??
		createSeededRandom(
			hashStringToUint32(
				`${seed}:${monster.floorNumber}:monster-drops:${monster.id}`,
			),
		);
	const definition = MONSTER_DEFINITIONS[monster.kind];
	if (random() >= definition.dropChance) return undefined;
	const kind =
		monster.kind === "iron-champion"
			? selectEliteReward(seed, monster)
			: selectLootKind(
					monster.floorNumber,
					"drop",
					random,
					definition.lootPreferences,
					includeDiseaseRemedy,
				);
	if (!kind) return undefined;
	return {
		item: { id: `monster:${monster.id}:loot`, kind },
		floorNumber: monster.floorNumber,
		coordinate: { ...monster.coordinate },
	};
};
