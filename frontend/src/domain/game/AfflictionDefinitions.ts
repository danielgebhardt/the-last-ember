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
		blocksRunning: false,
		cure: "cure-disease-potion",
		guidance:
			"Maximum HP reduced by 20%, rounded down (minimum 1). Until cured by Cure Disease potion or sanctuary treatment. Curing restores capacity, not HP. Heal, Renewal, rest and ordinary potions do not cure Disease.",
		appliedText:
			"Maximum HP reduced by 20% until cured. Use Cure Disease potion or sanctuary treatment.",
		removedText: "Maximum HP restored without healing.",
		absentText: "You do not have Disease.",
	},
	slowed: {
		kind: "slowed",
		target: "player",
		name: "Slowed",
		lifetime: { type: "phases", duration: 10 },
		modifiers: { evasion: -10 },
		blocksRunning: true,
		cure: "cleansing-potion",
		guidance:
			"Evasion reduced by 10 percentage points (minimum 5%) for 10 committed phases, including the phase it lands. Refreshing resets the duration without deepening the penalty. Cleansing potion or sanctuary treatment removes it. Your actions and turns are unchanged.",
		appliedText:
			"Evasion −10 for 10 phases. Use a Cleansing potion or sanctuary treatment.",
		removedText: "Evasion restored.",
		absentText: "You are not Slowed.",
	},
	"mana-burn": {
		kind: "mana-burn",
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
export const suppressesManaRecovery = (
	afflictions: readonly ActiveAffliction[] = [],
): boolean =>
	afflictions.some(
		(a) => afflictionModifiers(a.kind).suppressesManaRecovery === true,
	);
