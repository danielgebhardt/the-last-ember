import { type DungeonRun, hashStringToUint32 } from "../dungeon/DungeonRun";
import type { Coordinate } from "../dungeon/DungeonTypes";
import { createSeededRandom } from "../dungeon/Seed";
import { FLOOR, WALL } from "../dungeon/Tiles";
import { hasLineOfSight } from "../dungeon/Visibility";
import { appendActivityEvents } from "../game/ActivityHistory";
import type { GameState } from "../game/GameState";
import { hasPerk } from "../game/Perks";
import type { FloorItem } from "../items/FloorItems";
import { selectLootKind } from "../items/Loot";
import { coordinateKey } from "../monsters/MonsterLocations";
import type { DungeonObject } from "./DungeonObject";
import { navigationRun } from "./NavigationTerrain";

// A vault is a small pocket carved into solid rock behind a room's side wall, so no
// corridor ever leads to it. Its entrance stays wall terrain, marked by a cracked-wall
// object that looks like any wall until you pass close by with line of sight; opening it
// takes a turn and turns that tile to floor.
export const VAULT_CHANCE = 0.35;
export const VAULT_MIN_FLOOR = 2;
export const VAULT_NOTICE_RADIUS = 2;
const POCKET_WIDTH = 3;
const POCKET_DEPTH = 2;

export const isCrackedWall = (object: Pick<DungeonObject, "kind">) =>
	object.kind === "cracked-wall";
// Wall terrain until opened; hidden until noticed.
export const blocksAsWall = (object: DungeonObject) =>
	isCrackedWall(object) && !object.activated;
export const hiddenCrackedWall = (object: DungeonObject) =>
	blocksAsWall(object) && !object.noticed;

type Floor = DungeonRun["floors"][number];
const inRoom = (floor: Floor, { row, col }: Coordinate) =>
	floor.rooms.some(
		(r) =>
			row >= r.startRow &&
			row <= r.endRow &&
			col >= r.startCol &&
			col <= r.endCol,
	);
const SIDES = [
	{ row: -1, col: 0 },
	{ row: 1, col: 0 },
	{ row: 0, col: -1 },
	{ row: 0, col: 1 },
] as const;
const at = (p: Coordinate, d: Coordinate, steps = 1) => ({
	row: p.row + d.row * steps,
	col: p.col + d.col * steps,
});

type Vault = Readonly<{ entrance: Coordinate; pocket: readonly Coordinate[] }>;
// Every room side-wall tile (never a corner) with a pocket of solid rock behind it,
// one tile of rock all around, inside the map edge.
export const vaultSites = (floor: Floor): Vault[] => {
	const terrain = floor.terrain;
	const rock = (p: Coordinate) =>
		p.row > 0 &&
		p.col > 0 &&
		p.row < terrain.length - 1 &&
		p.col < (terrain[p.row]?.length ?? 0) - 1 &&
		terrain[p.row][p.col] === WALL;
	const sites: Vault[] = [];
	for (const room of floor.rooms)
		for (const out of SIDES) {
			const along = { row: out.col, col: out.row };
			const edge: Coordinate[] = [];
			if (out.row !== 0)
				for (let col = room.startCol + 1; col < room.endCol; col++)
					edge.push({ row: out.row < 0 ? room.startRow : room.endRow, col });
			else
				for (let row = room.startRow + 1; row < room.endRow; row++)
					edge.push({ row, col: out.col < 0 ? room.startCol : room.endCol });
			for (const inside of edge) {
				const entrance = at(inside, out);
				const half = Math.floor(POCKET_WIDTH / 2);
				const pocket: Coordinate[] = [];
				// The entrance, the pocket and one tile of rock all around it must all be
				// solid rock now, so the vault touches nothing but its own room's wall.
				let solid = true;
				for (let depth = 0; depth <= POCKET_DEPTH + 1 && solid; depth++)
					for (let side = -half - 1; side <= half + 1 && solid; side++) {
						const p = at(at(entrance, out, depth), along, side);
						if (!rock(p)) solid = false;
						else if (
							depth >= 1 &&
							depth <= POCKET_DEPTH &&
							Math.abs(side) <= half
						)
							pocket.push(p);
					}
				if (solid) sites.push({ entrance, pocket });
			}
		}
	return sites;
};

const carve = (terrain: Floor["terrain"], tiles: readonly Coordinate[]) => {
	const rows = terrain.map((row) => [...row]);
	for (const { row, col } of tiles) rows[row][col] = FLOOR;
	return rows;
};

// Carves one vault on a floor at the site its picker chooses, holding a gold cache and
// one found item; undefined when the floor has no site.
export const carveFloorVault = (
	floor: Floor,
	pick: (count: number) => number,
	random: () => number,
):
	| { floor: Floor; objects: DungeonObject[]; floorItems: FloorItem[] }
	| undefined => {
	const sites = vaultSites(floor);
	if (!sites.length) return undefined;
	const site = sites[pick(sites.length)];
	const id = `floor:${floor.floorNumber}:object:cracked-wall:1`;
	const kind =
		selectLootKind(floor.floorNumber, "found", random) ?? "healing-potion";
	return {
		floor: {
			...floor,
			terrain: carve(floor.terrain, site.pocket),
		},
		objects: [
			{
				id,
				kind: "cracked-wall",
				floorNumber: floor.floorNumber,
				coordinate: { ...site.entrance },
				activated: false,
			},
			{
				id: `floor:${floor.floorNumber}:object:gold:vault`,
				kind: "gold",
				floorNumber: floor.floorNumber,
				coordinate: { ...site.pocket[0] },
				activated: false,
			},
		],
		floorItems: [
			{
				item: { id: `${id}:reward`, kind },
				floorNumber: floor.floorNumber,
				coordinate: { ...site.pocket[site.pocket.length - 1] },
			},
		],
	};
};

// After every other placement, each eligible floor rolls once on its own stream for a
// vault, so nothing else in generation moves.
export const carveSecretVaults = (
	run: DungeonRun,
	// Floors whose omen promises a vault carve one whatever their roll.
	promised: readonly number[] = [],
): {
	run: DungeonRun;
	objects: readonly DungeonObject[];
	floorItems: readonly FloorItem[];
} => {
	const objects: DungeonObject[] = [];
	const floorItems: FloorItem[] = [];
	const floors = run.floors.map((floor) => {
		if (floor.floorNumber < VAULT_MIN_FLOOR) return floor;
		const random = createSeededRandom(
			hashStringToUint32(`${run.seed}:${floor.floorNumber}:secret-vault`),
		);
		if (random() >= VAULT_CHANCE && !promised.includes(floor.floorNumber))
			return floor;
		const vault = carveFloorVault(
			floor,
			(count) => Math.floor(random() * count),
			random,
		);
		if (!vault) return floor;
		objects.push(...vault.objects);
		floorItems.push(...vault.floorItems);
		return vault.floor;
	});
	return objects.length
		? { run: { ...run, floors }, objects, floorItems }
		: { run, objects, floorItems };
};

// The pocket behind an unopened cracked wall: every floor tile reached from the wall's
// outward side without crossing the wall or entering a room.
export const sealedVaultTiles = (
	floor: Pick<Floor, "floorNumber" | "rooms" | "terrain">,
	objects: readonly DungeonObject[],
): Set<string> => {
	const tiles = new Set<string>();
	for (const wall of objects) {
		if (wall.floorNumber !== floor.floorNumber || !blocksAsWall(wall)) continue;
		const start = SIDES.map((side) => at(wall.coordinate, side)).find(
			(p) =>
				floor.terrain[p.row]?.[p.col] === FLOOR &&
				!inRoom(floor as Floor, p) &&
				!tiles.has(coordinateKey(p)),
		);
		if (!start) continue;
		const queue = [start];
		const seen = new Set([
			coordinateKey(start),
			coordinateKey(wall.coordinate),
		]);
		for (let index = 0; index < queue.length; index++) {
			const point = queue[index];
			tiles.add(coordinateKey(point));
			for (const side of SIDES) {
				const next = at(point, side);
				const key = coordinateKey(next);
				if (seen.has(key) || floor.terrain[next.row]?.[next.col] !== FLOOR)
					continue;
				seen.add(key);
				queue.push(next);
			}
		}
	}
	return tiles;
};

// Close by, with line of sight, a hidden cracked wall becomes noticed for good.
export const noticeCrackedWalls = (state: GameState): GameState => {
	if (state.town) return state;
	const radius =
		VAULT_NOTICE_RADIUS + (hasPerk(state.progression, "keen-eyes") ? 1 : 0);
	const player = state.run.playerCoordinate;
	const terrain =
		navigationRun(state).floors[state.run.activeFloor - 1]?.terrain;
	if (!terrain) return state;
	const found = state.objects.filter(
		(object) =>
			object.floorNumber === state.run.activeFloor &&
			hiddenCrackedWall(object) &&
			Math.hypot(
				object.coordinate.row - player.row,
				object.coordinate.col - player.col,
			) <= radius &&
			hasLineOfSight(terrain, player, object.coordinate),
	);
	if (!found.length) return state;
	return {
		...state,
		objects: state.objects.map((object) =>
			found.includes(object) ? { ...object, noticed: true as const } : object,
		),
		activityHistory: appendActivityEvents(state.activityHistory, [
			{ type: "cracked-wall-noticed", turn: state.turn },
		]),
	};
};

export const openCrackedWall = (
	state: GameState,
	wall: DungeonObject,
): GameState | { error: string } => {
	if (wall.activated) return { error: "The wall is already broken open." };
	if (!wall.noticed) return { error: "No object within reach." };
	return {
		...state,
		run: {
			...state.run,
			floors: state.run.floors.map((floor) =>
				floor.floorNumber === wall.floorNumber
					? { ...floor, terrain: carve(floor.terrain, [wall.coordinate]) }
					: floor,
			),
		},
		objects: state.objects.map((object) =>
			object.id === wall.id ? { ...object, activated: true } : object,
		),
		activityHistory: appendActivityEvents(state.activityHistory, [
			{ type: "vault-opened", turn: state.turn },
		]),
	};
};
