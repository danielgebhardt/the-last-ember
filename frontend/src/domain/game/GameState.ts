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
import {
	allocateRunRareEquipment,
	type RareEquipmentAllocation,
} from "../items/RareEquipment";
import { REMEDY_KINDS } from "../items/Remedies";
import { spawnRunSpellbooks } from "../items/SpellbookPlacement";
import { placeMerchants } from "../merchant/MerchantPlacement";
import {
	createMerchantStock,
	type MerchantStock,
} from "../merchant/MerchantRules";
import type { Monster } from "../monsters/Monster.ts";
import {
	markFirstRemedySources,
	spawnRunMonsters,
} from "../monsters/MonsterPlacement.ts";
import { maximumMonsterHealth } from "../monsters/MonsterStats";
import type { DungeonObject } from "../objects/DungeonObject";
import { spawnRunObjects } from "../objects/ObjectPlacement";
import { addOptionalEliteRooms } from "../objects/OptionalEliteRooms";
import {
	createTownPotionStock,
	type TownPotionStock,
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
	dungeonRemedies?: boolean;
	// Marks adventures whose loot pools include the Cleansing potion (#363).
	cleansingRemedies?: boolean;
	afflictions?: readonly ActiveAffliction[];
	rareEquipment?: RareEquipmentAllocation | null;
	townEquipmentPurchases?: readonly string[];
	townPortal: TownPortal | null;
	townEquipmentStock: readonly ItemInstance[];
	townPotionStock: TownPotionStock;
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
	const ordinaryLoot = spawnRunItems(run, monsters, undefined, REMEDY_KINDS);
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
	const rare = allocateRunRareEquipment(
		run,
		encounters.monsters,
		floorItems,
		objects,
	);
	return {
		rareEquipment: rare.allocation,
		townEquipmentPurchases: [],
		town: null,
		townPortal: null,
		townPotionStock: createTownPotionStock(),
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
		dungeonRemedies: true,
		cleansingRemedies: true,
		mana: maximumMana(createProgression()),
		quest: createQuest(run),
		monstersDefeated: 0,
		player: createPlayerStats(),
		progression: createProgression(),
		equipment: createStartingEquipment(),
		bag: createStartingBag(),
		potionHotbar: createStartingPotionHotbar(),
		floorItems: [...floorItems, ...rare.items],
		monsters:
			difficulty === 1
				? markFirstRemedySources(encounters.monsters)
				: markFirstRemedySources(encounters.monsters).map((monster) => ({
						...monster,
						health: maximumMonsterHealth(
							monster.kind,
							difficulty,
							monster.floorNumber,
						),
					})),
		activityHistory: createActivityHistory(),
	};
};
