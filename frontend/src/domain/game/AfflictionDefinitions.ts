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
	},
} as const satisfies Record<string, AfflictionDefinition>;
export type AfflictionKind = keyof typeof AFFLICTION_DEFINITIONS;
export type ActiveAffliction = PlayerAffliction<AfflictionKind>;
