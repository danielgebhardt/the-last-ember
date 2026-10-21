import { type Difficulty, scaleEnemyValue } from "../game/Difficulty";
import { attackProfile, MONSTER_HIT_THRESHOLD } from "../game/MeleeRules";
import { MONSTER_DEFINITIONS, type Monster, type MonsterKind } from "./Monster";

const CHAMPION_HEALTH_PER_FLOOR = 6;

// Only the optional champion grows with depth. Catalog values describe floor 8.
const championDepth = (kind: MonsterKind, floorNumber: number): number =>
	kind === "iron-champion"
		? Math.max(
				0,
				Math.min(MONSTER_DEFINITIONS[kind].maxFloor, floorNumber) -
					MONSTER_DEFINITIONS[kind].minFloor,
			)
		: 0;
export const monsterAttackDamage = (
	kind: MonsterKind,
	floorNumber = MONSTER_DEFINITIONS[kind].minFloor,
	heroic = false,
): number =>
	(MONSTER_DEFINITIONS[kind].attackDamage + championDepth(kind, floorNumber)) *
	(heroic ? 2 : 1);

// Base health before difficulty scaling.
const monsterBaseHealth = (
	kind: MonsterKind,
	floorNumber = MONSTER_DEFINITIONS[kind].minFloor,
	heroic = false,
): number =>
	(MONSTER_DEFINITIONS[kind].maxHealth +
		CHAMPION_HEALTH_PER_FLOOR * championDepth(kind, floorNumber)) *
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
	"kind" | "heroic" | "reflection" | "warden" | "empowered"
> & {
	floorNumber?: number;
};
export const actorAttackDamage = (monster: StatSource): number =>
	empowered(
		monster.reflection?.attackDamage ??
			monster.warden?.attackDamage ??
			monsterAttackDamage(monster.kind, monster.floorNumber, monster.heroic),
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
				monsterBaseHealth(monster.kind, monster.floorNumber, monster.heroic),
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
