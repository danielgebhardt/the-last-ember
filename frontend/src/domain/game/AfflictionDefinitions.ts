import type {
	AfflictionDefinition,
	PlayerAffliction,
} from "./PlayerAfflictions";
export const AFFLICTION_DEFINITIONS = {
	disease: {
		kind: "disease",
		target: "player",
		name: "Disease",
		lifetime: { type: "until-cured" },
		modifiers: { maximumHealthMultiplier: 0.8 },
		cure: "cure-disease-potion",
		guidance:
			"Maximum HP reduced by 20%, rounded down (minimum 1). Until cured by Cure Disease potion or sanctuary treatment. Curing restores capacity, not HP. Heal, Renewal, rest and ordinary potions do not cure Disease.",
		appliedText:
			"Maximum HP reduced by 20% until cured. Use Cure Disease potion or sanctuary treatment.",
		removedText: "Maximum HP restored without healing.",
	},
	slowed: {
		kind: "slowed",
		target: "player",
		name: "Slowed",
		lifetime: { type: "phases", duration: 10 },
		modifiers: { evasion: -10 },
		cure: "cleansing-potion",
		guidance:
			"Evasion reduced by 10 percentage points (minimum 5%) for 10 committed phases, including the phase it lands. Refreshing resets the duration without deepening the penalty. Cleansing potion or sanctuary treatment removes it. Your actions and turns are unchanged.",
		appliedText:
			"Evasion −10 for 10 phases. Use a Cleansing potion or sanctuary treatment.",
		removedText: "Evasion restored.",
	},
} as const satisfies Record<string, AfflictionDefinition>;
export type AfflictionKind = keyof typeof AFFLICTION_DEFINITIONS;
export type ActiveAffliction = PlayerAffliction<AfflictionKind>;
export const afflictionModifiers = (
	kind: AfflictionKind,
): AfflictionDefinition["modifiers"] => AFFLICTION_DEFINITIONS[kind].modifiers;
// Whole d20 threshold steps removed from player evasion by active afflictions.
export const afflictionEvasionSteps = (
	afflictions: readonly ActiveAffliction[] = [],
): number =>
	afflictions.reduce(
		(steps, a) => steps + -(afflictionModifiers(a.kind).evasion ?? 0) / 5,
		0,
	);
