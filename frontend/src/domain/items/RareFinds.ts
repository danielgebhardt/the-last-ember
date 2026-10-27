import { selectWeighted } from "../content/WeightedSelection";
import { type DungeonRun, hashStringToUint32 } from "../dungeon/DungeonRun";
import { createSeededRandom } from "../dungeon/Seed";
import type { Monster } from "../monsters/Monster";
import type { DungeonObject } from "../objects/DungeonObject";
import type { FloorItem } from "./FloorItems";
import {
	ITEM_DEFINITIONS,
	RARE_EQUIPMENT_KINDS,
	type RareEquipmentKind,
} from "./Item";
import { availableItemLocations } from "./ItemPlacement";

// New adventures split the floors that can hold rare equipment into thirds; each third
// rolls once to hide one rare piece, so at least one appears in about 58% of runs and
// up to three in a lucky one. Every rare also has one finite copy in the town stores.
export const RARE_FIND_CHANCE = 0.25;
export const RARE_FIND_BANDS = 3;
const firstRareFloor = () =>
	Math.min(
		...RARE_EQUIPMENT_KINDS.map((kind) => ITEM_DEFINITIONS[kind].minFloor),
	);

export type RareFind = Readonly<{
	kind: RareEquipmentKind;
	minFloor: number;
	maxFloor: number;
}>;
export const rareFindId = (kind: RareEquipmentKind) => `rare-find:${kind}`;

// Contiguous, nearly equal thirds of the eligible floors; short dungeons may leave some empty.
export const rareFindBands = (
	floorCount: number,
): readonly (readonly [number, number])[] => {
	const first = firstRareFloor();
	const span = floorCount - first + 1;
	if (span <= 0) return [];
	return Array.from({ length: RARE_FIND_BANDS }, (_, band) => {
		const start = first + Math.floor((band * span) / RARE_FIND_BANDS);
		const end = first + Math.floor(((band + 1) * span) / RARE_FIND_BANDS) - 1;
		return [start, end] as const;
	}).filter(([start, end]) => start <= end);
};

// Fixed by seed and depth alone, so saves can check which kinds a run may hold. Each third
// picks a kind no earlier third took, among those that can appear on its floors.
export const selectRunRareFinds = (
	seed: number,
	floorCount: number,
	guaranteed = false,
): readonly RareFind[] => {
	if (guaranteed) {
		const normal = selectRunRareFinds(seed, floorCount);
		if (normal.length) return normal;
	}
	const finds: RareFind[] = [];
	rareFindBands(floorCount).forEach(([start, end], band) => {
		const random = createSeededRandom(
			hashStringToUint32(`${seed}:rare-find:${band}`),
		);
		if (random() >= RARE_FIND_CHANCE && !guaranteed) return;
		const kind = selectWeighted(
			RARE_EQUIPMENT_KINDS.filter(
				(kind) =>
					ITEM_DEFINITIONS[kind].minFloor <= end &&
					ITEM_DEFINITIONS[kind].maxFloor >= start &&
					!finds.some((find) => find.kind === kind),
			).map((value) => ({ value, weight: 1 })),
			random,
		);
		if (kind)
			finds.push({
				kind,
				minFloor: Math.max(start, ITEM_DEFINITIONS[kind].minFloor),
				maxFloor: Math.min(end, ITEM_DEFINITIONS[kind].maxFloor),
			});
	});
	return finds;
};

// Each selected find lies on a free room tile somewhere in its third, or is omitted when
// none is free.
export const placeRunRareFinds = (
	run: DungeonRun,
	monsters: readonly Monster[],
	items: readonly FloorItem[],
	objects: readonly DungeonObject[],
	guaranteed = false,
): readonly FloorItem[] => {
	const placed: FloorItem[] = [];
	for (const find of selectRunRareFinds(
		run.seed,
		run.floors.length,
		guaranteed,
	)) {
		const candidates = run.floors
			.filter(
				(floor) =>
					floor.rooms.length > 0 &&
					floor.floorNumber >= find.minFloor &&
					floor.floorNumber <= find.maxFloor,
			)
			.flatMap((floor) =>
				availableItemLocations(run, floor, monsters, [
					...items,
					...placed,
					...objects,
				])
					.filter(
						(p) =>
							!(
								run.activeFloor === floor.floorNumber &&
								p.row === run.playerCoordinate.row &&
								p.col === run.playerCoordinate.col
							),
					)
					.map((coordinate) => ({
						floorNumber: floor.floorNumber,
						coordinate,
					})),
			);
		if (!candidates.length) continue;
		const location =
			candidates[
				Math.floor(
					createSeededRandom(
						hashStringToUint32(`${run.seed}:rare-find:${find.kind}:placement`),
					)() * candidates.length,
				)
			];
		placed.push({
			...location,
			item: { id: rareFindId(find.kind), kind: find.kind },
		});
	}
	return placed;
};
