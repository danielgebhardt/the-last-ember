import { selectWeighted } from "../content/WeightedSelection";
import { type DungeonRun, hashStringToUint32 } from "../dungeon/DungeonRun";
import type { Coordinate } from "../dungeon/DungeonTypes";
import { createSeededRandom } from "../dungeon/Seed";
import type { ActivityEvent } from "../game/ActivityHistory";
import type { Difficulty } from "../game/Difficulty";
import type { GameState } from "../game/GameState";
import type { FloorItem } from "../items/FloorItems";
import { isUniqueEquipmentKind } from "../items/Item";
import { isEnchantableKind } from "../items/ItemValues";
import { lootWeights } from "../items/LootWeights";
import type { DungeonObject } from "../objects/DungeonObject";
import { reachableRoomTiles } from "../objects/RareDiscoveryPlacement";
import { MONSTER_DEFINITIONS, type Monster } from "./Monster";
import { coordinateKey, protectedFloorLocations } from "./MonsterLocations";
import { actorMaximumHealth } from "./MonsterStats";

// Reserved identity on the final floor; ordinary AI schedules parse the suffix.
export const WARDEN_SPAWN_ID = 1000005;
export const WARDEN_REWARD_ENCHANTMENT = 2;
// About 80 health and 12 attack for a 5-floor dungeon, 160 and 26 for 20 floors.
// Provisional: tuned to be winnable with ordinary gear, before difficulty scaling.
export const wardenStats = (depth: number) => ({
	maxHealth: 80 + Math.round(((depth - 5) * 16) / 3),
	attackDamage: 12 + Math.round(((depth - 5) * 14) / 15),
	depth,
});
export const isWarden = (monster: Pick<Monster, "kind">) =>
	monster.kind === "ember-warden";

// The nearest free room tile to the flame's generated tile, so the guardian stands in
// that room. The Warden then carries the flame until it falls.
export const placeEmberWarden = (
	run: DungeonRun,
	monsters: readonly Monster[],
	floorItems: readonly FloorItem[],
	objects: readonly DungeonObject[],
	difficulty: Difficulty,
): Monster | undefined => {
	const depth = run.floors.length;
	// Real adventures have 5–20 floors; tiny test dungeons stay unguarded.
	if (depth < MONSTER_DEFINITIONS["ember-warden"].minFloor) return undefined;
	const ember = floorItems.find((entry) => entry.item.kind === "cure");
	if (!ember || ember.floorNumber !== depth) return undefined;
	const taken = new Set(
		[
			ember.coordinate,
			...protectedFloorLocations(run, depth),
			...monsters
				.filter((m) => m.floorNumber === depth)
				.map((m) => m.coordinate),
			...objects
				.filter((o) => o.floorNumber === depth)
				.map((o) => o.coordinate),
			...floorItems
				.filter((i) => i.floorNumber === depth)
				.map((i) => i.coordinate),
		].map(coordinateKey),
	);
	const coordinate = reachableRoomTiles(
		run,
		depth,
		ember.coordinate,
		objects,
	).find((tile) => !taken.has(coordinateKey(tile)));
	if (!coordinate) return undefined;
	const warden = {
		kind: "ember-warden" as const,
		floorNumber: depth,
		warden: wardenStats(depth),
	};
	return {
		...warden,
		id: `${depth}:${WARDEN_SPAWN_ID}`,
		coordinate,
		health: actorMaximumHealth(warden, difficulty),
		intent: { type: "idle" },
		lastDamagedTurn: null,
	};
};

// Dormant until it first sees you; waking is its whole action for that phase.
export const wakeWarden = (
	state: GameState,
	monster: Monster,
	sees: boolean,
): { monster: Monster; events: ActivityEvent[] } | undefined => {
	if (!monster.warden || monster.warden.awake || !sees) return undefined;
	return {
		monster: { ...monster, warden: { ...monster.warden, awake: true } },
		events: [{ type: "warden-woke", turn: state.turn }],
	};
};
export const wardenDormant = (monster: Monster) =>
	monster.warden !== undefined && !monster.warden.awake;

// The Warden carries the flame: it falls where the Warden dies. Exactly one flame exists,
// so none drops once it is claimed or already lies somewhere.
export const wardenFlameDrop = (
	state: Pick<GameState, "quest" | "floorItems">,
	monster: Monster,
): FloorItem | undefined =>
	isWarden(monster) &&
	!state.quest.cureRecovered &&
	!state.floorItems.some((entry) => entry.item.kind === "cure")
		? {
				item: { id: "quest:cure", kind: "cure" },
				floorNumber: monster.floorNumber,
				coordinate: { ...monster.coordinate },
			}
		: undefined;

// One ordinary weapon or armor piece from the final floor's found loot at +2, fixed by
// seed, dropped where the Warden falls.
export const wardenDrop = (
	seed: number,
	monster: Monster,
	at: Coordinate = monster.coordinate,
): FloorItem | undefined => {
	if (!monster.warden) return undefined;
	const kind = selectWeighted(
		lootWeights(monster.warden.depth, "found").filter(
			({ value }) => isEnchantableKind(value) && !isUniqueEquipmentKind(value),
		),
		createSeededRandom(hashStringToUint32(`${seed}:ember-warden:reward`)),
	);
	return kind
		? {
				item: {
					id: `monster:${monster.id}:loot`,
					kind,
					enchantment: WARDEN_REWARD_ENCHANTMENT,
				},
				floorNumber: monster.floorNumber,
				coordinate: { ...at },
			}
		: undefined;
};
