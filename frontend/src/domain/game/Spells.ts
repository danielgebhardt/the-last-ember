import type { Equipment } from "../items/Equipment";
import { deriveAttributes } from "./Attributes";
import type { DamageElement } from "./DamageElements";
import { hasPerk } from "./Perks";
import type { Progression } from "./Progression";
import type { EffectKind, PlayerEffectKind, TimedEffect } from "./TimedEffects";

type SpellDetails = {
	name: string;
	cost: number;
	description: string;
	intelligenceScaling?: number;
	splashMultiplier?: number;
};
export type SpellDefinition = SpellDetails &
	(
		| {
				mode: "targeted";
				effect: "damage";
				range: number;
				element?: DamageElement;
				minimumDamage: number;
				maximumDamage: number;
				condition?: EffectKind;
				lifeDrain?: boolean;
				radius?: number;
		  }
		| {
				mode: "targeted";
				effect: "condition";
				condition: EffectKind;
				range: number;
		  }
		| { mode: "self"; effect: "condition"; condition: PlayerEffectKind }
		| { mode: "self"; effect: "heal"; healing: number }
		| {
				mode: "self";
				effect: "damage";
				radius: number;
				element?: DamageElement;
				minimumDamage: number;
				maximumDamage: number;
				condition?: EffectKind;
		  }
		| { mode: "self"; effect: "reposition"; range: number }
		| { mode: "targeted"; effect: "reposition"; range: number }
	);

export const SPELL_DEFINITIONS = {
	"magic-missile": {
		element: "arcane",
		name: "Magic Missile",
		mode: "targeted",
		effect: "damage",
		cost: 3,
		range: 6,
		minimumDamage: 3,
		maximumDamage: 5,
		description:
			"A homing bolt that always hits one monster within range and clear line of sight.",
	},
	"ember-bolt": {
		intelligenceScaling: 2,
		element: "fire",
		name: "Ember Bolt",
		mode: "targeted",
		effect: "damage",
		cost: 4,
		range: 4,
		minimumDamage: 8,
		maximumDamage: 12,
		description:
			"A powerful short-range burst of flame. Adds twice your Intelligence modifier.",
	},
	"frost-bolt": {
		element: "cold",
		name: "Frost Bolt",
		mode: "targeted",
		effect: "damage",
		cost: 4,
		range: 5,
		minimumDamage: 2,
		maximumDamage: 4,
		condition: "slowed",
		description:
			"Chill one monster for three active phases. It skips alternating actions, starting with this cast; recasting refreshes the slow.",
	},
	shock: {
		intelligenceScaling: 2,
		element: "lightning",
		name: "Shock",
		mode: "targeted",
		effect: "damage",
		cost: 5,
		range: 5,
		minimumDamage: 10,
		maximumDamage: 16,
		description:
			"A heavy lightning strike. Adds twice your Intelligence modifier; no stun.",
	},
	"stone-lance": {
		intelligenceScaling: 2,
		element: "physical",
		name: "Stone Lance",
		mode: "targeted",
		effect: "damage",
		cost: 6,
		range: 7,
		minimumDamage: 12,
		maximumDamage: 18,
		description:
			"A heavy single-target projectile with long reach. Adds twice your Intelligence modifier.",
	},
	"sonic-spear": {
		intelligenceScaling: 2,
		element: "sonic",
		name: "Sonic Spear",
		mode: "targeted",
		effect: "damage",
		cost: 7,
		range: 8,
		minimumDamage: 18,
		maximumDamage: 26,
		description:
			"A powerful long-range finisher. Adds twice your Intelligence modifier.",
	},
	"drain-life": {
		element: "shadow",
		name: "Drain Life",
		mode: "targeted",
		effect: "damage",
		cost: 6,
		range: 2,
		minimumDamage: 4,
		maximumDamage: 8,
		lifeDrain: true,
		description:
			"A close-range attack that restores health equal to actual damage dealt, up to your missing health.",
	},

	web: {
		name: "Web",
		mode: "targeted",
		effect: "condition",
		condition: "rooted",
		cost: 3,
		range: 4,
		description:
			"Web one monster for three active phases. It cannot move, but can still attack if in range.",
	},
	sleep: {
		name: "Sleep",
		mode: "targeted",
		effect: "condition",
		condition: "asleep",
		cost: 5,
		range: 4,
		description:
			"Put one monster to sleep for three active phases. Any damage wakes it before its response. Cancels prepared attacks.",
	},
	fear: {
		name: "Fear",
		mode: "targeted",
		effect: "condition",
		condition: "afraid",
		cost: 4,
		range: 5,
		description:
			"Force one monster to retreat for three active phases instead of attacking. Cancels prepared attacks; blocked escape still consumes its action.",
	},

	"poison-dart": {
		element: "poison",
		name: "Poison Dart",
		mode: "targeted",
		effect: "damage",
		condition: "poisoned",
		cost: 4,
		range: 8,
		minimumDamage: 2,
		maximumDamage: 4,
		description:
			"Deal a small initial hit and poison a monster for six active phases. Poison deals 4 + half your current Intelligence modifier (rounded down) damage after its action; refreshing never stacks.",
	},
	renewal: {
		name: "Renewal",
		mode: "self",
		effect: "condition",
		condition: "renewing",
		cost: 5,
		description:
			"Restore 2 + half your current Intelligence modifier (rounded down) health after monsters act for four committed turns, including this turn. Does not save you from a fatal hit.",
	},
	protection: {
		name: "Protection",
		mode: "self",
		effect: "condition",
		condition: "protected",
		cost: 3,
		description:
			"Gain 2 armor for twenty committed turns, including this turn. Recasting refreshes the duration without stacking.",
	},
	strength: {
		name: "Strength",
		mode: "self",
		effect: "condition",
		condition: "strengthened",
		cost: 4,
		description:
			"Gain 2 Strength for twenty committed turns, improving melee damage. Recasting refreshes the duration without stacking.",
	},
	dexterity: {
		name: "Dexterity",
		mode: "self",
		effect: "condition",
		condition: "nimble",
		cost: 4,
		description:
			"Gain 2 Dexterity for twenty committed turns, improving hit and evasion chances. Recasting refreshes the duration without stacking.",
	},
	blink: {
		name: "Blink",
		mode: "self",
		effect: "reposition",
		range: 10,
		cost: 4,
		description:
			"Blink to a seeded tile four to ten steps away, or closer if none fits. Walls, actors and stair arrivals are excluded. No destination costs nothing.",
	},
	"teleport-away": {
		name: "Teleport Away",
		mode: "targeted",
		effect: "reposition",
		range: 5,
		cost: 6,
		description:
			"Send one monster to a seeded safe tile farther from you on this floor. Keeps its health and conditions, cancels its prepared attack.",
	},
	fireball: {
		splashMultiplier: 0.5,
		intelligenceScaling: 2,
		element: "fire",
		name: "Fireball",
		mode: "targeted",
		effect: "damage",
		cost: 8,
		range: 6,
		radius: 3,
		minimumDamage: 16,
		maximumDamage: 24,
		description:
			"A radius-three fire blast. Full damage at the center; half damage, rounded down, to other enemies AND YOU. Walls block the blast. Adds twice your Intelligence modifier before splash reduction.",
	},
	"frost-nova": {
		element: "cold",
		name: "Frost Nova",
		mode: "self",
		effect: "damage",
		cost: 8,
		radius: 2,
		minimumDamage: 3,
		maximumDamage: 5,
		condition: "slowed",
		description:
			"Chill visible-in-wall-sight enemies within two steps of you. Deals damage and slows survivors for three phases. No enemies costs nothing.",
	},
	heal: {
		name: "Heal",
		mode: "self",
		effect: "heal",
		cost: 4,
		healing: 4,
		description: "Restore your own health before monsters act.",
	},
} as const satisfies Record<string, SpellDefinition>;
export type SpellKind = keyof typeof SPELL_DEFINITIONS;
// A spell as this caster casts it: Efficient casting lowers its cost and Long reach
// extends a targeted spell's range. Use it wherever cost or range is checked or shown.
export const playerSpell = (
	spell: SpellKind,
	progression: Progression,
): SpellDefinition => {
	const definition: SpellDefinition = SPELL_DEFINITIONS[spell];
	const cost = hasPerk(progression, "efficient-casting")
		? Math.max(1, definition.cost - 1)
		: definition.cost;
	if (definition.mode === "targeted" && hasPerk(progression, "long-reach"))
		return { ...definition, cost, range: definition.range + 1 };
	return cost === definition.cost ? definition : { ...definition, cost };
};
export const createKnownSpells = (): readonly SpellKind[] => [
	"magic-missile",
	"heal",
];
export const spellKnowledgeError = (
	known: readonly SpellKind[],
	spell: string,
): string | undefined => {
	if (!Object.hasOwn(SPELL_DEFINITIONS, spell)) return "Unknown spell.";
	if (!known.includes(spell as SpellKind))
		return "You have not learned that spell.";
};
export const spellPotency = (
	progression: Progression,
	definition: SpellDefinition,
	equipment?: Partial<Equipment>,
	effects: readonly TimedEffect[] = [],
) => {
	const modifier = deriveAttributes(
		progression,
		effects,
		equipment,
	).intelligenceModifier;
	const focus = hasPerk(progression, "spellfocus") ? 1 : 0;
	switch (definition.effect) {
		case "damage":
			return {
				effect: "damage",
				minimumDamage:
					definition.minimumDamage +
					modifier * (definition.intelligenceScaling ?? 1) +
					focus,
				maximumDamage:
					definition.maximumDamage +
					modifier * (definition.intelligenceScaling ?? 1) +
					focus,
			} as const;
		case "condition":
			return { effect: "condition", condition: definition.condition } as const;
		case "reposition":
			return { effect: "reposition" } as const;
		case "heal":
			return {
				effect: "heal",
				healing: definition.healing + modifier + focus,
			} as const;
	}
};
