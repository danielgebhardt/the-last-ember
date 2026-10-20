import { selectPlayerStart } from "../dungeon/DungeonLocations";
import { type DungeonRun, hashStringToUint32 } from "../dungeon/DungeonRun";
import type { Coordinate } from "../dungeon/DungeonTypes";
import { createSeededRandom } from "../dungeon/Seed";
import { FLOOR } from "../dungeon/Tiles";
import {
	MONSTER_DEFINITIONS,
	type Monster,
	type MonsterKind,
	monsterAffliction,
	selectMonsterKind,
} from "./Monster";
import {
	orthogonalDistance,
	protectedSpawnLocations,
} from "./MonsterLocations";

export const MONSTER_DENSITY = {
	min: 2,
	max: 12,
	safeTilesPerMonster: 30,
} as const;
export const monsterCountForSpace = (space: number): number => {
	if (!Number.isInteger(space) || space < 0)
		throw new RangeError("Safe space must be a nonnegative whole number.");
	return Math.min(
		space,
		MONSTER_DENSITY.max,
		Math.max(
			MONSTER_DENSITY.min,
			Math.ceil(space / MONSTER_DENSITY.safeTilesPerMonster),
		),
	);
};

// Shared sparse budget: at most one affliction carrier per eligible floor, replacing an
// ordinary spawn. Its own seed stream leaves ordinary placement and kinds unchanged.
export const AFFLICTION_SOURCE_CHANCE = 0.25;
const AFFLICTION_SOURCE_KINDS = (
	Object.keys(MONSTER_DEFINITIONS) as MonsterKind[]
).filter((kind) => MONSTER_DEFINITIONS[kind].afflictionSource);
export const afflictionSourceKinds = (floor: number): readonly MonsterKind[] =>
	AFFLICTION_SOURCE_KINDS.filter(
		(kind) =>
			floor >= MONSTER_DEFINITIONS[kind].minFloor &&
			floor <= MONSTER_DEFINITIONS[kind].maxFloor,
	);
const assignAfflictionSource = (
	seed: number,
	floorNumber: number,
	floorMonsters: Monster[],
	remedyDrop: boolean,
): boolean => {
	const kinds = afflictionSourceKinds(floorNumber);
	if (!kinds.length || !floorMonsters.length) return false;
	const random = createSeededRandom(
		hashStringToUint32(`${seed}:${floorNumber}:affliction-source`),
	);
	if (random() >= AFFLICTION_SOURCE_CHANCE) return false;
	const kind = kinds[Math.floor(random() * kinds.length)];
	// Spawn slots are randomly placed; choosing among the guaranteed minimum keeps the slot
	// independent of floor size, so larger populations preserve their seeded prefix.
	const index = Math.floor(random() * MONSTER_DENSITY.min);
	if (index >= floorMonsters.length) return false;
	floorMonsters[index] = {
		...floorMonsters[index],
		kind,
		health: MONSTER_DEFINITIONS[kind].maxHealth,
		...(remedyDrop ? { remedyDrop: true } : {}),
	};
	return true;
};

export const spawnRunMonsters = (
	run: DungeonRun,
	count?: number,
): readonly Monster[] => {
	if (count !== undefined && (!Number.isInteger(count) || count < 0))
		throw new RangeError("Monster count must be a nonnegative whole number");
	if (count === 0) return [];
	const monsters: Monster[] = [];
	let remedyAssigned = false;
	for (const floor of [...run.floors].sort(
		(a, b) => a.floorNumber - b.floorNumber,
	)) {
		const floorMonsters: Monster[] = [];
		const protectedLocations = protectedSpawnLocations(run, floor.floorNumber);
		if (floor.floorNumber === 1)
			protectedLocations.push(
				run.activeFloor === 1 ? run.playerCoordinate : selectPlayerStart(floor),
			);
		const candidates: Coordinate[] = [];
		for (const [row, tiles] of floor.terrain.entries()) {
			for (const [col, tile] of tiles.entries()) {
				const coordinate = { row, col };
				if (
					tile === FLOOR &&
					!protectedLocations.some(
						(point) => orthogonalDistance(point, coordinate) <= 1,
					)
				)
					candidates.push(coordinate);
			}
		}
		const floorCount = count ?? monsterCountForSpace(candidates.length);
		for (let index = 1; index <= floorCount && candidates.length > 0; index++) {
			const random = createSeededRandom(
				hashStringToUint32(
					`${run.seed}:${floor.floorNumber}:monsters:${index}`,
				),
			);
			const [coordinate] = candidates.splice(
				Math.floor(random() * candidates.length),
				1,
			);
			const kind = selectMonsterKind(
				floor.floorNumber,
				createSeededRandom(
					hashStringToUint32(
						`${run.seed}:${floor.floorNumber}:monster-kinds:${index}`,
					),
				),
			);
			if (!kind) break;
			floorMonsters.push({
				id: `${floor.floorNumber}:${index}`,
				kind,
				floorNumber: floor.floorNumber,
				coordinate,
				health: MONSTER_DEFINITIONS[kind].maxHealth,
				intent: { type: "idle" },
				lastDamagedTurn: null,
			});
		}
		if (
			assignAfflictionSource(
				run.seed,
				floor.floorNumber,
				floorMonsters,
				!remedyAssigned,
			)
		)
			remedyAssigned = true;
		monsters.push(...floorMonsters);
	}
	return monsters;
};

// Initial availability protection: the shallowest source of each affliction (lowest floor,
// then spawn index) guarantees its remedy. Applied once at adventure creation and saved.
export const markFirstRemedySources = (
	monsters: readonly Monster[],
): readonly Monster[] => {
	const first = new Map<string, Monster>();
	for (const monster of [...monsters].sort(
		(a, b) =>
			a.floorNumber - b.floorNumber ||
			Number(a.id.split(":")[1]) - Number(b.id.split(":")[1]),
	)) {
		const affliction = monsterAffliction(monster.kind);
		if (!affliction || monster.heroic) continue;
		const marked = first.get(affliction);
		if (!marked || (monster.remedyDrop && !marked.remedyDrop))
			first.set(affliction, monster);
	}
	const chosen = new Set([...first.values()].map((m) => m.id));
	return monsters.map((m) =>
		chosen.has(m.id) && !m.remedyDrop ? { ...m, remedyDrop: true } : m,
	);
};
