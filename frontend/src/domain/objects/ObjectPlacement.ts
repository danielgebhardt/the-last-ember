import { selectPlayerStart } from "../dungeon/DungeonLocations";
import { type DungeonRun, hashStringToUint32 } from "../dungeon/DungeonRun";
import type { Coordinate } from "../dungeon/DungeonTypes";
import { createSeededRandom } from "../dungeon/Seed";
import { FLOOR } from "../dungeon/Tiles";
import type { FloorItem } from "../items/FloorItems";
import { availableItemLocations } from "../items/ItemPlacement";
import type { Monster } from "../monsters/Monster";
import {
	coordinateKey,
	protectedSpawnLocations,
} from "../monsters/MonsterLocations";
import { type DungeonObject, OBJECT_DEFINITIONS } from "./DungeonObject";
import { placeRareDiscovery } from "./RareDiscoveryPlacement";
export const spawnRunObjects = (
	run: DungeonRun,
	monsters: readonly Monster[],
	items: readonly FloorItem[],
): readonly DungeonObject[] => {
	const objects: DungeonObject[] = [];
	const definition = OBJECT_DEFINITIONS.door;
	for (const floor of run.floors) {
		if (
			floor.floorNumber < definition.minFloor ||
			floor.floorNumber > definition.maxFloor
		)
			continue;
		const forbidden = new Set(
			[
				...protectedSpawnLocations(run, floor.floorNumber),
				...(floor.floorNumber === 1
					? [
							run.activeFloor === 1
								? run.playerCoordinate
								: selectPlayerStart(floor),
						]
					: []),
			].map(coordinateKey),
		);
		for (const entity of [...monsters, ...items])
			if (entity.floorNumber === floor.floorNumber)
				forbidden.add(coordinateKey(entity.coordinate));
		const candidates: Coordinate[] = [];
		for (let row = 1; row < floor.terrain.length - 1; row++)
			for (let col = 1; col < floor.terrain[row].length - 1; col++) {
				if (
					floor.terrain[row][col] !== FLOOR ||
					forbidden.has(coordinateKey({ row, col })) ||
					floor.rooms.some(
						(room) =>
							row >= room.startRow &&
							row <= room.endRow &&
							col >= room.startCol &&
							col <= room.endCol,
					)
				)
					continue;
				const up = floor.terrain[row - 1][col] === FLOOR,
					down = floor.terrain[row + 1][col] === FLOOR,
					left = floor.terrain[row][col - 1] === FLOOR,
					right = floor.terrain[row][col + 1] === FLOOR;
				if ((up && down && !left && !right) || (left && right && !up && !down))
					candidates.push({ row, col });
			}
		for (
			let index = 1;
			index <= definition.maxPerFloor && candidates.length;
			index++
		) {
			const random = createSeededRandom(
				hashStringToUint32(
					`${run.seed}:${floor.floorNumber}:object:door:${index}:tile`,
				),
			);
			const [coordinate] = candidates.splice(
				Math.floor(random() * candidates.length),
				1,
			);
			objects.push({
				id: `floor:${floor.floorNumber}:object:door:${index}`,
				kind: "door",
				floorNumber: floor.floorNumber,
				coordinate,
				activated: false,
			});
		}
	}
	for (const [kind, definition] of Object.entries(OBJECT_DEFINITIONS)) {
		if (definition.placement !== "room") continue;
		for (const floor of run.floors) {
			// Preserve the existing per-floor seeded chance, but stop after the first successful reliquary.
			if (
				kind === "reliquary" &&
				objects.some((object) => object.kind === "reliquary")
			)
				break;
			if (
				floor.floorNumber < definition.minFloor ||
				floor.floorNumber > definition.maxFloor
			)
				continue;
			const candidates = availableItemLocations(run, floor, monsters, [
				...items,
				...objects,
			]);
			for (
				let index = 1;
				index <= definition.maxPerFloor && candidates.length;
				index++
			) {
				const namespace = `${run.seed}:${floor.floorNumber}:object:${kind}:${index}`;
				if (
					createSeededRandom(hashStringToUint32(`${namespace}:present`))() >=
					definition.chance
				)
					continue;
				const random = createSeededRandom(
					hashStringToUint32(`${namespace}:tile`),
				);
				const [coordinate] = candidates.splice(
					Math.floor(random() * candidates.length),
					1,
				);
				objects.push({
					id: `floor:${floor.floorNumber}:object:${kind}:${index}`,
					kind: kind as DungeonObject["kind"],
					floorNumber: floor.floorNumber,
					coordinate,
					activated: false,
				});
			}
		}
	}
	return [...objects, ...placeRareDiscovery(run, monsters, items, objects)];
};
