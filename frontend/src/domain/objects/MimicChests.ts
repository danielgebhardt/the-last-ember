import { hashStringToUint32 } from "../dungeon/DungeonRun";
import { createSeededRandom } from "../dungeon/Seed";
import { appendActivityEvents } from "../game/ActivityHistory";
import type { GameState } from "../game/GameState";
import type { FloorItem } from "../items/FloorItems";
import { MONSTER_DEFINITIONS, type Monster } from "../monsters/Monster";
import { maximumMonsterHealth } from "../monsters/MonsterStats";
import { sarcophagusSpawn } from "./AncientSarcophagi";
import type { DungeonObject } from "./DungeonObject";
import { chestReward } from "./TreasureChests";

// Reserved identity per floor; a floor holds at most one chest, so one mimic.
export const MIMIC_SPAWN_ID = 1000007;
export const MIMIC_CHANCE = 0.125;
// The tell in a mimic chest's nearby notice, for attentive players.
export const MIMIC_TELL = "The lock looks newer than the wood.";

// Fixed by seed and chest, so reloading or revisiting never changes which chest bites.
// A Hoard omen's chest is always a mimic.
export const isMimicChest = (
	seed: number,
	chest: Pick<DungeonObject, "id" | "kind" | "floorNumber">,
): boolean =>
	chest.kind === "chest" &&
	chest.floorNumber >= MONSTER_DEFINITIONS["treasure-mimic"].minFloor &&
	(chest.id.endsWith(":mimic") ||
		createSeededRandom(hashStringToUint32(`${seed}:${chest.id}:mimic`))() <
			MIMIC_CHANCE);

export const isMimic = (monster: Pick<Monster, "kind">) =>
	monster.kind === "treasure-mimic";
export const mimicId = (floorNumber: number) =>
	`${floorNumber}:${MIMIC_SPAWN_ID}`;
export const mimicChestFor = (
	objects: readonly DungeonObject[],
	monster: Pick<Monster, "floorNumber">,
) =>
	objects.find(
		(object) =>
			object.kind === "chest" && object.floorNumber === monster.floorNumber,
	);

// Opening a mimic spends the chest and wakes it beside you instead of dropping loot.
// With no free tile to lunge into, it stays a chest and gives its loot as usual.
export const revealMimic = (
	state: GameState,
	chest: DungeonObject,
): GameState | undefined => {
	const coordinate = sarcophagusSpawn(state, chest);
	if (!coordinate) return undefined;
	const mimic: Monster = {
		id: mimicId(chest.floorNumber),
		kind: "treasure-mimic",
		floorNumber: chest.floorNumber,
		coordinate,
		health: maximumMonsterHealth(
			"treasure-mimic",
			state.difficulty,
			chest.floorNumber,
		),
		intent: { type: "idle" },
		lastDamagedTurn: null,
	};
	return {
		...state,
		objects: state.objects.map((object) =>
			object.id === chest.id ? { ...object, activated: true } : object,
		),
		monsters: [...state.monsters, mimic],
		activityHistory: appendActivityEvents(state.activityHistory, [
			{ type: "mimic-revealed", turn: state.turn },
		]),
	};
};

// A slain mimic drops the chest's own loot where it falls, on top of its usual drop.
export const mimicChestDrop = (
	state: Pick<GameState, "run" | "objects" | "floorItems">,
	monster: Monster,
): FloorItem | undefined => {
	if (!isMimic(monster)) return undefined;
	const chest = mimicChestFor(state.objects, monster);
	if (!chest) return undefined;
	const reward = chestReward(state.run.seed, chest);
	return state.floorItems.some((entry) => entry.item.id === reward.item.id)
		? undefined
		: { ...reward, coordinate: { ...monster.coordinate } };
};
