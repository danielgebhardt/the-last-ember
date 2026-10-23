import type { DungeonRun } from "../dungeon/DungeonRun.ts";
import { type Bag, createStartingBag } from "../items/Bag";
import { spawnRunQuestItems } from "../items/CurePlacement";
import { createStartingEquipment, type Equipment } from "../items/Equipment";
import { spawnRunExitScrolls } from "../items/ExitScrollPlacement";
import type { FloorItem } from "../items/FloorItems";
import type { ItemInstance } from "../items/Item";
import { spawnRunItems } from "../items/ItemPlacement";
import {
	createStartingPotionHotbar,
	type PotionHotbar,
} from "../items/PotionHotbar";
import type { RareEquipmentAllocation } from "../items/RareEquipment";
import { placeRunRareFinds } from "../items/RareFinds";
import { spawnRunSpellbooks } from "../items/SpellbookPlacement";
import { placeMerchants } from "../merchant/MerchantPlacement";
import {
	createMerchantStock,
	type MerchantStock,
} from "../merchant/MerchantRules";
import { placeEmberWarden } from "../monsters/EmberWarden";
import type { Monster } from "../monsters/Monster.ts";
import {
	markFirstRemedySources,
	spawnRunMonsters,
} from "../monsters/MonsterPlacement.ts";
import { maximumMonsterHealth } from "../monsters/MonsterStats";
import { placeTreasureThieves } from "../monsters/TreasureThief";
import type { DungeonObject } from "../objects/DungeonObject";
import { spawnRunObjects } from "../objects/ObjectPlacement";
import { addOptionalEliteRooms } from "../objects/OptionalEliteRooms";
import {
	createTownPotionStock,
	createTownScrollStock,
	type TownPotionStock,
	type TownScrollStock,
} from "../town/TownEconomy";
import { createTownEquipmentStock } from "../town/TownEquipmentStock";
import type { TownLocation } from "../town/TownLocation";
import type { TownPortal } from "../town/TownPortal";
import {
	type ActivityHistory,
	createActivityHistory,
} from "./ActivityHistory.ts";
import { createQuest, type QuestState } from "./Adventure";
import type { ActiveAffliction } from "./AfflictionDefinitions";
import { assertDifficulty, type Difficulty } from "./Difficulty";
import type { EscapeState } from "./Escape";
import { maximumMana } from "./Mana";
import { createPlayerStats, type PlayerStats } from "./PlayerStats.ts";
import { createProgression, type Progression } from "./Progression";
import { createSpellHotbar, type SpellHotbar } from "./SpellHotbar";
import { createKnownSpells, type SpellKind } from "./Spells";
import type { TimedEffect } from "./TimedEffects";

export type GameState = {
	afflictions: readonly ActiveAffliction[];
	rareEquipment: RareEquipmentAllocation | null;
	townEquipmentPurchases: readonly string[];
	townPortal: TownPortal | null;
	// Floors where a Ring of Displacement has already fired this adventure.
	displacedFloors?: readonly number[];
	townEquipmentStock: readonly ItemInstance[];
	townPotionStock: TownPotionStock;
	townScrollStock: TownScrollStock;
	// Items left in the town storage chest, in deposit order.
	townStorage: readonly ItemInstance[];
	town: TownLocation | null;
	readonly difficulty: Difficulty;
	merchantStock: MerchantStock;
	escape: EscapeState | null;
	run: DungeonRun;
	objects: readonly DungeonObject[];
	gold: number;
	turn: number;
	mana: number;
	knownSpells: readonly SpellKind[];
	spellHotbar: SpellHotbar;
	effects: readonly TimedEffect[];
	quest: QuestState;
	monstersDefeated: number;
	player: PlayerStats;
	progression: Progression;
	equipment: Equipment;
	bag: Bag;
	potionHotbar: PotionHotbar;
	floorItems: readonly FloorItem[];
	monsters: readonly Monster[];
	activityHistory: ActivityHistory;
};

// Fresh adventures only; loading and town travel preserve the saved balance.
export const STARTING_GOLD = 300;

export const createGameState = (
	run: DungeonRun,
	difficulty: number = 1,
): GameState => {
	assertDifficulty(difficulty);
	const monsters = spawnRunMonsters(run);
	const ordinaryLoot = spawnRunItems(run, monsters);
	const loot = [
		...ordinaryLoot,
		...spawnRunQuestItems(run, monsters, ordinaryLoot),
	];
	const ordinaryItems = [...loot, ...spawnRunSpellbooks(run, monsters, loot)];
	const floorItems = [
		...ordinaryItems,
		...spawnRunExitScrolls(run, monsters, ordinaryItems),
	];
	const encounters = addOptionalEliteRooms({
		run,
		monsters,
		floorItems,
		objects: spawnRunObjects(run, monsters, floorItems),
	});
	const objects = placeMerchants({ ...encounters, run, floorItems });

	// New adventures hide rare equipment per third of the dungeon. The single seeded
	// allocation only survives in older saves.
	const rare = {
		allocation: null,
		items: placeRunRareFinds(run, encounters.monsters, floorItems, objects),
	};
	const warden = placeEmberWarden(
		run,
		encounters.monsters,
		[...floorItems, ...rare.items],
		objects,
		difficulty,
	);
	const thieves = placeTreasureThieves(
		run,
		[...encounters.monsters, ...(warden ? [warden] : [])],
		[...floorItems, ...rare.items],
		objects,
		difficulty,
	);
	return {
		rareEquipment: rare.allocation,
		townEquipmentPurchases: [],
		town: null,
		townPortal: null,
		townPotionStock: createTownPotionStock(),
		townScrollStock: createTownScrollStock(),
		townStorage: [],
		townEquipmentStock: createTownEquipmentStock(),
		difficulty,
		run,
		escape: null,
		merchantStock: createMerchantStock(),
		objects,
		gold: STARTING_GOLD,
		turn: 0,
		knownSpells: createKnownSpells(),
		spellHotbar: createSpellHotbar(createKnownSpells()),
		effects: [],
		afflictions: [],
		mana: maximumMana(createProgression()),
		quest: createQuest(run),
		monstersDefeated: 0,
		player: createPlayerStats(),
		progression: createProgression(),
		equipment: createStartingEquipment(),
		bag: createStartingBag(),
		potionHotbar: createStartingPotionHotbar(),
		// The Warden carries the flame and drops it when it falls. The flame's tile still
		// anchors the Warden and shapes placement, so the rest of the floor is unchanged.
		floorItems: [...floorItems, ...rare.items].filter(
			(entry) => !warden || entry.item.kind !== "cure",
		),
		monsters: [
			...(difficulty === 1
				? markFirstRemedySources(encounters.monsters)
				: markFirstRemedySources(encounters.monsters).map((monster) => ({
						...monster,
						health: maximumMonsterHealth(
							monster.kind,
							difficulty,
							monster.floorNumber,
						),
					}))),
			// The ember's guardian joins after ordinary placement, so it never shifts it.
			...(warden ? [warden] : []),
			// Thieves join last, on their own streams, so no other placement moves.
			...thieves,
		],
		activityHistory: createActivityHistory(),
	};
};
