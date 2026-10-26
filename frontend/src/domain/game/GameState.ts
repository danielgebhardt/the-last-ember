import {
	type Arena,
	arenaFloorFor,
	selectMiniboss,
	withArena,
} from "../arena/Arena";
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
import { placeRunRareFinds } from "../items/RareFinds";
import { spawnRunSpellbooks } from "../items/SpellbookPlacement";
import { merchantsEnabled } from "../merchant/MerchantAvailability";
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
import { placeDarkAltar } from "../objects/DarkAltar";
import type { DungeonObject } from "../objects/DungeonObject";
import { spawnRunObjects } from "../objects/ObjectPlacement";
import { addOptionalEliteRooms } from "../objects/OptionalEliteRooms";
import { carveSecretVaults } from "../objects/SecretVaults";
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
import {
	applyDeveloperExclusions,
	type DeveloperFeature,
} from "./DeveloperFeatures";
import { assertDifficulty, type Difficulty } from "./Difficulty";
import type { EscapeState } from "./Escape";
import { maximumMana } from "./Mana";
import {
	applyOmenGatherings,
	clearMerchantRooms,
	type FloorOmen,
	selectFloorOmens,
} from "./Omens";
import { createPlayerStats, type PlayerStats } from "./PlayerStats.ts";
import { createProgression, type Progression } from "./Progression";
import type { RunEncounters } from "./RunEncounters";
import { createSpellHotbar, type SpellHotbar } from "./SpellHotbar";
import { createKnownSpells, type SpellKind } from "./Spells";
import type { TimedEffect } from "./TimedEffects";

export type GameState = {
	encounters?: RunEncounters;
	afflictions: readonly ActiveAffliction[];
	townEquipmentPurchases: readonly string[];
	townPortal: TownPortal | null;
	// Floors whose omen changes how they play; absent in older adventures.
	omens: readonly FloorOmen[];
	// Fixed arenas the way down runs through, one in long adventures.
	arenas: readonly Arena[];
	// Started from the opening dialog: the standard dungeon with a random seed. Only
	// ranked adventures are recorded on the leaderboards (#312, #419).
	ranked?: true;
	// Only new adventures receive this; loading an old save never opts it in.
	rankingVersion?: string;
	// Reserved for developer-assisted adventures; these never qualify for Rankings.
	developerRun?: true;
	disabledFeatures?: DeveloperFeature[];
	// Browser identity only; never used by seeded gameplay.
	runId?: string;
	// A wielded Hungering Blade's binding and the turn of its last kill.
	hunger?: Readonly<{ fedTurn: number }>;
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
	disabled: readonly DeveloperFeature[] = [],
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

	// Rare equipment hides once per third of the dungeon.
	const rare = {
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
	const ordinary =
		difficulty === 1
			? markFirstRemedySources(encounters.monsters)
			: markFirstRemedySources(encounters.monsters).map((monster) => ({
					...monster,
					health: maximumMonsterHealth(
						monster.kind,
						difficulty,
						monster.floorNumber,
					),
				}));
	// Omens join after all other placement, on their own streams, so no other floor moves.
	const omens = selectFloorOmens(run, objects, merchantsEnabled());
	const restFloors = omens
		.filter((omen) => omen.kind === "merchants-rest")
		.map((omen) => omen.floorNumber);
	const gathered = clearMerchantRooms(
		run,
		applyOmenGatherings(
			run,
			omens,
			{
				// The ember's guardian and the thieves join after ordinary placement, so
				// they never shift it.
				monsters: [...ordinary, ...(warden ? [warden] : []), ...thieves],
				objects: placeMerchants(
					{ run, objects, monsters: encounters.monsters, floorItems },
					merchantsEnabled(),
					restFloors,
				),
				// The Warden carries the flame and drops it when it falls. The flame's tile
				// still anchors the Warden and shapes placement, so the rest of the floor is
				// unchanged.
				floorItems: [...floorItems, ...rare.items].filter(
					(entry) => !warden || entry.item.kind !== "cure",
				),
			},
			difficulty,
		),
		restFloors,
	);
	// A dark altar takes its own stream after every other placement.
	const altar = placeDarkAltar(run, gathered);
	// Vaults carve solid rock last, so no other placement sees or moves around them.
	const vaults = carveSecretVaults(
		run,
		omens
			.filter((omen) => omen.kind === "cracked")
			.map((omen) => omen.floorNumber),
	);
	const created: GameState = {
		townEquipmentPurchases: [],
		town: null,
		townPortal: null,
		townPotionStock: createTownPotionStock(),
		townScrollStock: createTownScrollStock(),
		townStorage: [],
		townEquipmentStock: createTownEquipmentStock(),
		difficulty,
		run: disabled.includes("vaults") ? run : vaults.run,
		escape: null,
		merchantStock: createMerchantStock(),
		objects: [
			...(disabled.includes("omens") ? objects : gathered.objects),
			...(altar ? [altar] : []),
			...(disabled.includes("vaults") ? [] : vaults.objects),
		],
		omens: disabled.includes("omens") ? [] : omens,
		arenas: [],
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
		floorItems: [
			...(disabled.includes("omens")
				? [...floorItems, ...rare.items].filter(
						(entry) => !warden || entry.item.kind !== "cure",
					)
				: gathered.floorItems),
			...(disabled.includes("vaults") ? [] : vaults.floorItems),
		],
		// Quiet floors may have lost a floor's first affliction carrier; mark again.
		monsters: markFirstRemedySources(
			disabled.includes("omens")
				? [...ordinary, ...(warden ? [warden] : []), ...thieves]
				: gathered.monsters,
		),
		activityHistory: createActivityHistory(),
	};
	// The arena replaces its floor last, so no other floor's content moves.
	const arenaFloorNumber = arenaFloorFor(run.floors.length);
	return applyDeveloperExclusions(
		arenaFloorNumber && !disabled.includes("arena")
			? withArena(
					created,
					{ floorNumber: arenaFloorNumber, miniboss: selectMiniboss(run.seed) },
					difficulty,
				)
			: created,
		disabled,
	);
};
