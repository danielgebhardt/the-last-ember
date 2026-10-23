import type { Coordinate } from "../dungeon/DungeonTypes";
import { createSeededRandom, hashStringToUint32 } from "../dungeon/Seed";
import type { GameState } from "../game/GameState";
import {
	coordinateKey,
	protectedFloorLocations,
} from "../monsters/MonsterLocations";
import type { DungeonObject } from "../objects/DungeonObject";
import { sealedTiles } from "../objects/OptionalEliteRooms";
import { merchantsEnabled } from "./MerchantAvailability";
export const merchantFloors = (floorCount: number): number[] =>
	Array.from(
		{ length: Math.floor((floorCount - 1) / 5) },
		(_, i) => (i + 1) * 5,
	);

export const placeMerchants = (
	source: Pick<GameState, "run" | "objects" | "monsters" | "floorItems">,
	enabled = merchantsEnabled(),
	// Every fifth floor by default; an omen can call one to its own floor.
	floors = merchantFloors(source.run.floors.length),
): readonly DungeonObject[] => {
	if (!enabled) return source.objects;
	const objects = [...source.objects];
	for (const floorNumber of floors) {
		if (
			objects.some(
				(o) => o.floorNumber === floorNumber && o.kind === "merchant",
			)
		)
			continue;
		const floor = source.run.floors[floorNumber - 1];
		const required = protectedFloorLocations(source.run, floorNumber);
		const forbidden = new Set(
			[
				...required,
				...[...source.monsters, ...source.floorItems, ...objects]
					.filter((e) => e.floorNumber === floorNumber)
					.map((e) => e.coordinate),
			].map(coordinateKey),
		);
		if (source.run.activeFloor === floorNumber)
			forbidden.add(coordinateKey(source.run.playerCoordinate));
		const closedGates = new Set(
			objects
				.filter(
					(o) =>
						o.floorNumber === floorNumber &&
						o.kind === "elite-door" &&
						!o.activated,
				)
				.map((o) => coordinateKey(o.coordinate)),
		);
		// An opened optional chamber must not become a merchant location either.
		const sealed = sealedTiles(
			floor,
			objects.map((object) =>
				object.kind === "elite-door" ? { ...object, activated: false } : object,
			),
		);
		const reachable = new Set<string>(),
			queue = required.length ? [required[0]] : [];
		for (let index = 0; index < queue.length; index++) {
			const point = queue[index],
				key = coordinateKey(point);
			if (
				reachable.has(key) ||
				sealed.has(key) ||
				floor.terrain[point.row]?.[point.col] !== "."
			)
				continue;
			if (closedGates.has(key)) continue;
			reachable.add(key);
			queue.push(
				{ row: point.row - 1, col: point.col },
				{ row: point.row, col: point.col + 1 },
				{ row: point.row + 1, col: point.col },
				{ row: point.row, col: point.col - 1 },
			);
		}
		const candidates: Coordinate[] = [];
		for (const room of floor.rooms)
			for (let row = room.startRow; row <= room.endRow; row++)
				for (let col = room.startCol; col <= room.endCol; col++) {
					const point = { row, col },
						key = coordinateKey(point);
					if (reachable.has(key) && !forbidden.has(key)) candidates.push(point);
				}
		if (!candidates.length) continue;
		const random = createSeededRandom(
			hashStringToUint32(`${source.run.seed}:${floorNumber}:merchant:tile`),
		);
		objects.push({
			id: `floor:${floorNumber}:object:merchant:1`,
			kind: "merchant",
			floorNumber,
			coordinate: candidates[Math.floor(random() * candidates.length)],
			activated: false,
		});
	}
	return objects;
};
