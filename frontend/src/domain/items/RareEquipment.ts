import { selectWeighted } from "../content/WeightedSelection";
import { type DungeonRun, hashStringToUint32 } from "../dungeon/DungeonRun";
import type { Coordinate } from "../dungeon/DungeonTypes";
import { createSeededRandom } from "../dungeon/Seed";
import type { Monster } from "../monsters/Monster";
import type { DungeonObject } from "../objects/DungeonObject";
import type { FloorItem } from "./FloorItems";
import { ITEM_DEFINITIONS } from "./Item";
import { availableItemLocations } from "./ItemPlacement";

export const RARE_EQUIPMENT_CHANCE = 0.2;
// The kinds that original selection drew from. Frozen, so adding a rare never changes
// what an older save's seed selected.
export const LEGACY_RARE_KINDS = [
	"warding-cloak",
	"spellguard-shield",
] as const;
type LegacyRareKind = (typeof LEGACY_RARE_KINDS)[number];
type Selection = Readonly<{
	kind: LegacyRareKind;
	source: "town" | "dungeon";
}>;
export type RareEquipmentAllocation = Selection &
	Readonly<{ acquired: boolean }> &
	(
		| Readonly<{ source: "town" }>
		| Readonly<{
				source: "dungeon";
				floorNumber: number;
				coordinate: Coordinate;
		  }>
	);
// The original single selection, kept to validate older saves that hold its allocation.
// New adventures use RareFinds instead; town stock is universal and independent of both.
export const selectRunRareEquipment = (
	seed: number,
	floorCount: number,
): Selection | undefined => {
	const random = createSeededRandom(
		hashStringToUint32(`${seed}:rare-equipment:selection`),
	);
	if (random() >= RARE_EQUIPMENT_CHANCE) return undefined;
	const kind = selectWeighted(
		LEGACY_RARE_KINDS.filter(
			(kind) => ITEM_DEFINITIONS[kind].minFloor <= floorCount,
		).map((value) => ({ value, weight: 1 })),
		random,
	);
	return kind
		? { kind, source: random() < 0.5 ? "dungeon" : "town" }
		: undefined;
};
export const rareEquipmentId = (
	allocation: Pick<RareEquipmentAllocation, "kind" | "source">,
): string =>
	allocation.source === "town"
		? `town-gear:armor:${allocation.kind}:0:1`
		: `rare-gear:${allocation.kind}:1`;
export const allocateRunRareEquipment = (
	run: DungeonRun,
	monsters: readonly Monster[],
	items: readonly FloorItem[],
	objects: readonly DungeonObject[],
): {
	allocation: RareEquipmentAllocation | null;
	items: readonly FloorItem[];
} => {
	const selection = selectRunRareEquipment(run.seed, run.floors.length);
	if (!selection) return { allocation: null, items: [] };
	// Keep the original source draw: only the existing dungeon-selected seeds mint loot.
	if (selection.source === "town") return { allocation: null, items: [] };
	const definition = ITEM_DEFINITIONS[selection.kind];
	const candidates = run.floors
		.filter(
			(f) =>
				f.rooms.length > 0 &&
				f.floorNumber >= definition.minFloor &&
				f.floorNumber <= definition.maxFloor,
		)
		.flatMap((f) =>
			availableItemLocations(run, f, monsters, [...items, ...objects])
				.filter(
					(p) =>
						!(
							run.activeFloor === f.floorNumber &&
							p.row === run.playerCoordinate.row &&
							p.col === run.playerCoordinate.col
						),
				)
				.map((coordinate) => ({ floorNumber: f.floorNumber, coordinate })),
		);
	if (!candidates.length) return { allocation: null, items: [] };
	const random = createSeededRandom(
		hashStringToUint32(`${run.seed}:rare-equipment:placement`),
	);
	const location = candidates[Math.floor(random() * candidates.length)];
	const allocation: RareEquipmentAllocation = {
		kind: selection.kind,
		source: "dungeon",
		acquired: false,
		...location,
	};
	return {
		allocation,
		items: [
			{
				...location,
				item: { id: rareEquipmentId(allocation), kind: allocation.kind },
			},
		],
	};
};
