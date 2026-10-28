import {
	ARENA_REWARD_KINDS,
	EGG_SAC_TILES,
	MINIBOSS_KINDS,
} from "../arena/Arena";
import { ARENA_COLS, ARENA_ROWS } from "../arena/ArenaLayout";
import { PHYLACTERY_BLOWS } from "../arena/BoneLich";
import {
	CONFIGURATION_LIMITS,
	FOG_RADIUS_LIMITS,
} from "../dungeon/RunConfiguration";
import { MAX_SEED } from "../dungeon/Seed";
import {
	ACTIVITY_LOG_LIMIT,
	type ActivityEvent,
} from "../game/ActivityHistory";
import { AFFLICTION_DEFINITIONS } from "../game/AfflictionDefinitions";
import {
	DAMAGE_SOURCES,
	HEALING_SOURCES,
	PRESSURE_EVENTS,
} from "../game/CombatTelemetry";
import { DAMAGE_ELEMENTS } from "../game/DamageElements";
import { isDifficulty } from "../game/Difficulty";
import {
	EXPENSE_SOURCES,
	INCOME_SOURCES,
	TRADE_STORES,
} from "../game/EconomyTelemetry";
import { FLOOR_EXIT_REASONS } from "../game/FloorTelemetry";
import { OMEN_KINDS } from "../game/Omens";
import { PACT_KINDS } from "../game/Pacts";
import { PERK_KINDS, PERK_LEVELS } from "../game/Perks";
import { isPermanentAttributes } from "../game/PermanentAttributes";
import { PLAYER_AFFLICTION_LIMIT } from "../game/PlayerAfflictions";
import { MAX_PLAYER_LEVEL } from "../game/Progression";
import {
	USAGE_CONSUMABLE_KINDS,
	USAGE_EQUIPMENT_KINDS,
} from "../game/RunUsage";
import { SPELL_DEFINITIONS } from "../game/Spells";
import { EFFECT_DEFINITIONS, PLAYER_EFFECT_KINDS } from "../game/TimedEffects";
import { MAX_BAG_ITEMS } from "../items/Bag";
import { EQUIPMENT_SLOT_LABELS } from "../items/Equipment";
import { ITEM_DEFINITIONS } from "../items/Item";
import { isEnchantableKind, MAX_ENCHANTMENT } from "../items/ItemValues";
import { isMerchantStock } from "../merchant/MerchantRules";
import { MONSTER_DEFINITIONS } from "../monsters/Monster";
import {
	isTargetTelegraph,
	TELEGRAPH_COOLDOWNS,
} from "../monsters/MonsterTelegraphs";
import { OBJECT_DEFINITIONS } from "../objects/DungeonObject";
import { SANCTUARY_CONDITIONS, SANCTUARY_SERVICES } from "../town/Sanctuary";
import { isTownPotionStock, isTownScrollStock } from "../town/TownEconomy";
import { isTownEquipmentStock } from "../town/TownEquipmentStock";
import { isTownLocation } from "../town/TownLocation";
import type { SaveDocument } from "./SaveDocument";

// Small runtime schemas keep untrusted JSON out of the typed game model.
type Schema = (value: unknown) => boolean;
const record = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);
const integer =
	(min = 0, max = Number.MAX_SAFE_INTEGER): Schema =>
	(value) =>
		typeof value === "number" &&
		Number.isSafeInteger(value) &&
		value >= min &&
		value <= max;
const text: Schema = (value) =>
	typeof value === "string" && value.length > 0 && value.length <= 200;
const boolean: Schema = (value) => typeof value === "boolean";
const oneOf =
	(values: readonly unknown[]): Schema =>
	(value) =>
		values.includes(value);
const optional =
	(schema: Schema): Schema =>
	(value) =>
		value === undefined || schema(value);
const nullable =
	(schema: Schema): Schema =>
	(value) =>
		value === null || schema(value);
const array =
	(schema: Schema, min = 0, max = 10000): Schema =>
	(value) =>
		Array.isArray(value) &&
		value.length >= min &&
		value.length <= max &&
		value.every(schema);
const object =
	(fields: Record<string, Schema>): Schema =>
	(value) =>
		record(value) &&
		Object.entries(fields).every(([key, schema]) => schema(value[key]));
const exactObject =
	(fields: Record<string, Schema>): Schema =>
	(value) =>
		object(fields)(value) &&
		record(value) &&
		Object.keys(value).every((key) => Object.hasOwn(fields, key));
const natural = integer();
// Catalog-limited keys and safe integers bound usage independently of run length.
const usageCounts =
	(kinds: readonly string[]): Schema =>
	(value) =>
		record(value) &&
		Object.entries(value).every(
			([kind, count]) => kinds.includes(kind) && natural(count),
		);
const usage: Schema = (value) =>
	record(value) &&
	Object.keys(value).length === 3 &&
	object({
		casts: usageCounts(Object.keys(SPELL_DEFINITIONS)),
		consumables: usageCounts(USAGE_CONSUMABLE_KINDS),
		equippedTurns: usageCounts(USAGE_EQUIPMENT_KINDS),
	})(value);
const floorNumber = integer(1, CONFIGURATION_LIMITS.floorCount.max);
// A coordinate lies on a floor of the configured size or on the arena's fixed floor.
const index = integer(
	0,
	Math.max(CONFIGURATION_LIMITS.rows.max, ARENA_ROWS, ARENA_COLS) - 1,
);
const coordinate = object({ row: index, col: index });
const region = object({
	startRow: index,
	endRow: index,
	startCol: index,
	endCol: index,
});
const partition =
	(depth = 0): Schema =>
	(value) =>
		depth <= 30 &&
		object({
			region,
			room: optional(region),
			children: optional(array(partition(depth + 1), 2, 2)),
		})(value);
const itemKind = oneOf(Object.keys(ITEM_DEFINITIONS));
const monsterKind = oneOf(Object.keys(MONSTER_DEFINITIONS));
const spellKind = oneOf(Object.keys(SPELL_DEFINITIONS));
const slot = oneOf(Object.keys(EQUIPMENT_SLOT_LABELS));
const item: Schema = (value) =>
	object({
		id: text,
		kind: itemKind,
		telemetryAcquired: optional((value) => value === true),
	})(value) &&
	record(value) &&
	(value.enchantment === undefined ||
		(integer(1, MAX_ENCHANTMENT)(value.enchantment) &&
			isEnchantableKind(value.kind as keyof typeof ITEM_DEFINITIONS)));
const tradeTotals = exactObject({ quantity: integer(1), gold: integer(1) });
const tradeMap: Schema = (value) =>
	record(value) &&
	Object.entries(value).every(
		([store, items]) =>
			TRADE_STORES.includes(store as (typeof TRADE_STORES)[number]) &&
			record(items) &&
			Object.entries(items).every(
				([kind, totals]) => itemKind(kind) && tradeTotals(totals),
			),
	);
const economyMetrics = exactObject({
	acquired: usageCounts(Object.keys(ITEM_DEFINITIONS)),
	learned: usageCounts(Object.keys(SPELL_DEFINITIONS)),
	goldIn: usageCounts(INCOME_SOURCES),
	goldOut: usageCounts(EXPENSE_SOURCES),
	purchases: tradeMap,
	sales: tradeMap,
});
const economyTelemetry: Schema = (value) =>
	exactObject({
		initialGold: natural,
		initialItems: usageCounts(Object.keys(ITEM_DEFINITIONS)),
		initialSpells: usageCounts(Object.keys(SPELL_DEFINITIONS)),
		floors: (value) =>
			record(value) &&
			Object.entries(value).every(
				([key, metrics]) =>
					/^[1-9][0-9]?$/.test(key) &&
					floorNumber(Number(key)) &&
					economyMetrics(metrics),
			),
		town: economyMetrics,
	})(value) && JSON.stringify(value).length <= 256 * 1024;
const combatMetrics = exactObject({
	damage: usageCounts(DAMAGE_SOURCES),
	damageByMonster: usageCounts(Object.keys(MONSTER_DEFINITIONS)),
	damageByCondition: usageCounts(Object.keys(AFFLICTION_DEFINITIONS)),
	healing: usageCounts(HEALING_SOURCES),
	defeated: usageCounts(Object.keys(MONSTER_DEFINITIONS)),
	heroicDefeated: natural,
	summonedDefeated: natural,
	pressure: usageCounts(PRESSURE_EVENTS),
	omens: usageCounts(OMEN_KINDS),
	pacts: usageCounts(PACT_KINDS),
	usage,
	death: optional(
		exactObject({
			source: oneOf(DAMAGE_SOURCES),
			monster: optional(oneOf(Object.keys(MONSTER_DEFINITIONS))),
			condition: optional(oneOf(Object.keys(AFFLICTION_DEFINITIONS))),
			spell: optional(oneOf(Object.keys(SPELL_DEFINITIONS))),
		}),
	),
});
const combatTelemetry: Schema = (value) =>
	exactObject({
		floors: (value) =>
			record(value) &&
			Object.entries(value).every(
				([key, metrics]) =>
					/^[1-9][0-9]?$/.test(key) &&
					floorNumber(Number(key)) &&
					combatMetrics(metrics),
			),
		town: combatMetrics,
	})(value) && JSON.stringify(value).length <= 128 * 1024;
const checkpoint = exactObject({
	gameVersion: (value) =>
		typeof value === "string" &&
		value.length <= 40 &&
		/^[0-9]+\.[0-9]+\.[0-9]+(?:-[a-z0-9.]+)?$/.test(value),
	turn: natural,
	level: integer(1, MAX_PLAYER_LEVEL),
	experience: natural,
	attributes: exactObject({
		strength: natural,
		dexterity: natural,
		intelligence: natural,
	}),
	attack: natural,
	armor: natural,
	evadeChance: integer(0, 100),
	magicResistance: integer(0, 50),
	health: natural,
	maxHealth: integer(1),
	mana: natural,
	maxMana: integer(1),
	gold: natural,
	supplies: usageCounts(USAGE_CONSUMABLE_KINDS),
	equipment: exactObject(
		Object.fromEntries(
			Object.keys(EQUIPMENT_SLOT_LABELS).map((key) => [
				key,
				nullable(
					exactObject({
						kind: oneOf(USAGE_EQUIPMENT_KINDS),
						enchantment: integer(0, MAX_ENCHANTMENT),
					}),
				),
			]),
		),
	),
});
const floorTelemetry = exactObject({
	activeFloor: nullable(floorNumber),
	floors: array(
		exactObject({
			floorNumber,
			visits: integer(1),
			firstEntry: checkpoint,
			lastExit: optional(
				exactObject({
					toFloor: nullable(floorNumber),
					reason: oneOf(FLOOR_EXIT_REASONS),
					snapshot: checkpoint,
				}),
			),
		}),
		0,
		CONFIGURATION_LIMITS.floorCount.max,
	),
	final: optional(
		exactObject({
			floorNumber: nullable(floorNumber),
			outcome: oneOf(["won", "died"]),
			snapshot: checkpoint,
		}),
	),
});
const stair = object({
	coordinate,
	destinationFloor: floorNumber,
	arrivalCoordinate: coordinate,
});
const victory = object({
	seed: integer(0, MAX_SEED),
	floors: floorNumber,
	turns: natural,
	monstersDefeated: natural,
	health: integer(1),
	level: integer(1, MAX_PLAYER_LEVEL),
	experience: natural,
});

const eventFields = {
	"monster-door-opened": {
		actorId: text,
		objectId: text,
		monster: monsterKind,
	},
	"exit-scroll-used": {
		fromFloor: floorNumber,
		destination: optional(oneOf(["town"])),
	},
	"town-portal-returned": { toFloor: floorNumber },
	"player-spell-hit": { spell: oneOf(["fireball"]), damage: integer(1) },
	"discovery-opened": {
		kind: oneOf(Object.keys(OBJECT_DEFINITIONS)),
		item: itemKind,
		damage: integer(0, 10),
	},
	"object-seen": {
		kind: oneOf(Object.keys(OBJECT_DEFINITIONS)),
		activated: boolean,
	},
	"portal-used": { fromFloor: floorNumber, toFloor: floorNumber },
	"perk-chosen": { perk: oneOf(PERK_KINDS), level: integer(3, 19) },
	"warden-woke": {},
	"warden-fell": {},
	"storage-deposited": { item: itemKind, count: integer(1) },
	"storage-withdrawn": { item: itemKind, count: integer(1) },
	"hourglass-turned": { health: natural, mana: natural, empowered: natural },
	"mirror-used": {
		choice: oneOf(["reveal", "reflection", "shatter"]),
		outcome: optional(oneOf(["item", "empty", "hostile"])),
		item: optional(itemKind),
		damage: optional(integer(1)),
	},
	"well-offered": {
		gold: oneOf([50, 100, 250]),
		outcome: oneOf(["positive", "neutral", "negative"]),
		item: optional(itemKind),
		attribute: optional(oneOf(["strength", "dexterity", "intelligence"])),
		escaped: boolean,
	},
	"library-learned": { spell: spellKind, gold: integer(1, 10000) },
	"town-forged": {
		item: itemKind,
		enchantment: integer(1, MAX_ENCHANTMENT),
		gold: integer(1, 3000),
	},
	"forge-used": {
		service: oneOf(["reliable", "risky"]),
		outcome: oneOf(["improved", "unchanged", "destroyed"]),
		item: itemKind,
		enchantment: integer(0, MAX_ENCHANTMENT),
		gold: integer(1, 300),
	},
	"sarcophagus-opened": {
		outcome: oneOf(["treasure", "guardian", "both", "empty"]),
		escaped: boolean,
	},
	"shrine-offered": { gold: integer(1, 110) },
	"throne-used": {
		outcome: oneOf([
			"blessing",
			"recovery",
			"curse",
			"relocation",
			"treasure",
			"wound",
		]),
	},
	"throne-wound": { damage: integer(1, 8) },
	"fountain-restored": { health: natural, mana: natural },
	"fountain-poisoned": { damage: integer(1, 3) },
	"trap-disarmed": {},
	"trap-sprung": { damage: integer(1, 6) },
	"chest-opened": { item: itemKind },
	"mimic-revealed": {},
	"ring-displaced": {},
	"blade-bound": {},
	"blade-hungers": {},
	"blade-freed": {},
	"cracked-wall-noticed": {},
	"vault-opened": {},
	"omen-revealed": { omen: oneOf(OMEN_KINDS) },
	"pact-struck": { pact: oneOf(PACT_KINDS) },
	"arena-entered": { miniboss: oneOf(MINIBOSS_KINDS) },
	"arena-cleared": { miniboss: oneOf(MINIBOSS_KINDS) },
	"miniboss-enraged": { miniboss: oneOf(MINIBOSS_KINDS) },
	"arena-reward-claimed": { item: oneOf(ARENA_REWARD_KINDS) },
	"egg-sac-broken": {},
	"egg-sacs-burned": { count: integer(1, EGG_SAC_TILES.length) },
	"brood-hatched": { count: integer(1, EGG_SAC_TILES.length) },
	"dead-raised": {
		monster: oneOf(["skeleton", "zombie"]),
		count: integer(1, 2),
	},
	"phylactery-struck": { blows: integer(1, PHYLACTERY_BLOWS - 1) },
	"phylactery-blow-lost": {},
	"phylactery-broken": {},
	"lich-warded": {},
	"omen-foreseen": { omen: optional(oneOf(OMEN_KINDS)) },
	"gold-collected": { amount: integer(1) },
	"merchant-bought": { item: itemKind, gold: integer(1) },
	"merchant-sold": { item: itemKind, gold: integer(1) },
	"sanctuary-treated": {
		service: oneOf(SANCTUARY_SERVICES),
		gold: integer(1, 600),
		health: natural,
		conditions: array(
			oneOf(SANCTUARY_CONDITIONS),
			0,
			SANCTUARY_CONDITIONS.length,
		),
	},
	"affliction-changed": {
		condition: oneOf(Object.keys(AFFLICTION_DEFINITIONS)),
		change: oneOf(["applied", "refreshed", "rejected", "cured", "expired"]),
		source: text,
	},
	"player-condition-applied": {
		condition: oneOf(PLAYER_EFFECT_KINDS),
		duration: integer(1, 100),
	},
	"condition-hit": {
		monster: monsterKind,
		condition: oneOf(Object.keys(EFFECT_DEFINITIONS)),
		damage: natural,
	},
	"condition-applied": {
		monster: monsterKind,
		condition: oneOf(Object.keys(EFFECT_DEFINITIONS)),
		duration: integer(1, 100),
	},
	"spell-hit": { spell: spellKind, monster: monsterKind, damage: natural },
	"spell-repositioned": { spell: spellKind, monster: optional(monsterKind) },
	"player-condition-hit": {
		condition: oneOf(Object.keys(AFFLICTION_DEFINITIONS)),
		damage: natural,
	},
	"monster-awareness-changed": {
		monster: monsterKind,
		awareness: oneOf(["idle", "pursuing", "searching"]),
	},
	"monster-regenerated": { monster: monsterKind, recovered: natural },
	"monster-spell-hit": {
		monster: monsterKind,
		spell: spellKind,
		damage: natural,
	},
	"monster-spell-healed": {
		monster: monsterKind,
		spell: spellKind,
		recovered: natural,
	},
	"monster-resisted": {
		monster: monsterKind,
		element: oneOf(DAMAGE_ELEMENTS),
		damage: natural,
	},
	"monster-vulnerable": {
		monster: monsterKind,
		element: oneOf(DAMAGE_ELEMENTS),
		damage: natural,
	},
	"monster-area-prepared": {
		monster: monsterKind,
		element: oneOf(["fire", "cold"]),
		target: coordinate,
		radius: integer(1, 2),
		remaining: integer(1, 3),
	},
	"monster-area-hit": {
		monster: monsterKind,
		element: oneOf(["fire", "cold"]),
		damage: natural,
	},
	"monster-area-blocked": {
		monster: monsterKind,
		element: oneOf(["fire", "cold"]),
	},
	"monster-area-avoided": {
		monster: monsterKind,
		element: oneOf(["fire", "cold"]),
	},
	"door-changed": { opened: boolean },
	"spell-healed": { spell: spellKind, recovered: natural },
	"player-hit": { monster: monsterKind, damage: natural },
	"monster-hit": { monster: monsterKind, damage: natural },
	"monster-withdrawal-hit": { monster: monsterKind, damage: natural },
	"player-mana-drained": { monster: monsterKind, mana: integer(1, 100) },
	"monster-shot-hit": { monster: monsterKind, damage: natural },
	"monster-shot-missed": { monster: monsterKind },
	"monster-prepared": { monster: monsterKind, target: coordinate },
	"monster-web-prepared": { monster: monsterKind, target: coordinate },
	"monster-web-hit": { monster: monsterKind },
	"monster-web-avoided": { monster: monsterKind },
	"monster-theft-hit": { monster: monsterKind, gold: integer(1) },
	"monster-thief-escaped": { monster: monsterKind, gold: integer(1) },
	"monster-theft-recovered": { monster: monsterKind, gold: integer(1) },
	"monster-hex-prepared": { monster: monsterKind, target: coordinate },
	"monster-hex-hit": { monster: monsterKind, damage: natural },
	"monster-hex-avoided": { monster: monsterKind },
	"monster-blind-prepared": { monster: monsterKind, target: coordinate },
	"monster-blind-hit": { monster: monsterKind, damage: natural },
	"monster-soul-bolt-hit": { monster: monsterKind, damage: natural },
	"monster-blind-missed": { monster: monsterKind },
	"monster-blind-avoided": { monster: monsterKind },
	"monster-heavy-hit": { monster: monsterKind, damage: natural },
	"monster-heavy-missed": { monster: monsterKind },
	"monster-heavy-avoided": { monster: monsterKind },
	"monster-died": { monster: monsterKind },
	"player-missed": { monster: monsterKind },
	"monster-missed": { monster: monsterKind },
	"monster-withdrawal-missed": { monster: monsterKind },
	"experience-gained": { amount: natural },
	"level-gained": { level: integer(1, MAX_PLAYER_LEVEL), healthGain: natural },
	"attribute-gained": {
		attribute: oneOf(["Strength", "Dexterity", "Intelligence"]),
		value: natural,
	},
	"player-died": {},
	"quest-completed": {},
	"escape-started": {},
	"monster-alarm-prepared": {
		actorId: text,
		monster: monsterKind,
		target: coordinate,
	},
	"monster-alarm-sounded": {
		actorId: text,
		monster: monsterKind,
		target: coordinate,
	},
	"monster-summoned": {
		actorId: text,
		monster: monsterKind,
		summonedId: text,
		summoned: monsterKind,
	},
	"monster-charge-prepared": {
		actorId: text,
		monster: monsterKind,
		target: coordinate,
	},
	"monster-charge-hit": { monster: monsterKind, damage: natural },
	"monster-charge-ended": {
		actorId: text,
		monster: monsterKind,
		outcome: oneOf(["blocked", "avoided", "missed", "interrupted", "slammed"]),
	},
	"escape-floor-activated": { floorNumber },
	"entrance-reminder": { goalFloor: floorNumber },
	"item-equipped": { item: itemKind, slot, replaced: optional(itemKind) },
	"item-unequipped": { item: itemKind, slot, replaced: optional(itemKind) },
	"item-picked-up": { item: itemKind },
	"item-dropped": { item: itemKind, count: optional(integer(2)) },
	"item-cleansed": {
		item: itemKind,
		conditions: optional(
			array(oneOf(Object.keys(AFFLICTION_DEFINITIONS)), 1, 2),
		),
		recovered: optional(integer(1)),
	},
	"equipment-enchanted": { item: itemKind, enchantment: integer(1, 3) },
	"item-attribute-increased": {
		item: itemKind,
		attribute: oneOf(["strength", "dexterity", "intelligence"]),
		amount: integer(1, 1),
	},
	"item-boosted": {
		item: itemKind,
		condition: oneOf(Object.keys(EFFECT_DEFINITIONS)),
		duration: integer(1, 6),
	},
	"item-consumed": { item: itemKind, recovered: natural },
	"monster-loot": { monster: monsterKind, item: itemKind },
	"items-seen": { items: array(itemKind, 1) },
	"floor-changed": { fromFloor: floorNumber, toFloor: floorNumber },
} satisfies Record<ActivityEvent["type"], Record<string, Schema>>;
const event: Schema = (value) =>
	record(value) &&
	typeof value.type === "string" &&
	Object.hasOwn(eventFields, value.type) &&
	object({
		turn: natural,
		...eventFields[value.type as keyof typeof eventFields],
	})(value);
const configuration = object({
	difficulty: isDifficulty,
	rows: integer(CONFIGURATION_LIMITS.rows.min, CONFIGURATION_LIMITS.rows.max),
	cols: integer(CONFIGURATION_LIMITS.cols.min, CONFIGURATION_LIMITS.cols.max),
	floorCount: integer(
		CONFIGURATION_LIMITS.floorCount.min,
		CONFIGURATION_LIMITS.floorCount.max,
	),
	minPartitionSize: integer(1, 100),
	roomPadding: integer(0, 100),
	minRoomSize: integer(1, 100),
	maxRoomAspectRatio: (value) =>
		typeof value === "number" &&
		Number.isFinite(value) &&
		value >= 1 &&
		value <= 100,
});
const monsterIntent: Schema = (value) => {
	if (!record(value)) return false;
	switch (value.type) {
		case "idle":
		case "recovering-charge":
			return Object.keys(value).length === 1;
		case "preparing-area":
			return (
				Object.keys(value).length === 5 &&
				object({
					target: coordinate,
					radius: oneOf([1, 2]),
					element: oneOf(["fire", "cold"]),
					remaining: integer(1, 3),
				})(value) &&
				Number(value.remaining) <= Number(value.radius) + 1
			);
		default:
			return (
				typeof value.type === "string" &&
				isTargetTelegraph(value.type) &&
				Object.keys(value).length === 2 &&
				coordinate(value.target)
			);
	}
};
const monsterAwareness: Schema = (value) =>
	record(value) &&
	(value.type === "idle" ||
		((value.type === "pursuing" || value.type === "searching") &&
			object({ target: coordinate, remaining: integer(0, 100) })(value) &&
			(value.type !== "pursuing" || integer(0, 100)(value.blocked))));

const documentShape = object({
	version: oneOf([33]),
	savedAt: (value) =>
		text(value) &&
		typeof value === "string" &&
		Number.isFinite(Date.parse(value)),
	configuration,
	fog: object({
		enabled: boolean,
		radius: integer(FOG_RADIUS_LIMITS.min, FOG_RADIUS_LIMITS.max),
	}),
	state: object({
		afflictions: array(
			object({
				kind: oneOf(Object.keys(AFFLICTION_DEFINITIONS)),
				// Lifetime agreement with each kind's definition is a consistency rule.
				remaining: (v) => v === null || integer(1, 100)(v),
				source: text,
			}),
			0,
			PLAYER_AFFLICTION_LIMIT,
		),
		townPortal: nullable(object({ floorNumber, coordinate })),
		displacedFloors: optional(array(floorNumber, 0, 20)),
		hunger: optional(object({ fedTurn: natural })),
		omens: array(object({ floorNumber, kind: oneOf(OMEN_KINDS) }), 0, 20),
		encounters: optional(
			object({
				sinceTurn: natural,
				omens: array(oneOf(OMEN_KINDS), 0, 20),
				thieves: array(text, 0, 60),
				mimicFloors: array(floorNumber, 0, 20),
				arenaEntered: boolean,
				theft: optional(
					object({
						sinceTurn: natural,
						stolen: natural,
						recovered: natural,
						nextId: natural,
					}),
				),
			}),
		),
		// Whether a ranked adventure is the standard dungeon is a consistency rule.
		ranked: optional((value) => value === true),
		rankingVersion: optional(
			(value) =>
				typeof value === "string" &&
				/^[0-9]+\.[0-9]+\.[0-9]+(?:-[a-z0-9.]+)?$/.test(value) &&
				value.length <= 40,
		),
		developerRun: optional((value) => value === true),
		usage: optional(usage),
		floorTelemetry: optional(floorTelemetry),
		combatTelemetry: optional(combatTelemetry),
		economyTelemetry: optional(economyTelemetry),
		disabledFeatures: optional(
			array(
				oneOf([
					"omens",
					"pacts",
					"arena",
					"thieves",
					"mimics",
					"vaults",
					"discoveries",
					"elites",
					"merchants",
					"rareFinds",
				]),
				1,
				10,
			),
		),
		runId: optional(
			(value) =>
				typeof value === "string" &&
				/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
					value,
				),
		),
		// Where an arena may stand is a consistency rule.
		arenas: array(
			object({ floorNumber, miniboss: oneOf(MINIBOSS_KINDS) }),
			0,
			1,
		),
		town: nullable(isTownLocation),
		townPotionStock: isTownPotionStock,
		townScrollStock: isTownScrollStock,
		townStorage: array(item, 0, MAX_BAG_ITEMS),
		townEquipmentStock: isTownEquipmentStock,
		townEquipmentPurchases: array(text),
		merchantStock: isMerchantStock,
		gold: natural,
		escape: nullable(
			object({
				startedTurn: natural,
				activatedFloors: array(floorNumber, 0, 20),
			}),
		),
		spellHotbar: array(nullable(spellKind), 6, 6),
		effects: array(
			(value) =>
				record(value) &&
				object({
					actorId: text,
					floorNumber: nullable(floorNumber),
					kind: oneOf(Object.keys(EFFECT_DEFINITIONS)),
					remaining: integer(1, 100),
				})(value) &&
				Number(value.remaining) <=
					EFFECT_DEFINITIONS[value.kind as keyof typeof EFFECT_DEFINITIONS]
						.duration,
			0,
			1000,
		),
		objects: array(
			object({
				id: text,
				kind: oneOf(Object.keys(OBJECT_DEFINITIONS)),
				floorNumber,
				coordinate,
				activated: boolean,
				noticed: optional((value) => value === true),
				sarcophagusOutcome: optional(
					oneOf(["treasure", "guardian", "both", "empty"]),
				),
				portalDestination: optional(object({ floorNumber, coordinate })),
				blows: optional(integer(1, PHYLACTERY_BLOWS - 1)),
				// Which choices carry an outcome is a consistency rule.
				mirrorResult: optional(
					object({
						choice: oneOf(["reveal", "reflection", "shatter"]),
						outcome: optional(oneOf(["item", "empty", "hostile"])),
					}),
				),
				wellResult: optional(
					object({
						offering: oneOf([50, 100, 250]),
						outcome: oneOf(["positive", "neutral", "negative"]),
					}),
				),
				forgeResult: optional(
					object({
						service: oneOf(["reliable", "risky"]),
						outcome: oneOf(["improved", "unchanged", "destroyed"]),
						item: itemKind,
					}),
				),
			}),
			0,
			480,
		),
		run: object({
			seed: integer(0, MAX_SEED),
			activeFloor: floorNumber,
			playerCoordinate: coordinate,
			floors: array(
				object({
					floorNumber,
					terrain: array(
						(value) =>
							typeof value === "string" && /^[.#]{10,100}$/.test(value),
						10,
						100,
					),
					partitions: partition(),
					rooms: array(region, 1),
					corridors: array(array(coordinate)),
					upStair: optional(stair),
					downStair: optional(stair),
				}),
				5,
				20,
			),
		}),
		turn: natural,
		mana: natural,
		knownSpells: array(spellKind, 0, Object.keys(SPELL_DEFINITIONS).length),
		player: object({ health: natural, maxHealth: integer(1) }),
		progression: object({
			experience: natural,
			permanentAttributes: isPermanentAttributes,
			// Which offers were chosen is a consistency rule.
			perks: array(
				object({ level: integer(3, 19), perk: oneOf(PERK_KINDS) }),
				0,
				PERK_LEVELS.length,
			),
			// Whether an altar offered it is a consistency rule.
			pact: optional(oneOf(PACT_KINDS)),
		}),
		quest: object({
			goalFloor: floorNumber,
			entrance: coordinate,
			cureRecovered: boolean,
			victory: nullable(victory),
		}),
		monstersDefeated: natural,
		equipment: object({
			mainHand: nullable(item),
			offHand: nullable(item),
			chest: nullable(item),
			head: nullable(item),
			leftRing: nullable(item),
			rightRing: nullable(item),
		}),
		bag: object({ items: array(item, 0, MAX_BAG_ITEMS) }),
		potionHotbar: array(
			nullable(
				oneOf(
					Object.keys(ITEM_DEFINITIONS).filter(
						(key) =>
							ITEM_DEFINITIONS[key as keyof typeof ITEM_DEFINITIONS].type ===
							"potion",
					),
				),
			),
			4,
			4,
		),
		floorItems: array(object({ item, floorNumber, coordinate })),
		monsters: array(
			object({
				id: text,
				kind: monsterKind,
				floorNumber,
				coordinate,
				health: integer(1),
				intent: monsterIntent,
				lastDamagedTurn: nullable(natural),
				awareness: optional(monsterAwareness),
				alarmUsed: optional(boolean),
				heroic: optional(boolean),
				remedyDrop: optional(boolean),
				summons: optional(object({ count: natural, turn: natural })),
				summonedBy: optional(text),
				empowered: optional((value) => value === true),
				warden: optional(
					object({
						maxHealth: integer(1),
						attackDamage: integer(1),
						depth: floorNumber,
						awake: optional((value) => value === true),
					}),
				),
				reflection: optional(
					object({ maxHealth: integer(1), attackDamage: integer(1) }),
				),
				theft: optional(object({ gold: integer(1), turn: natural })),
				minibossPhase: optional(oneOf([2])),
				// Which kinds a monster may hold is a consistency rule.
				telegraphTurn: optional(
					(value) =>
						record(value) &&
						Object.keys(value).length > 0 &&
						Object.entries(value).every(
							([kind, turn]) =>
								Object.hasOwn(TELEGRAPH_COOLDOWNS, kind) && natural(turn),
						),
				),
			}),
			0,
			10000,
		),
		activityHistory: object({
			entries: array(object({ id: natural, event }), 0, ACTIVITY_LOG_LIMIT),
			nextId: natural,
		}),
	}),
	explored: array(
		object({
			floorNumber,
			rows: array(
				(value) => typeof value === "string" && /^[01]{10,100}$/.test(value),
				10,
				100,
			),
		}),
		0,
		20,
	),
});

export const isSaveDocument = (value: unknown): value is SaveDocument =>
	documentShape(value);
