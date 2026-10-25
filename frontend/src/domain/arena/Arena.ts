import {
	type DungeonFloor,
	type DungeonRun,
	hashStringToUint32,
} from "../dungeon/DungeonRun";
import type { Coordinate } from "../dungeon/DungeonTypes";
import { createSeededRandom } from "../dungeon/Seed";
import type { Difficulty } from "../game/Difficulty";
import type { GameState } from "../game/GameState";
import type { FloorItem } from "../items/FloorItems";
import { ITEM_DEFINITIONS, RARE_EQUIPMENT_KINDS } from "../items/Item";
import { selectRunRareFinds } from "../items/RareFinds";
import type { Monster } from "../monsters/Monster";
import { maximumMonsterHealth } from "../monsters/MonsterStats";
import type { DungeonObject } from "../objects/DungeonObject";
import { ARENA_LAYOUT, ARENA_POINTS, ARENA_ROOMS } from "./ArenaLayout";

// Long adventures route the way down through one fixed arena, 60% of the way down.
export const ARENA_MIN_DEPTH = 10;
export const ARENA_DEPTH_SHARE = 0.6;
export const arenaFloorFor = (depth: number): number | undefined =>
	depth >= ARENA_MIN_DEPTH ? Math.round(depth * ARENA_DEPTH_SHARE) : undefined;

export const MINIBOSS_KINDS = ["pyre-lord", "iron-juggernaut"] as const;
export type MinibossKind = (typeof MINIBOSS_KINDS)[number];
export type Arena = Readonly<{ floorNumber: number; miniboss: MinibossKind }>;
export const isMinibossKind = (kind: string): kind is MinibossKind =>
	(MINIBOSS_KINDS as readonly string[]).includes(kind);
export const selectMiniboss = (seed: number): MinibossKind =>
	MINIBOSS_KINDS[
		Math.floor(
			createSeededRandom(hashStringToUint32(`${seed}:arena:miniboss`))() *
				MINIBOSS_KINDS.length,
		)
	];

// Reserved identities: the miniboss, then the creatures its second phase calls.
export const MINIBOSS_ID = 1000020;
export const MINIBOSS_SUMMON_IDS = [1000021, 1000022] as const;
export const minibossId = (floorNumber: number) =>
	`${floorNumber}:${MINIBOSS_ID}`;

// The arena's stairs: you arrive on the sealed up stair; the way on lies in the reward room.
export const ARENA_UP_STAIR: Coordinate = { row: 8, col: 3 };
export const ARENA_DOWN_STAIR: Coordinate = ARENA_POINTS.exitPortal;
export const ARENA_REWARD_TILES = {
	rare: { row: 7, col: 37 },
	gold: { row: 9, col: 37 },
} as const satisfies Record<string, Coordinate>;
export const arenaGateId = (floorNumber: number) =>
	`floor:${floorNumber - 1}:object:arena-gate:1`;
export const arenaDoorId = (floorNumber: number) =>
	`floor:${floorNumber}:object:arena-door:1`;
export const arenaEntryId = (floorNumber: number) =>
	`floor:${floorNumber}:object:door:arena`;
export const arenaGoldId = (floorNumber: number) =>
	`floor:${floorNumber}:object:gold:arena`;
export const arenaRewardId = (floorNumber: number) =>
	`arena-reward:${floorNumber}`;

export const arenaTerrain = (): string[][] =>
	ARENA_LAYOUT.map((row) => row.split(""));
// Live floors hold rows of tiles; saved floors hold each row as text.
export const isArenaTerrain = (
	terrain: readonly (string | readonly string[])[],
) =>
	terrain.length === ARENA_LAYOUT.length &&
	terrain.every(
		(row, index) =>
			(typeof row === "string" ? row : row.join("")) === ARENA_LAYOUT[index],
	);
export const ARENA_ROOM_LIST = Object.values(ARENA_ROOMS).map((room) => ({
	...room,
}));

// Never a find the adventure already hides, and one that can lie at this depth.
export const arenaRewardKind = (
	seed: number,
	floorNumber: number,
	depth: number,
) => {
	const taken = new Set(selectRunRareFinds(seed, depth).map((f) => f.kind));
	const kinds = RARE_EQUIPMENT_KINDS.filter(
		(kind) =>
			!taken.has(kind) &&
			ITEM_DEFINITIONS[kind].minFloor <= floorNumber &&
			ITEM_DEFINITIONS[kind].maxFloor >= floorNumber,
	);
	return kinds.length
		? kinds[
				Math.floor(
					createSeededRandom(hashStringToUint32(`${seed}:arena:reward`))() *
						kinds.length,
				)
			]
		: undefined;
};

export const arenaFloor = (
	floorNumber: number,
	above: DungeonFloor,
	below: DungeonFloor | undefined,
): DungeonFloor => ({
	floorNumber,
	terrain: arenaTerrain(),
	rooms: ARENA_ROOM_LIST.map((room) => ({ ...room })),
	corridors: [],
	partitions: {
		region: {
			startRow: 0,
			startCol: 0,
			endRow: ARENA_LAYOUT.length - 1,
			endCol: ARENA_LAYOUT[0].length - 1,
		},
		room: { ...ARENA_ROOMS.hall },
	},
	...(above.downStair
		? {
				upStair: {
					coordinate: { ...ARENA_UP_STAIR },
					destinationFloor: floorNumber - 1,
					arrivalCoordinate: { ...above.downStair.coordinate },
				},
			}
		: {}),
	...(below?.upStair
		? {
				downStair: {
					coordinate: { ...ARENA_DOWN_STAIR },
					destinationFloor: floorNumber + 1,
					arrivalCoordinate: { ...below.upStair.coordinate },
				},
			}
		: {}),
});

// The arena replaces its floor after everything else is placed: whatever generation put
// there is cleared, and the floors around it now lead in and out of the arena.
export const withArena = (
	state: GameState,
	arena: Arena,
	difficulty: Difficulty,
): GameState => {
	const { floorNumber, miniboss } = arena;
	const floors = state.run.floors;
	const above = floors[floorNumber - 2];
	const below = floors[floorNumber];
	if (!above?.downStair || !below?.upStair) return state;
	const floor = arenaFloor(floorNumber, above, below);
	const run: DungeonRun = {
		...state.run,
		floors: floors.map((entry) =>
			entry.floorNumber === floorNumber
				? floor
				: entry === above && above.downStair
					? {
							...above,
							downStair: {
								...above.downStair,
								arrivalCoordinate: { ...ARENA_UP_STAIR },
							},
						}
					: entry === below && below.upStair
						? {
								...below,
								upStair: {
									...below.upStair,
									arrivalCoordinate: { ...ARENA_DOWN_STAIR },
								},
							}
						: entry,
		),
	};
	const elsewhere = <T extends { floorNumber: number }>(
		entries: readonly T[],
	) => entries.filter((entry) => entry.floorNumber !== floorNumber);
	const objects: DungeonObject[] = [
		{
			id: arenaGateId(floorNumber),
			kind: "arena-gate",
			floorNumber: floorNumber - 1,
			coordinate: { ...above.downStair.coordinate },
			activated: false,
		},
		{
			id: arenaEntryId(floorNumber),
			kind: "door",
			floorNumber,
			coordinate: { ...ARENA_POINTS.entryDoor },
			activated: false,
		},
		{
			id: arenaDoorId(floorNumber),
			kind: "arena-door",
			floorNumber,
			coordinate: { ...ARENA_POINTS.exitDoor },
			activated: false,
		},
		{
			id: arenaGoldId(floorNumber),
			kind: "gold",
			floorNumber,
			coordinate: { ...ARENA_REWARD_TILES.gold },
			activated: false,
		},
	];
	const reward = arenaRewardKind(state.run.seed, floorNumber, floors.length);
	const items: FloorItem[] = reward
		? [
				{
					item: { id: arenaRewardId(floorNumber), kind: reward },
					floorNumber,
					coordinate: { ...ARENA_REWARD_TILES.rare },
				},
			]
		: [];
	const boss: Monster = {
		id: minibossId(floorNumber),
		kind: miniboss,
		floorNumber,
		coordinate: { ...ARENA_POINTS.miniboss },
		health: maximumMonsterHealth(miniboss, difficulty, floorNumber),
		intent: { type: "idle" },
		lastDamagedTurn: null,
	};
	// The stair down is barred where it stands, so nothing may wait on it.
	const barred = (entry: { floorNumber: number; coordinate: Coordinate }) =>
		entry.floorNumber === floorNumber - 1 &&
		entry.coordinate.row === above.downStair?.coordinate.row &&
		entry.coordinate.col === above.downStair?.coordinate.col;
	return {
		...state,
		run,
		objects: [
			...elsewhere(state.objects).filter((o) => !barred(o)),
			...objects,
		],
		floorItems: [...elsewhere(state.floorItems), ...items],
		monsters: [...elsewhere(state.monsters), boss],
		...(state.omens
			? { omens: state.omens.filter((o) => o.floorNumber !== floorNumber) }
			: {}),
		arenas: [...(state.arenas ?? []), arena],
	};
};

export const arenaOn = (
	state: Pick<GameState, "arenas">,
	floorNumber: number,
): Arena | undefined =>
	state.arenas?.find((arena) => arena.floorNumber === floorNumber);
// Won once its exit door opens.
export const arenaCleared = (
	state: Pick<GameState, "objects">,
	arena: Arena,
): boolean =>
	state.objects.some(
		(o) => o.id === arenaDoorId(arena.floorNumber) && o.activated,
	);
// The first arena still standing; nothing below it can be reached until it falls.
export const standingArena = (
	state: Pick<GameState, "arenas" | "objects">,
): Arena | undefined =>
	[...(state.arenas ?? [])]
		.sort((a, b) => a.floorNumber - b.floorNumber)
		.find((arena) => !arenaCleared(state, arena));
