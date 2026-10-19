import { selectWeighted } from "../content/WeightedSelection";
import type { Coordinate } from "../dungeon/DungeonTypes.ts";
import { MAX_FLOORS } from "../dungeon/RunConfiguration";
import {
	AFFLICTION_DEFINITIONS,
	type AfflictionKind,
} from "../game/AfflictionDefinitions";
import {
	type AreaElement,
	DAMAGE_ELEMENTS,
	type DamageElement,
} from "../game/DamageElements";
import type { ItemKind } from "../items/Item";

export type EnemySpellKind = "ember-bolt" | "shock" | "heal";
export type MonsterKind = keyof typeof monsterCatalog;

export type MonsterIntent =
	| { type: "idle" }
	| { type: "preparing-alarm"; target: Coordinate }
	| { type: "preparing-charge"; target: Coordinate }
	| { type: "recovering-charge" }
	| { type: "preparing-attack"; target: Coordinate }
	| {
			type: "preparing-area";
			target: Coordinate;
			radius: 1 | 2;
			element: AreaElement;
			remaining: number;
	  };

export type MonsterAwareness =
	| { type: "idle" }
	| { type: "pursuing"; target: Coordinate; remaining: number; blocked: number }
	| { type: "searching"; target: Coordinate; remaining: number };

export type Monster = {
	// Stable identity: floorNumber:spawnIndex (index starts at 1).
	id: string;
	kind: MonsterKind;
	floorNumber: number;
	coordinate: Coordinate;
	health: number;
	intent: MonsterIntent;
	lastDamagedTurn?: number | null;
	awareness?: MonsterAwareness;
	alarmUsed?: boolean;
	heroic?: boolean;
	// The first affliction source of an adventure guarantees its matching remedy drop.
	remedyDrop?: boolean;
};

export type MonsterDefinition = {
	name: string;
	experienceReward: number;
	maxHealth: number;
	attackDamage: number;
	detectionRadius: number;
	minFloor: number;
	maxFloor: number;
	spawnWeight: number;
	dropChance: number;
	lootPreferences: Partial<Record<ItemKind, number>>;
	opensDoors?: boolean;
	alarmRadius?: number;
	stationary?: boolean;
	chargeRange?: number;
	rangedAttackRange?: number;
	preparesAttack?: boolean;
	// Disabled content can be exercised in encounters before seeded rollout.
	spawnEnabled?: boolean;
	actionInterval?: number;
	onHitCondition?: "poisoned";
	// Rolled once per landed melee hit; magic resistance does not resist afflictions.
	onHitAffliction?: { kind: AfflictionKind; chance: number };
	// Spawned only through the shared sparse affliction-source budget.
	afflictionSource?: boolean;
	regeneration?: number;
	enemySpells?: readonly EnemySpellKind[];
	spellInterval?: number;
	resists?: readonly DamageElement[];
	weaknesses?: readonly DamageElement[];
	areaAttack?: {
		element: AreaElement;
		range: number;
		radius: 1 | 2;
		minDamage: number;
		maxDamage: number;
	};
};
export const validateMonsterDefinition = (
	definition: MonsterDefinition,
): void => {
	const {
		experienceReward,
		dropChance,
		lootPreferences,
		minFloor,
		maxFloor,
		spawnWeight,
		maxHealth,
		attackDamage,
		detectionRadius,
		rangedAttackRange,
		spawnEnabled,
		preparesAttack,
		actionInterval,
		onHitCondition,
		onHitAffliction,
		afflictionSource,
		regeneration,
		enemySpells,
		spellInterval,
		resists,
		weaknesses,
		areaAttack,
	} = definition;
	if (
		(definition.opensDoors !== undefined &&
			typeof definition.opensDoors !== "boolean") ||
		(definition.stationary !== undefined &&
			typeof definition.stationary !== "boolean") ||
		(definition.alarmRadius !== undefined &&
			(!Number.isInteger(definition.alarmRadius) ||
				definition.alarmRadius < 1 ||
				definition.alarmRadius > 12 ||
				definition.chargeRange ||
				areaAttack ||
				enemySpells ||
				preparesAttack)) ||
		(definition.chargeRange !== undefined &&
			(!Number.isInteger(definition.chargeRange) ||
				definition.chargeRange < 2 ||
				definition.chargeRange > 8 ||
				preparesAttack ||
				areaAttack ||
				enemySpells)) ||
		(actionInterval !== undefined &&
			(!Number.isSafeInteger(actionInterval) || actionInterval < 1)) ||
		(onHitCondition !== undefined && onHitCondition !== "poisoned") ||
		(regeneration !== undefined &&
			(!Number.isSafeInteger(regeneration) || regeneration < 1)) ||
		(enemySpells !== undefined &&
			(!Array.isArray(enemySpells) ||
				!enemySpells.length ||
				enemySpells.some(
					(spell) => !["ember-bolt", "shock", "heal"].includes(spell),
				) ||
				new Set(enemySpells).size !== enemySpells.length ||
				rangedAttackRange === undefined ||
				preparesAttack)) ||
		(spellInterval !== undefined &&
			(!enemySpells ||
				!Number.isSafeInteger(spellInterval) ||
				spellInterval < 2)) ||
		(resists ?? []).some((element) => !DAMAGE_ELEMENTS.includes(element)) ||
		(weaknesses ?? []).some(
			(element) =>
				!DAMAGE_ELEMENTS.includes(element) || resists?.includes(element),
		) ||
		(areaAttack !== undefined &&
			(!(areaAttack.element === "fire" || areaAttack.element === "cold") ||
				!Number.isInteger(areaAttack.range) ||
				areaAttack.range < 2 ||
				![1, 2].includes(areaAttack.radius) ||
				!Number.isInteger(areaAttack.minDamage) ||
				areaAttack.minDamage < 1 ||
				!Number.isInteger(areaAttack.maxDamage) ||
				areaAttack.maxDamage < areaAttack.minDamage ||
				preparesAttack ||
				enemySpells !== undefined)) ||
		!Number.isSafeInteger(experienceReward) ||
		experienceReward <= 0 ||
		!Number.isFinite(dropChance) ||
		dropChance < 0 ||
		dropChance > 1 ||
		Object.values(lootPreferences).some(
			(weight) => !Number.isFinite(weight) || weight < 0,
		) ||
		!Number.isInteger(minFloor) ||
		!Number.isInteger(maxFloor) ||
		minFloor < 1 ||
		maxFloor > MAX_FLOORS ||
		minFloor > maxFloor ||
		!Number.isFinite(spawnWeight) ||
		spawnWeight <= 0 ||
		!Number.isInteger(maxHealth) ||
		maxHealth < 1 ||
		!Number.isInteger(attackDamage) ||
		attackDamage < 1 ||
		!Number.isInteger(detectionRadius) ||
		detectionRadius < 0 ||
		(rangedAttackRange !== undefined &&
			(!Number.isSafeInteger(rangedAttackRange) || rangedAttackRange < 2)) ||
		(spawnEnabled !== undefined && typeof spawnEnabled !== "boolean") ||
		(preparesAttack !== undefined && typeof preparesAttack !== "boolean") ||
		(preparesAttack === true && rangedAttackRange !== undefined) ||
		(onHitAffliction !== undefined &&
			(!Object.hasOwn(AFFLICTION_DEFINITIONS, onHitAffliction.kind) ||
				!Number.isFinite(onHitAffliction.chance) ||
				onHitAffliction.chance <= 0 ||
				onHitAffliction.chance > 1 ||
				onHitCondition !== undefined ||
				rangedAttackRange !== undefined)) ||
		(afflictionSource !== undefined &&
			(afflictionSource !== true || !onHitAffliction || spawnEnabled !== false))
	)
		throw new RangeError(
			"Invalid monster stats, floor range, or spawn weight.",
		);
};
const monsterCatalog = {
	"iron-champion": {
		name: "iron champion",
		minFloor: 8,
		maxFloor: 20,
		maxHealth: 72,
		attackDamage: 18,
		experienceReward: 24,
		detectionRadius: 8,
		spawnWeight: 1,
		spawnEnabled: false,
		dropChance: 1,
		lootPreferences: {},
		chargeRange: 4,
		resists: ["arcane"],
		weaknesses: ["cold"],
	},
	"alarm-sentry": {
		name: "alarm sentry",
		minFloor: 3,
		maxFloor: 20,
		maxHealth: 8,
		attackDamage: 2,
		experienceReward: 8,
		detectionRadius: 7,
		spawnWeight: 0.5,
		dropChance: 0.3,
		lootPreferences: {},
		alarmRadius: 8,
		stationary: true,
	},
	"horned-charger": {
		name: "horned charger",
		minFloor: 5,
		maxFloor: 20,
		maxHealth: 14,
		attackDamage: 5,
		experienceReward: 10,
		detectionRadius: 7,
		spawnWeight: 1,
		dropChance: 0.35,
		lootPreferences: {},
		chargeRange: 4,
	},
	goblin: {
		name: "goblin",
		experienceReward: 5,
		maxHealth: 4,
		attackDamage: 1,
		detectionRadius: 6,
		minFloor: 1,
		maxFloor: 5,
		spawnWeight: 3,
		dropChance: 0.5,
		lootPreferences: { "short-sword": 2, "wooden-shield": 2 },
	},
	"giant-rat": {
		name: "giant rat",
		experienceReward: 2,
		maxHealth: 2,
		attackDamage: 1,
		detectionRadius: 5,
		minFloor: 1,
		maxFloor: 4,
		spawnWeight: 2,
		dropChance: 0.35,
		lootPreferences: {},
	},
	"plague-rat": {
		name: "plague rat",
		experienceReward: 3,
		maxHealth: 4,
		attackDamage: 1,
		detectionRadius: 5,
		minFloor: 2,
		maxFloor: 6,
		spawnWeight: 1,
		spawnEnabled: false,
		afflictionSource: true,
		onHitAffliction: { kind: "disease", chance: 0.2 },
		dropChance: 0.35,
		lootPreferences: {},
	},
	orc: {
		opensDoors: true,
		name: "orc",
		experienceReward: 10,
		maxHealth: 7,
		attackDamage: 4,
		detectionRadius: 6,
		minFloor: 3,
		maxFloor: 10,
		spawnWeight: 2,
		dropChance: 0.7,
		lootPreferences: { "chain-armor": 2, "iron-helmet": 2 },
	},
	"goblin-archer": {
		name: "goblin archer",
		experienceReward: 6,
		maxHealth: 5,
		attackDamage: 2,
		detectionRadius: 6,
		rangedAttackRange: 4,
		minFloor: 2,
		maxFloor: 10,
		spawnWeight: 1,
		dropChance: 0.5,
		lootPreferences: { "short-sword": 2, "wooden-shield": 2 },
	},
	"dungeon-brute": {
		name: "dungeon brute",
		experienceReward: 12,
		maxHealth: 10,
		attackDamage: 5,
		detectionRadius: 6,
		preparesAttack: true,
		minFloor: 4,
		maxFloor: 12,
		spawnWeight: 1,
		dropChance: 0.7,
		lootPreferences: { "chain-armor": 2, "iron-helmet": 2 },
	},
	skeleton: {
		resists: ["poison"],
		name: "skeleton",
		minFloor: 2,
		maxFloor: 8,
		maxHealth: 8,
		attackDamage: 4,
		experienceReward: 8,
		detectionRadius: 6,
		spawnWeight: 2,
		dropChance: 0.45,
		lootPreferences: {},
	},
	zombie: {
		name: "zombie",
		minFloor: 3,
		maxFloor: 10,
		maxHealth: 12,
		attackDamage: 5,
		experienceReward: 10,
		detectionRadius: 5,
		spawnWeight: 2,
		dropChance: 0.45,
		lootPreferences: {},
		actionInterval: 2,
	},
	wolf: {
		name: "wolf",
		minFloor: 2,
		maxFloor: 9,
		maxHealth: 9,
		attackDamage: 4,
		experienceReward: 8,
		detectionRadius: 8,
		spawnWeight: 1,
		dropChance: 0.45,
		lootPreferences: {},
	},
	"kobold-slinger": {
		name: "kobold slinger",
		minFloor: 3,
		maxFloor: 10,
		maxHealth: 7,
		attackDamage: 3,
		experienceReward: 8,
		detectionRadius: 7,
		spawnWeight: 1,
		dropChance: 0.45,
		lootPreferences: {},
		rangedAttackRange: 4,
	},
	spider: {
		name: "giant spider",
		minFloor: 3,
		maxFloor: 12,
		maxHealth: 8,
		attackDamage: 3,
		experienceReward: 8,
		detectionRadius: 6,
		spawnWeight: 1,
		dropChance: 0.45,
		onHitCondition: "poisoned",
		lootPreferences: {},
	},
	ogre: {
		name: "ogre",
		minFloor: 7,
		maxFloor: 15,
		maxHealth: 20,
		attackDamage: 8,
		experienceReward: 18,
		detectionRadius: 7,
		spawnWeight: 2,
		dropChance: 0.55,
		lootPreferences: {},
		preparesAttack: true,
	},
	troll: {
		name: "troll",
		minFloor: 8,
		maxFloor: 17,
		maxHealth: 22,
		attackDamage: 7,
		experienceReward: 20,
		detectionRadius: 7,
		spawnWeight: 2,
		dropChance: 0.55,
		regeneration: 2,
		lootPreferences: {},
	},
	cultist: {
		opensDoors: true,
		name: "cultist",
		minFloor: 7,
		maxFloor: 18,
		maxHealth: 16,
		attackDamage: 6,
		experienceReward: 18,
		detectionRadius: 8,
		spawnWeight: 1,
		dropChance: 0.55,
		lootPreferences: {},
		rangedAttackRange: 5,
		enemySpells: ["ember-bolt", "heal"],
		spellInterval: 3,
	},
	"stone-golem": {
		resists: ["physical", "poison"],
		weaknesses: ["lightning"],
		name: "stone golem",
		minFloor: 10,
		maxFloor: 20,
		maxHealth: 26,
		attackDamage: 9,
		experienceReward: 24,
		detectionRadius: 6,
		spawnWeight: 1,
		dropChance: 0.55,
		lootPreferences: {},
		preparesAttack: true,
		actionInterval: 2,
	},
	wraith: {
		resists: ["physical"],
		weaknesses: ["sonic"],
		name: "wraith",
		minFloor: 10,
		maxFloor: 20,
		maxHealth: 18,
		attackDamage: 8,
		experienceReward: 22,
		detectionRadius: 8,
		spawnWeight: 1,
		dropChance: 0.55,
		lootPreferences: {},
	},
	wyvern: {
		name: "wyvern",
		minFloor: 12,
		maxFloor: 20,
		maxHealth: 28,
		attackDamage: 11,
		experienceReward: 30,
		detectionRadius: 9,
		spawnWeight: 1,
		dropChance: 0.7,
		lootPreferences: {},
		onHitCondition: "poisoned",
	},
	salamander: {
		name: "salamander",
		resists: ["fire"],
		weaknesses: ["cold"],
		areaAttack: {
			element: "fire",
			range: 5,
			radius: 1,
			minDamage: 6,
			maxDamage: 10,
		},
		minFloor: 12,
		maxFloor: 19,
		maxHealth: 24,
		attackDamage: 9,
		experienceReward: 32,
		detectionRadius: 8,
		spawnWeight: 1,
		dropChance: 0.7,
		lootPreferences: {},
	},
	"frost-giant": {
		name: "frost giant",
		minFloor: 14,
		maxFloor: 20,
		maxHealth: 36,
		attackDamage: 16,
		experienceReward: 42,
		detectionRadius: 8,
		spawnWeight: 1,
		dropChance: 0.7,
		lootPreferences: {},
		resists: ["cold"],
		weaknesses: ["fire"],
		areaAttack: {
			element: "cold",
			range: 2,
			radius: 1,
			minDamage: 8,
			maxDamage: 12,
		},
	},
	necromancer: {
		opensDoors: true,
		resists: ["shadow"],
		name: "necromancer",
		minFloor: 15,
		maxFloor: 20,
		maxHealth: 28,
		attackDamage: 12,
		experienceReward: 36,
		detectionRadius: 9,
		spawnWeight: 1,
		dropChance: 0.7,
		lootPreferences: {},
		rangedAttackRange: 6,
		enemySpells: ["shock", "heal"],
		spellInterval: 3,
	},
	"demon-warden": {
		resists: ["arcane", "shadow"],
		name: "demon warden",
		minFloor: 17,
		maxFloor: 20,
		maxHealth: 40,
		attackDamage: 18,
		experienceReward: 48,
		detectionRadius: 10,
		spawnWeight: 1,
		dropChance: 0.7,
		lootPreferences: {},
		preparesAttack: true,
	},
} satisfies Record<string, MonsterDefinition>;
export const MONSTER_DEFINITIONS: Record<MonsterKind, MonsterDefinition> =
	monsterCatalog;
for (const definition of Object.values(MONSTER_DEFINITIONS))
	validateMonsterDefinition(definition);
export const eligibleMonsterKinds = (floor: number): MonsterKind[] =>
	(Object.keys(MONSTER_DEFINITIONS) as MonsterKind[]).filter((kind) => {
		const definition = MONSTER_DEFINITIONS[kind];
		return (
			definition.spawnEnabled !== false &&
			floor >= definition.minFloor &&
			floor <= definition.maxFloor
		);
	});

export const selectMonsterKind = (
	floor: number,
	random: () => number,
): MonsterKind | undefined =>
	selectWeighted(
		eligibleMonsterKinds(floor).map((kind) => ({
			value: kind,
			weight: MONSTER_DEFINITIONS[kind].spawnWeight,
		})),
		random,
	);
