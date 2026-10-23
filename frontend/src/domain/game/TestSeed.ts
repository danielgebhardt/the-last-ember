import {
	connectDungeonFloors,
	type DungeonFloor,
	type DungeonRun,
	generateDungeonRun,
} from "../dungeon/DungeonRun";
import type { Coordinate } from "../dungeon/DungeonTypes";
import type { Room } from "../dungeon/Room";
import type { RunConfiguration } from "../dungeon/RunConfiguration";
import { MAX_SEED } from "../dungeon/Seed";
import { FLOOR, WALL } from "../dungeon/Tiles";
import { createBag } from "../items/Bag";
import { createStartingEquipment } from "../items/Equipment";
import {
	ITEM_DEFINITIONS,
	type ItemInstance,
	type ItemKind,
} from "../items/Item";
import { createStartingPotionHotbar } from "../items/PotionHotbar";
import {
	MONSTER_DEFINITIONS,
	type Monster,
	type MonsterKind,
	monsterAffliction,
} from "../monsters/Monster";
import { markFirstRemedySources } from "../monsters/MonsterPlacement";
import { maximumMonsterHealth } from "../monsters/MonsterStats";
import {
	type DungeonObject,
	type DungeonObjectKind,
	OBJECT_DEFINITIONS,
} from "../objects/DungeonObject";
import { carveFloorVault } from "../objects/SecretVaults";
import type { Difficulty } from "./Difficulty";
import { createGameState, type GameState } from "./GameState";
import { maximumMana } from "./Mana";
import type { FloorOmen } from "./Omens";
import { maximumHealth } from "./PlayerHealth";
import { createProgression, experienceThreshold } from "./Progression";
import { createSpellHotbar } from "./SpellHotbar";
import { SPELL_DEFINITIONS, type SpellKind } from "./Spells";

// Reserved developer seed: a full kit and authored test floors. Saving is
// blocked, so its unbalanced state never meets save validation.
export const TEST_SEED = 7357;
export const TEST_SEED_FLOORS = 3;
export const isTestSeed = (seed: number): boolean => seed === TEST_SEED;
export const randomAdventureSeed = (random: () => number = Math.random) => {
	let seed = TEST_SEED;
	while (isTestSeed(seed)) seed = Math.floor(random() * (MAX_SEED + 1));
	return seed;
};

// Coverage comes from the content definitions, so new objects, affliction
// sources and monsters join the test floors without editing this file. The champion,
// the reflection and the Ember Warden only exist through their encounters (elite gate,
// mirror, the ember on the generated final floor).
// A cracked wall needs solid rock behind a room, so floor 1 carves a real vault instead.
const ENCOUNTERS = (
	Object.keys(OBJECT_DEFINITIONS) as DungeonObjectKind[]
).filter((kind) => kind !== "door" && kind !== "cracked-wall");
const AFFLICTION_SOURCES = (
	Object.keys(MONSTER_DEFINITIONS) as MonsterKind[]
).filter(
	(kind) =>
		monsterAffliction(kind) !== undefined ||
		MONSTER_DEFINITIONS[kind].onHitCondition !== undefined,
);
const BESTIARY = (Object.keys(MONSTER_DEFINITIONS) as MonsterKind[]).filter(
	(kind) =>
		kind !== "iron-champion" &&
		kind !== "reflection" &&
		kind !== "ember-warden" &&
		!AFFLICTION_SOURCES.includes(kind),
);

// Rooms line both sides of one corridor; each opens onto it through a single
// doorway tile, so a door or elite gate there seals the room.
const ROOM_SIZE = 5;
type AuthoredFloor = Readonly<{
	floor: DungeonFloor;
	rooms: readonly Room[];
	doorways: readonly Coordinate[];
	entry: Coordinate;
	exit: Coordinate;
}>;
const authoredFloor = (
	floorNumber: number,
	roomCount: number,
	// Solid rock below the bottom rooms, room for a vault.
	extraRows = 0,
): AuthoredFloor => {
	const perSide = Math.ceil(roomCount / 2);
	const rows = 2 * ROOM_SIZE + 5 + extraRows;
	const cols = (ROOM_SIZE + 1) * perSide + 1;
	const corridor = ROOM_SIZE + 2;
	const terrain = Array.from({ length: rows }, () =>
		Array<string>(cols).fill(WALL),
	);
	for (let col = 1; col < cols - 1; col++) terrain[corridor][col] = FLOOR;
	const rooms: Room[] = [];
	const doorways: Coordinate[] = [];
	for (let index = 0; index < roomCount; index++) {
		const top = index < perSide;
		const startRow = top ? 1 : corridor + 2;
		const startCol = 1 + (ROOM_SIZE + 1) * (top ? index : index - perSide);
		const room = {
			startRow,
			endRow: startRow + ROOM_SIZE - 1,
			startCol,
			endCol: startCol + ROOM_SIZE - 1,
		};
		for (let row = room.startRow; row <= room.endRow; row++)
			for (let col = room.startCol; col <= room.endCol; col++)
				terrain[row][col] = FLOOR;
		const doorway = {
			row: top ? corridor - 1 : corridor + 1,
			col: startCol + Math.floor(ROOM_SIZE / 2),
		};
		terrain[doorway.row][doorway.col] = FLOOR;
		rooms.push(room);
		doorways.push(doorway);
	}
	return {
		floor: {
			floorNumber,
			terrain,
			rooms,
			corridors: [],
			partitions: {
				region: {
					startRow: 0,
					startCol: 0,
					endRow: rows - 1,
					endCol: cols - 1,
				},
				room: rooms[0],
			},
		},
		rooms,
		doorways,
		entry: { row: corridor, col: 1 },
		exit: { row: corridor, col: cols - 2 },
	};
};
const center = (room: Room): Coordinate => ({
	row: room.startRow + Math.floor(ROOM_SIZE / 2),
	col: room.startCol + Math.floor(ROOM_SIZE / 2),
});

// Authored floors replace the first three generated ones; deeper floors, their
// stairs and the ember stay exactly as the seed generates them.
const testRun = ({
	floorCount,
	difficulty: _difficulty,
	...dungeon
}: RunConfiguration) => {
	const generated = connectDungeonFloors(
		generateDungeonRun(TEST_SEED, floorCount, dungeon),
	);
	const authored = [
		authoredFloor(1, ENCOUNTERS.length + 1, 4),
		authoredFloor(2, AFFLICTION_SOURCES.length),
		authoredFloor(3, BESTIARY.length),
	];
	const deeper = generated.floors[TEST_SEED_FLOORS];
	const deeperEntry = deeper.upStair?.coordinate;
	if (!deeperEntry) throw new Error("The first generated floor needs an entry");
	const floors: DungeonFloor[] = [
		...authored.map(({ floor, entry, exit }, index) => ({
			...floor,
			...(index > 0
				? {
						upStair: {
							coordinate: entry,
							destinationFloor: index,
							arrivalCoordinate: authored[index - 1].exit,
						},
					}
				: {}),
			downStair: {
				coordinate: exit,
				destinationFloor: index + 2,
				arrivalCoordinate: authored[index + 1]?.entry ?? deeperEntry,
			},
		})),
		{
			...deeper,
			upStair: {
				coordinate: deeperEntry,
				destinationFloor: TEST_SEED_FLOORS,
				arrivalCoordinate: authored[TEST_SEED_FLOORS - 1].exit,
			},
		},
		...generated.floors.slice(TEST_SEED_FLOORS + 1),
	];
	const run: DungeonRun = {
		seed: TEST_SEED,
		floors,
		activeFloor: 1,
		playerCoordinate: center(authored[0].rooms[0]),
	};
	return { run, authored };
};

const testContent = (
	authored: readonly AuthoredFloor[],
	difficulty: Difficulty,
): { monsters: Monster[]; objects: DungeonObject[] } => {
	const monsters: Monster[] = [];
	const objects: DungeonObject[] = [];
	const spawn = (kind: MonsterKind, floorNumber: number, at: Coordinate) =>
		monsters.push({
			id: `${floorNumber}:${monsters.filter((m) => m.floorNumber === floorNumber).length + 1}`,
			kind,
			floorNumber,
			coordinate: at,
			health: maximumMonsterHealth(kind, difficulty, floorNumber),
			intent: { type: "idle" },
			lastDamagedTurn: null,
		});
	const place = (
		kind: DungeonObjectKind,
		floorNumber: number,
		at: Coordinate,
		index = 1,
	) =>
		objects.push({
			id: `floor:${floorNumber}:object:${kind}:${index}`,
			kind,
			floorNumber,
			coordinate: at,
			activated: false,
		});
	const [encounters, afflictions, bestiary] = authored;
	// Floor 1: the start room, then one room per optional encounter.
	ENCOUNTERS.forEach((kind, index) => {
		const room = encounters.rooms[index + 1];
		if (kind !== "elite-door") {
			place(kind, 1, center(room));
			return;
		}
		place(kind, 1, encounters.doorways[index + 1]);
		monsters.push({
			id: "1:20001",
			kind: "iron-champion",
			floorNumber: 1,
			coordinate: center(room),
			health: maximumMonsterHealth("iron-champion", difficulty, 1),
			lastDamagedTurn: null,
			intent: { type: "idle" },
			awareness: { type: "idle" },
		});
	});
	// Floors 2 and 3: a closed door per room, two of each affliction source and
	// one of every other monster.
	AFFLICTION_SOURCES.forEach((kind, index) => {
		const { row, col } = center(afflictions.rooms[index]);
		spawn(kind, 2, { row, col: col - 1 });
		spawn(kind, 2, { row, col: col + 1 });
		place("door", 2, afflictions.doorways[index], index + 1);
	});
	BESTIARY.forEach((kind, index) => {
		spawn(kind, 3, center(bestiary.rooms[index]));
		place("door", 3, bestiary.doorways[index], index + 1);
	});
	return { monsters, objects };
};

// Authored floors keep no generated omens; the first generated floor always shows one, a
// rule-only omen that needs no gathering.
const testOmens = (generated: readonly FloorOmen[]): FloorOmen[] =>
	generated.some((omen) => omen.floorNumber === TEST_SEED_FLOORS + 1)
		? [...generated]
		: [
				...generated.filter((omen) => omen.kind !== "ember-lit"),
				{ floorNumber: TEST_SEED_FLOORS + 1, kind: "ember-lit" },
			];

// Level 10, every spell, 10,000 gold, 20 of every potion and scroll, and one of
// each special find.
const STACKED = ["potion", "scroll", "enchantment"];
const testBag = () => {
	const items: ItemInstance[] = [];
	for (const kind of Object.keys(ITEM_DEFINITIONS) as ItemKind[]) {
		const definition = ITEM_DEFINITIONS[kind];
		if (STACKED.includes(definition.type))
			for (let copy = 1; copy <= 20; copy++)
				items.push({ id: `test-seed:${kind}:${copy}`, kind });
		else if ("specialFindOnly" in definition)
			items.push({ id: `test-seed:${kind}`, kind });
	}
	return createBag(items);
};

export const createTestSeedState = (
	configuration: RunConfiguration,
): GameState => {
	const difficulty: Difficulty = configuration.difficulty ?? 1;
	const { run, authored } = testRun(configuration);
	const base = createGameState(run, difficulty);
	const deeper = <T extends { floorNumber: number }>(entries: readonly T[]) =>
		entries.filter((entry) => entry.floorNumber > TEST_SEED_FLOORS);
	const content = testContent(authored, difficulty);
	const progression = {
		...createProgression(),
		experience: experienceThreshold(10),
	};
	const equipment = createStartingEquipment();
	const maxHealth = maximumHealth(progression, equipment);
	const knownSpells = Object.keys(SPELL_DEFINITIONS) as SpellKind[];
	// Floor 1 always hides a vault behind its first bottom-room wall with rock behind it.
	const vault = carveFloorVault(
		base.run.floors[0],
		() => 0,
		() => 0,
	);
	return {
		...base,
		run: vault
			? { ...base.run, floors: [vault.floor, ...base.run.floors.slice(1)] }
			: base.run,
		monsters: [
			...markFirstRemedySources(content.monsters),
			...deeper(base.monsters),
		],
		objects: [
			...content.objects,
			...(vault?.objects ?? []),
			...deeper(base.objects),
		],
		omens: testOmens(deeper(base.omens ?? [])),
		floorItems: [...(vault?.floorItems ?? []), ...deeper(base.floorItems)],
		gold: 10000,
		progression,
		player: { health: maxHealth, maxHealth },
		mana: maximumMana(progression, equipment),
		knownSpells,
		spellHotbar: createSpellHotbar(knownSpells),
		bag: testBag(),
		potionHotbar: createStartingPotionHotbar(),
	};
};
