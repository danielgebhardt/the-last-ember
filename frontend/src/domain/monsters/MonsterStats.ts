import { type Difficulty, scaleEnemyValue } from "../game/Difficulty";
import { attackProfile, MONSTER_HIT_THRESHOLD } from "../game/MeleeRules";
import { MONSTER_DEFINITIONS, type Monster, type MonsterKind } from "./Monster";

// Floors past its first floor. Catalog values describe that first floor.
const depthBeyond = (kind: MonsterKind, floorNumber: number): number =>
	Math.max(
		0,
		Math.min(MONSTER_DEFINITIONS[kind].maxFloor, floorNumber) -
			MONSTER_DEFINITIONS[kind].minFloor,
	);
// Only the optional champion, the mimic, the minibosses and the brood grow with depth,
// so each stays a heroic fight on whichever floor it appears.
const DEPTH_GROWTH: Partial<
	Record<
		MonsterKind,
		Readonly<{
			health: (depth: number) => number;
			attack: (depth: number) => number;
		}>
	>
> = {
	"iron-champion": { health: (depth) => 6 * depth, attack: (depth) => depth },
	"treasure-mimic": {
		health: (depth) => 3 * depth,
		attack: (depth) => Math.round((depth * 3) / 4),
	},
	"pyre-lord": { health: (depth) => 8 * depth, attack: (depth) => depth },
	"iron-juggernaut": { health: (depth) => 9 * depth, attack: (depth) => depth },
	broodmother: { health: (depth) => 7 * depth, attack: (depth) => depth },
	// The brood grows with its mother's floor, so a deep hall's hatchlings still bite.
	spiderling: {
		health: (depth) => depth,
		attack: (depth) => Math.round(depth / 2),
	},
};
const healthGrowth = (kind: MonsterKind, floorNumber: number) =>
	DEPTH_GROWTH[kind]?.health(depthBeyond(kind, floorNumber)) ?? 0;
const attackGrowth = (kind: MonsterKind, floorNumber: number) =>
	DEPTH_GROWTH[kind]?.attack(depthBeyond(kind, floorNumber)) ?? 0;
export const monsterAttackDamage = (
	kind: MonsterKind,
	floorNumber = MONSTER_DEFINITIONS[kind].minFloor,
	heroic = false,
): number =>
	(MONSTER_DEFINITIONS[kind].attackDamage + attackGrowth(kind, floorNumber)) *
	(heroic ? 2 : 1);

// Base health before difficulty scaling.
const monsterBaseHealth = (
	kind: MonsterKind,
	floorNumber = MONSTER_DEFINITIONS[kind].minFloor,
	heroic = false,
): number =>
	(MONSTER_DEFINITIONS[kind].maxHealth + healthGrowth(kind, floorNumber)) *
	(heroic ? 2 : 1);
export const maximumMonsterHealth = (
	kind: MonsterKind,
	difficulty: Difficulty = 1,
	floorNumber = MONSTER_DEFINITIONS[kind].minFloor,
	heroic = false,
): number =>
	scaleEnemyValue(monsterBaseHealth(kind, floorNumber, heroic), difficulty);
export const monsterDamageRange = (
	kind: MonsterKind,
	difficulty: Difficulty = 1,
	floorNumber = MONSTER_DEFINITIONS[kind].minFloor,
	heroic = false,
) => {
	const raw = attackProfile(
		monsterAttackDamage(kind, floorNumber, heroic),
		MONSTER_HIT_THRESHOLD,
	);
	return {
		minDamage: scaleEnemyValue(raw.minDamage, difficulty),
		maxDamage: scaleEnemyValue(raw.maxDamage, difficulty),
	};
};

// An Hourglass of Ages raises a surviving monster's base health and attack once.
export const EMPOWERED_MULTIPLIER = 1.5;
const empowered = (value: number, monster: StatSource) =>
	monster.empowered ? Math.ceil(value * EMPOWERED_MULTIPLIER) : value;
// An actual monster's stats: a reflection uses its saved snapshot as base values,
// every other monster uses its kind; empowerment applies to either base, and
// difficulty scales the result once.
type StatSource = Pick<
	Monster,
	"kind" | "heroic" | "reflection" | "warden" | "empowered" | "statFloor"
> & {
	floorNumber?: number;
};
const statFloor = (monster: StatSource) =>
	monster.statFloor ?? monster.floorNumber;
export const actorAttackDamage = (monster: StatSource): number =>
	empowered(
		monster.reflection?.attackDamage ??
			monster.warden?.attackDamage ??
			monsterAttackDamage(monster.kind, statFloor(monster), monster.heroic),
		monster,
	);
export const actorMaximumHealth = (
	monster: StatSource,
	difficulty: Difficulty = 1,
): number =>
	scaleEnemyValue(
		empowered(
			monster.reflection?.maxHealth ??
				monster.warden?.maxHealth ??
				monsterBaseHealth(monster.kind, statFloor(monster), monster.heroic),
			monster,
		),
		difficulty,
	);
export const actorDamageRange = (
	monster: StatSource,
	difficulty: Difficulty = 1,
) => {
	const raw = attackProfile(actorAttackDamage(monster), MONSTER_HIT_THRESHOLD);
	return {
		minDamage: scaleEnemyValue(raw.minDamage, difficulty),
		maxDamage: scaleEnemyValue(raw.maxDamage, difficulty),
	};
};
