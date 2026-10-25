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
import type { TelegraphCooldown } from "./MonsterTelegraphs";

export type EnemySpellKind = "ember-bolt" | "shock" | "heal";
export type MonsterKind = keyof typeof monsterCatalog;

export type MonsterIntent =
	| { type: "idle" }
	| { type: "preparing-alarm"; target: Coordinate }
	| { type: "preparing-charge"; target: Coordinate }
	| { type: "recovering-charge" }
	| { type: "preparing-attack"; target: Coordinate }
	| { type: "preparing-web"; target: Coordinate }
	| { type: "preparing-hex"; target: Coordinate }
	| { type: "preparing-blind"; target: Coordinate }
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
	// A sounded alarm sentry's reinforcements: how many it has called and when it last did.
	summons?: Readonly<{ count: number; turn: number }>;
	// The sentry that called this reinforcement; it gives no XP, loot or gold.
	summonedBy?: string;
	// Survived an Hourglass of Ages: ×1.5 base health and attack, never compounded.
	empowered?: true;
	// The Ember Warden's stats, fixed by dungeon depth when generated, so following you
	// to shallower floors never weakens it; plus whether it has woken or been enraged.
	warden?: Readonly<{
		maxHealth: number;
		attackDamage: number;
		depth: number;
		awake?: true;
		enraged?: true;
	}>;
	// A mirror reflection's stats, copied from the player when it was summoned.
	reflection?: Readonly<{ maxHealth: number; attackDamage: number }>;
	// A treasure thief's haul and the turn it stole it; it then flees until it escapes.
	theft?: Readonly<{ gold: number; turn: number }>;
	// An arena miniboss in its second phase, reached at half health.
	minibossPhase?: 2;
	// Test seed only, never saved: fights with the strength of a deeper floor.
	statFloor?: number;
	// Turn each cooldown telegraph last resolved; another needs more than its cooldown.
	telegraphTurn?: Partial<Record<TelegraphCooldown, number>>;
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
	// Mana burned by every landed melee hit, rolled uniformly between min and max.
	onHitManaDrain?: { min: number; max: number };
	// Telegraphed tile web that applies Slowed instead of that phase's attack.
	webAttack?: { range: number; cooldown: number };
	// Telegraphed ranged hex: prepared in sight, resolved next action if still in sight and
	// range. Base arcane damage (magic resistance applies) plus Curse.
	hexAttack?: { range: number; cooldown: number; damage: number };
	// Telegraphed adjacent strike: marks your tile, then makes a normal melee roll
	// next action if you stayed. A landed hit deals normal damage and Blinded.
	blindingStrike?: { cooldown: number };
	// Unprepared shadow bolt while it sees you within range: damage (magic
	// resistance applies) and Soul Drain. Between bolts it fights normally.
	soulBolt?: { range: number; cooldown: number; damage: number };
	// Spawned only through the shared sparse affliction-source budget.
	afflictionSource?: boolean;
	// Never attacks: a telegraphed theft of carried gold, then flight. Placed by its own budget.
	thief?: true;
	// Only an arena's miniboss; it changes phase at half health.
	miniboss?: true;
	// A charge that runs on past its mark until something stops it; a wall stuns it.
	overrun?: true;
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
		// Phases between breaths; with one, a breather may also prepare heavy attacks.
		cooldown?: number;
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
		onHitManaDrain,
		afflictionSource,
		thief,
		webAttack,
		hexAttack,
		blindingStrike,
		soulBolt,
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
				(areaAttack.cooldown !== undefined &&
					(!Number.isSafeInteger(areaAttack.cooldown) ||
						areaAttack.cooldown < 3)) ||
				(preparesAttack && areaAttack.cooldown === undefined) ||
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
		(webAttack !== undefined &&
			(!Number.isSafeInteger(webAttack.range) ||
				webAttack.range < 1 ||
				webAttack.range > 6 ||
				!Number.isSafeInteger(webAttack.cooldown) ||
				webAttack.cooldown < 3 ||
				preparesAttack ||
				definition.chargeRange !== undefined ||
				areaAttack ||
				enemySpells)) ||
		(hexAttack !== undefined &&
			(!Number.isSafeInteger(hexAttack.range) ||
				hexAttack.range < 2 ||
				hexAttack.range > 8 ||
				!Number.isSafeInteger(hexAttack.cooldown) ||
				hexAttack.cooldown < 3 ||
				!Number.isSafeInteger(hexAttack.damage) ||
				hexAttack.damage < 0 ||
				webAttack !== undefined ||
				onHitAffliction !== undefined ||
				rangedAttackRange !== undefined)) ||
		(onHitManaDrain !== undefined &&
			(!Number.isSafeInteger(onHitManaDrain.min) ||
				!Number.isSafeInteger(onHitManaDrain.max) ||
				onHitManaDrain.min < 1 ||
				onHitManaDrain.max < onHitManaDrain.min ||
				rangedAttackRange !== undefined)) ||
		(blindingStrike !== undefined &&
			(!Number.isSafeInteger(blindingStrike.cooldown) ||
				blindingStrike.cooldown < 3 ||
				preparesAttack ||
				webAttack !== undefined ||
				hexAttack !== undefined ||
				onHitAffliction !== undefined ||
				rangedAttackRange !== undefined)) ||
		(soulBolt !== undefined &&
			(!Number.isSafeInteger(soulBolt.range) ||
				soulBolt.range < 2 ||
				soulBolt.range > 8 ||
				!Number.isSafeInteger(soulBolt.cooldown) ||
				soulBolt.cooldown < 3 ||
				!Number.isSafeInteger(soulBolt.damage) ||
				soulBolt.damage < 1 ||
				hexAttack !== undefined ||
				onHitAffliction !== undefined ||
				rangedAttackRange !== undefined ||
				enemySpells !== undefined)) ||
		(thief !== undefined &&
			(thief !== true ||
				spawnEnabled !== false ||
				preparesAttack ||
				rangedAttackRange !== undefined ||
				definition.chargeRange !== undefined ||
				definition.alarmRadius !== undefined ||
				areaAttack ||
				enemySpells ||
				webAttack ||
				hexAttack ||
				blindingStrike ||
				soulBolt ||
				onHitAffliction)) ||
		(afflictionSource !== undefined &&
			(afflictionSource !== true ||
				(!onHitAffliction && !hexAttack && !blindingStrike && !soulBolt) ||
				spawnEnabled !== false))
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
	// Arena minibosses grow with depth from these floor-6 values; see MonsterStats.
	"pyre-lord": {
		name: "Pyre Lord",
		minFloor: 6,
		maxFloor: 12,
		maxHealth: 80,
		attackDamage: 10,
		experienceReward: 120,
		detectionRadius: 12,
		spawnWeight: 1,
		spawnEnabled: false,
		dropChance: 0,
		lootPreferences: {},
		resists: ["fire"],
		weaknesses: ["cold"],
		miniboss: true,
		// Pillars block his line of fire.
		areaAttack: {
			element: "fire",
			range: 9,
			radius: 2,
			minDamage: 5,
			maxDamage: 10,
			cooldown: 3,
		},
	},
	"iron-juggernaut": {
		name: "Iron Juggernaut",
		minFloor: 6,
		maxFloor: 12,
		maxHealth: 90,
		attackDamage: 14,
		experienceReward: 120,
		detectionRadius: 12,
		spawnWeight: 1,
		spawnEnabled: false,
		dropChance: 0,
		lootPreferences: {},
		resists: ["arcane"],
		miniboss: true,
		chargeRange: 8,
		overrun: true,
	},
	"treasure-thief": {
		name: "treasure thief",
		minFloor: 3,
		maxFloor: 20,
		maxHealth: 12,
		// Never used: a thief steals instead of attacking.
		attackDamage: 1,
		experienceReward: 12,
		detectionRadius: 8,
		spawnWeight: 1,
		spawnEnabled: false,
		dropChance: 1,
		lootPreferences: {},
		thief: true,
	},
	"treasure-mimic": {
		name: "treasure mimic",
		minFloor: 4,
		maxFloor: 20,
		// Grows with depth from these floor-4 values; see MonsterStats.
		maxHealth: 20,
		attackDamage: 4,
		experienceReward: 24,
		detectionRadius: 6,
		spawnWeight: 1,
		// Only ever a chest that bites back.
		spawnEnabled: false,
		dropChance: 1,
		lootPreferences: {},
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
	// Summoned only by a Mirror of Shadows; each instance saves its own snapshot stats.
	reflection: {
		name: "reflection",
		minFloor: 4,
		maxFloor: 20,
		maxHealth: 1,
		attackDamage: 1,
		experienceReward: 12,
		detectionRadius: 8,
		spawnWeight: 1,
		spawnEnabled: false,
		dropChance: 0,
		lootPreferences: {},
	},
	// The ember's guardian: placed once by quest generation on the final floor, never by
	// ordinary spawning. Its health and attack come from its saved depth stats.
	"ember-warden": {
		name: "Ember Warden",
		minFloor: 5,
		maxFloor: 20,
		maxHealth: 80,
		attackDamage: 12,
		experienceReward: 72,
		detectionRadius: 8,
		spawnWeight: 1,
		spawnEnabled: false,
		dropChance: 0,
		lootPreferences: {},
		preparesAttack: true,
		resists: ["fire"],
		areaAttack: {
			element: "fire",
			range: 5,
			radius: 2,
			minDamage: 6,
			maxDamage: 12,
			cooldown: 4,
		},
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
		experienceReward: 5,
		maxHealth: 10,
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
	hexweaver: {
		name: "hexweaver",
		experienceReward: 14,
		maxHealth: 12,
		attackDamage: 4,
		detectionRadius: 6,
		minFloor: 6,
		maxFloor: 12,
		spawnWeight: 1,
		spawnEnabled: false,
		afflictionSource: true,
		hexAttack: { range: 5, cooldown: 3, damage: 2 },
		dropChance: 0.55,
		lootPreferences: {},
	},
	"shadow-stalker": {
		name: "shadow stalker",
		experienceReward: 16,
		maxHealth: 14,
		attackDamage: 5,
		detectionRadius: 7,
		minFloor: 7,
		maxFloor: 14,
		spawnWeight: 1,
		spawnEnabled: false,
		afflictionSource: true,
		blindingStrike: { cooldown: 4 },
		dropChance: 0.55,
		lootPreferences: {},
	},
	"mana-leech": {
		name: "mana leech",
		experienceReward: 20,
		maxHealth: 16,
		attackDamage: 6,
		detectionRadius: 6,
		minFloor: 9,
		maxFloor: 16,
		spawnWeight: 1,
		spawnEnabled: false,
		afflictionSource: true,
		onHitAffliction: { kind: "mana-burn", chance: 0.2 },
		onHitManaDrain: { min: 2, max: 4 },
		dropChance: 0.55,
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
		// An ordinary spawn, not a sparse source: a deliberate exception like the spider web.
		onHitAffliction: { kind: "bleeding", chance: 0.15 },
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
		webAttack: { range: 3, cooldown: 3 },
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
	"soul-wraith": {
		name: "soul wraith",
		experienceReward: 45,
		maxHealth: 40,
		attackDamage: 10,
		detectionRadius: 7,
		minFloor: 14,
		maxFloor: 20,
		spawnWeight: 1,
		spawnEnabled: false,
		afflictionSource: true,
		soulBolt: { range: 3, cooldown: 4, damage: 6 },
		dropChance: 1,
		lootPreferences: {},
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

// The affliction a monster can inflict, used for its matching remedy guarantee.
export const monsterAffliction = (
	kind: MonsterKind,
): AfflictionKind | undefined =>
	MONSTER_DEFINITIONS[kind].onHitAffliction?.kind ??
	(MONSTER_DEFINITIONS[kind].webAttack
		? "slowed"
		: MONSTER_DEFINITIONS[kind].hexAttack
			? "curse"
			: MONSTER_DEFINITIONS[kind].blindingStrike
				? "blinded"
				: MONSTER_DEFINITIONS[kind].soulBolt
					? "soul-drain"
					: undefined);
