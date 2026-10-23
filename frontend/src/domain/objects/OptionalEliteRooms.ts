import type { DungeonFloor } from "../dungeon/DungeonRun";
import type { Coordinate } from "../dungeon/DungeonTypes";
import type { Room } from "../dungeon/Room";
import { createSeededRandom, hashStringToUint32 } from "../dungeon/Seed";
import type { GameState } from "../game/GameState";
import {
	coordinateKey,
	protectedFloorLocations,
} from "../monsters/MonsterLocations";
import { maximumMonsterHealth } from "../monsters/MonsterStats";
import type { DungeonObject } from "./DungeonObject";
import { sealedVaultTiles } from "./SecretVaults";

type Geometry = Pick<DungeonFloor, "terrain" | "rooms">;
type Chamber = { room: Room; gate: Coordinate };
const offsets = [
	{ row: -1, col: 0 },
	{ row: 0, col: 1 },
	{ row: 1, col: 0 },
	{ row: 0, col: -1 },
];
export const insideRoom = (point: Coordinate, room: Room): boolean =>
	point.row >= room.startRow &&
	point.row <= room.endRow &&
	point.col >= room.startCol &&
	point.col <= room.endCol;

const roomEntries = (floor: Geometry, room: Room): Coordinate[] => {
	const entries = new Map<string, Coordinate>();
	for (let row = room.startRow; row <= room.endRow; row++)
		for (let col = room.startCol; col <= room.endCol; col++)
			for (const offset of offsets) {
				const point = { row: row + offset.row, col: col + offset.col };
				if (
					!insideRoom(point, room) &&
					floor.terrain[point.row]?.[point.col] === "."
				)
					entries.set(coordinateKey(point), point);
			}
	return [...entries.values()];
};

// Only existing dead-end rooms qualify. Closing their single entrance must not
// disconnect any required destination, even when corridors have extra links.
export const findOptionalEliteRooms = (
	floor: Geometry,
	required: readonly Coordinate[],
): Chamber[] => {
	if (!required.length) return [];
	const chambers: Chamber[] = [];
	for (const room of floor.rooms) {
		if (required.some((point) => insideRoom(point, room))) continue;
		const entries = roomEntries(floor, room);
		if (entries.length !== 1) continue;
		const gate = entries[0],
			gateKey = coordinateKey(gate);
		const visited = new Set<string>(),
			queue = [required[0]];
		for (let index = 0; index < queue.length; index++) {
			const point = queue[index],
				key = coordinateKey(point);
			if (
				key === gateKey ||
				visited.has(key) ||
				floor.terrain[point.row]?.[point.col] !== "."
			)
				continue;
			visited.add(key);
			for (const offset of offsets)
				queue.push({
					row: point.row + offset.row,
					col: point.col + offset.col,
				});
		}
		if (
			required.every((point) => visited.has(coordinateKey(point))) &&
			!visited.has(coordinateKey({ row: room.startRow, col: room.startCol }))
		)
			chambers.push({ room, gate });
	}
	return chambers;
};

// Tiles nothing may be placed on or moved into: elite chambers behind closed gates and
// secret vaults behind unopened cracked walls.
export const sealedTiles = (
	floor: Geometry & { floorNumber: number },
	objects: readonly DungeonObject[],
): ReadonlySet<string> => {
	const tiles = sealedVaultTiles(floor, objects);
	for (const object of objects) {
		if (
			object.floorNumber !== floor.floorNumber ||
			object.kind !== "elite-door" ||
			object.activated
		)
			continue;
		// The adjacent room is the chamber whose only outside entrance is this gate.
		for (const room of floor.rooms) {
			const entries = roomEntries(floor, room);
			if (
				entries.length !== 1 ||
				coordinateKey(entries[0]) !== coordinateKey(object.coordinate)
			)
				continue;
			for (let row = room.startRow; row <= room.endRow; row++)
				for (let col = room.startCol; col <= room.endCol; col++)
					tiles.add(coordinateKey({ row, col }));
		}
	}
	return tiles;
};

export const addOptionalEliteRooms = (
	source: Pick<GameState, "run" | "monsters" | "floorItems" | "objects">,
	{ chance = 0.2 } = {},
): Pick<GameState, "monsters" | "objects"> => {
	const monsters = [...source.monsters],
		objects = [...source.objects];
	for (const floor of source.run.floors) {
		if (
			floor.floorNumber < 8 ||
			objects.some(
				(o) => o.floorNumber === floor.floorNumber && o.kind === "elite-door",
			)
		)
			continue;
		const random = createSeededRandom(
			hashStringToUint32(`${source.run.seed}:${floor.floorNumber}:elite-room`),
		);
		if (random() >= chance) continue;
		const required = protectedFloorLocations(source.run, floor.floorNumber);
		if (source.run.activeFloor === floor.floorNumber)
			required.push(source.run.playerCoordinate);
		required.push(
			...source.floorItems
				.filter(
					(i) => i.floorNumber === floor.floorNumber && i.item.kind === "cure",
				)
				.map((i) => i.coordinate),
		);
		const occupied = [...monsters, ...objects, ...source.floorItems].filter(
			(e) => e.floorNumber === floor.floorNumber,
		);
		const candidates = findOptionalEliteRooms(floor, required).filter(
			({ room, gate }) =>
				!occupied.some(
					(e) =>
						insideRoom(e.coordinate, room) ||
						coordinateKey(e.coordinate) === coordinateKey(gate),
				),
		);
		if (
			!candidates.length ||
			monsters.some((m) => m.id === `${floor.floorNumber}:20001`)
		)
			continue;
		const { room, gate } = candidates[Math.floor(random() * candidates.length)];
		monsters.push({
			id: `${floor.floorNumber}:20001`,
			kind: "iron-champion",
			floorNumber: floor.floorNumber,
			coordinate: {
				row: Math.floor((room.startRow + room.endRow) / 2),
				col: Math.floor((room.startCol + room.endCol) / 2),
			},
			health: maximumMonsterHealth("iron-champion", 1, floor.floorNumber),
			lastDamagedTurn: null,
			intent: { type: "idle" },
			awareness: { type: "idle" },
		});
		objects.push({
			id: `floor:${floor.floorNumber}:object:elite-door:1`,
			kind: "elite-door",
			floorNumber: floor.floorNumber,
			coordinate: gate,
			activated: false,
		});
	}
	return { monsters, objects };
};
