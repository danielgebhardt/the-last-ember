import { hashStringToUint32 } from "../dungeon/DungeonRun";
import { createSeededRandom } from "../dungeon/Seed";
import { AFFLICTION_DEFINITIONS } from "../game/AfflictionDefinitions";
import {
	MONSTER_DEFINITIONS,
	type Monster,
	monsterAffliction,
} from "../monsters/Monster";
import { selectEliteReward } from "./EliteRewards";
import type { FloorItem } from "./FloorItems";
import { selectLootKind } from "./Loot";

export const createMonsterDrop = (
	seed: number,
	monster: Monster,
	suppliedRandom?: () => number,
): FloorItem | undefined => {
	const random =
		suppliedRandom ??
		createSeededRandom(
			hashStringToUint32(
				`${seed}:${monster.floorNumber}:monster-drops:${monster.id}`,
			),
		);
	const definition = MONSTER_DEFINITIONS[monster.kind];
	// Initial availability protection; the item ID keeps it a one-use drop.
	const affliction = monsterAffliction(monster.kind);
	if (monster.remedyDrop && affliction)
		return {
			item: {
				id: `monster:${monster.id}:loot`,
				kind: AFFLICTION_DEFINITIONS[affliction].cure,
			},
			floorNumber: monster.floorNumber,
			coordinate: { ...monster.coordinate },
		};
	if (random() >= definition.dropChance) return undefined;
	const kind =
		monster.kind === "iron-champion"
			? selectEliteReward(seed, monster)
			: selectLootKind(
					monster.floorNumber,
					"drop",
					random,
					definition.lootPreferences,
				);
	if (!kind) return undefined;
	return {
		item: { id: `monster:${monster.id}:loot`, kind },
		floorNumber: monster.floorNumber,
		coordinate: { ...monster.coordinate },
	};
};
