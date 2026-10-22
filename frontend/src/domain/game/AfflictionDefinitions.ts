import type {
	AfflictionDefinition,
	PlayerAffliction,
} from "./PlayerAfflictions";
export const AFFLICTION_DEFINITIONS = {
	poisoned: {
		kind: "poisoned",
		sanctuaryFee: 40,
		summary: "1 damage after monsters act each phase for 10 phases",
		target: "player",
		name: "Poison",
		lifetime: { type: "phases", duration: 10 },
		modifiers: { damagePerPhase: 1 },
		blocksRunning: true,
		cure: "antidote",
		guidance:
			"Deals 1 damage after monsters act in each of 10 committed phases, including the phase it lands; it can kill. Another dose resets the duration without stacking damage. An Antidote or sanctuary treatment removes it.",
		appliedText:
			"1 damage per phase for 10 phases. Drink an Antidote or visit the sanctuary.",
		removedText: "The poison is gone.",
		absentText: "You are not poisoned.",
	},
	disease: {
		kind: "disease",
		sanctuaryFee: 150,
		summary:
			"maximum HP −20% (−10% with Iron constitution; minimum 1) until cured",
		target: "player",
		name: "Disease",
		lifetime: { type: "until-cured" },
		modifiers: { maximumHealthMultiplier: 0.8 },
		blocksRunning: false,
		cure: "cure-disease-potion",
		guidance:
			"Maximum HP reduced by 20% (10% with Iron constitution), rounded down (minimum 1). Until cured by Cure Disease potion or sanctuary treatment. Curing restores capacity, not HP. Heal, Renewal, rest and ordinary potions do not cure Disease.",
		appliedText:
			"Maximum HP reduced by 20% (10% with Iron constitution) until cured. Use Cure Disease potion or sanctuary treatment.",
		removedText: "Maximum HP restored without healing.",
		absentText: "You do not have Disease.",
	},
	slowed: {
		kind: "slowed",
		sanctuaryFee: 50,
		summary: "evasion −10 points (minimum 5%) for 30 phases",
		target: "player",
		name: "Slowed",
		lifetime: { type: "phases", duration: 30 },
		modifiers: { evasion: -10 },
		blocksRunning: true,
		cure: "cleansing-potion",
		guidance:
			"Evasion reduced by 10 percentage points (minimum 5%) for 30 committed phases, including the phase it lands. Refreshing resets the duration without deepening the penalty. Cleansing potion or sanctuary treatment removes it. Your actions and turns are unchanged.",
		appliedText:
			"Evasion −10 for 30 phases. Use a Cleansing potion or sanctuary treatment.",
		removedText: "Evasion restored.",
		absentText: "You are not Slowed.",
	},
	"mana-burn": {
		kind: "mana-burn",
		sanctuaryFee: 75,
		summary: "no passive mana recovery for 90 phases (three lost ticks)",
		target: "player",
		name: "Mana Burn",
		// 90 consecutive phases always contain exactly three 30-turn recovery ticks.
		lifetime: { type: "phases", duration: 90 },
		modifiers: { suppressesManaRecovery: true },
		// A 90-phase recovery penalty does not endanger travel; only its onset stops a run.
		blocksRunning: false,
		cure: "cleansing-potion",
		guidance:
			"Passive mana recovery stops for 90 committed phases, including the phase it lands, so three recovery ticks are lost. Refreshing resets the duration. Mana potions and affordable spells still work, and no recovery is stored for later. Cleansing potion or sanctuary treatment removes it.",
		appliedText:
			"Passive mana recovery stops for 90 phases. Use a Cleansing potion or sanctuary treatment.",
		removedText: "Passive mana recovery resumes.",
		absentText: "You do not have Mana Burn.",
	},
	curse: {
		kind: "curse",
		sanctuaryFee: 250,
		summary: "melee to-hit −10 and damage −1 (minimum 1) until cured",
		target: "player",
		name: "Curse",
		lifetime: { type: "until-cured" },
		modifiers: { accuracy: -10, meleeDamage: -1 },
		blocksRunning: false,
		cure: "remove-curse-scroll",
		guidance:
			"Melee to-hit −10 percentage points and melee damage −1 (minimum 1) until cured by a Remove Curse scroll or sanctuary treatment. Spells, evasion and equipment are unaffected. Healing, rest and Cleansing potions do not lift it.",
		appliedText:
			"Melee to-hit −10 and damage −1 until cured. Read a Remove Curse scroll or visit the sanctuary.",
		removedText: "Melee accuracy and damage restored.",
		absentText: "You are not cursed.",
	},
	blinded: {
		kind: "blinded",
		sanctuaryFee: 50,
		summary: "sight 2 tiles and melee to-hit −20 for 30 phases",
		target: "player",
		name: "Blinded",
		lifetime: { type: "phases", duration: 30 },
		modifiers: { accuracy: -20, sightRadius: 2 },
		blocksRunning: true,
		cure: "cleansing-potion",
		guidance:
			"You see only 2 tiles around you and melee to-hit drops by 20 percentage points for 30 committed phases, including the phase it lands. Explored map memory stays. Refreshing resets the duration. Cleansing potion or sanctuary treatment removes it.",
		appliedText:
			"Sight 2 tiles and melee to-hit −20 for 30 phases. Use a Cleansing potion or sanctuary treatment.",
		removedText: "Your sight returns.",
		absentText: "You are not Blinded.",
	},
	bleeding: {
		kind: "bleeding",
		sanctuaryFee: 50,
		summary: "1 damage per step you take until cured",
		target: "player",
		name: "Bleeding",
		lifetime: { type: "until-cured" },
		modifiers: { damagePerMove: 1 },
		// Running would bleed you step by step without a decision.
		blocksRunning: true,
		cure: "bandages",
		guidance:
			"Each step you take in the dungeon deals 1 damage, including corridor-run steps and a step onto stairs; it can kill. Waiting, attacking, failed moves and town movement do not bleed. Until cured by Bandages or sanctuary treatment. Healing restores HP but does not stop the bleeding.",
		appliedText:
			"1 damage per step until cured. Apply Bandages or visit the sanctuary.",
		removedText: "The bleeding stops.",
		absentText: "You are not bleeding.",
	},
	"soul-drain": {
		kind: "soul-drain",
		sanctuaryFee: 400,
		summary: "maximum mana −20% (minimum 1) until cured",
		target: "player",
		name: "Soul Drain",
		lifetime: { type: "until-cured" },
		modifiers: { maximumManaMultiplier: 0.8 },
		blocksRunning: false,
		cure: "soul-restoration-potion",
		guidance:
			"Maximum mana reduced by 20%, rounded down (minimum 1), until cured by a Soul Restoration potion or sanctuary treatment. Current mana above the new maximum is lost. Curing restores capacity, not mana. No attributes or spells are lost.",
		appliedText:
			"Maximum mana reduced by 20% until cured. Drink a Soul Restoration potion or visit the sanctuary.",
		removedText: "Maximum mana restored without refilling it.",
		absentText: "You do not have Soul Drain.",
	},
} as const satisfies Record<string, AfflictionDefinition>;
export type AfflictionKind = keyof typeof AFFLICTION_DEFINITIONS;
export type ActiveAffliction = PlayerAffliction<AfflictionKind>;
export type AfflictionModifier = keyof AfflictionDefinition["modifiers"];
export const afflictionModifiers = (
	kind: AfflictionKind,
): AfflictionDefinition["modifiers"] => AFFLICTION_DEFINITIONS[kind].modifiers;
// Names of active afflictions that change a stat, for effective-value notes.
export const afflictionNamesWith = (
	afflictions: readonly ActiveAffliction[],
	modifier: AfflictionModifier,
): string =>
	afflictions
		.filter((a) => afflictionModifiers(a.kind)[modifier] !== undefined)
		.map((a) => AFFLICTION_DEFINITIONS[a.kind].name)
		.join(", ");
// Whole d20 threshold steps removed from player evasion by active afflictions.
export const afflictionEvasionSteps = (
	afflictions: readonly ActiveAffliction[] = [],
): number =>
	afflictions.reduce(
		(steps, a) => steps + -(afflictionModifiers(a.kind).evasion ?? 0) / 5,
		0,
	);
// Whole d20 threshold steps removed from player melee accuracy.
export const afflictionAccuracySteps = (
	afflictions: readonly ActiveAffliction[] = [],
): number =>
	afflictions.reduce(
		(steps, a) => steps + -(afflictionModifiers(a.kind).accuracy ?? 0) / 5,
		0,
	);
// Nominal melee damage after affliction penalties; a hit always deals at least 1.
export const afflictedMeleeAttack = (
	attack: number,
	afflictions: readonly ActiveAffliction[] = [],
): number =>
	Math.max(
		1,
		afflictions.reduce(
			(total, a) => total + (afflictionModifiers(a.kind).meleeDamage ?? 0),
			attack,
		),
	);
// Live sight radius: afflictions can only narrow the configured fog radius.
export const afflictedSightRadius = (
	radius: number,
	afflictions: readonly ActiveAffliction[] = [],
): number =>
	afflictions.reduce(
		(sight, a) =>
			Math.min(sight, afflictionModifiers(a.kind).sightRadius ?? sight),
		radius,
	);
export const suppressesManaRecovery = (
	afflictions: readonly ActiveAffliction[] = [],
): boolean =>
	afflictions.some(
		(a) => afflictionModifiers(a.kind).suppressesManaRecovery === true,
	);
