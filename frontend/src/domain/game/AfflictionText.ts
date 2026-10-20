import type { Equipment } from "../items/Equipment";
import { ITEM_DEFINITIONS, type ItemKind } from "../items/Item";
import {
	type ActiveAffliction,
	AFFLICTION_DEFINITIONS,
	type AfflictionKind,
} from "./AfflictionDefinitions";
import { deriveAccuracy } from "./MeleeRules";
import type { AfflictionDefinition } from "./PlayerAfflictions";
import { maximumHealth } from "./PlayerHealth";
import type { Progression } from "./Progression";
import type { TimedEffect } from "./TimedEffects";

type Change = Readonly<{ normal: number; effective: number }>;
// Normal versus effective figures for the stats afflictions can change.
export type AfflictionImpact = Readonly<{
	maxHealth: Change;
	evade: Change;
	hit: Change;
}>;
export const afflictionImpact = (
	progression: Progression,
	effects: readonly TimedEffect[],
	equipment: Equipment,
	afflictions: readonly ActiveAffliction[],
): AfflictionImpact => {
	const normal = deriveAccuracy(progression, effects, equipment);
	const effective = deriveAccuracy(
		progression,
		effects,
		equipment,
		afflictions,
	);
	return {
		maxHealth: {
			normal: maximumHealth(progression, equipment),
			effective: maximumHealth(progression, equipment, afflictions),
		},
		evade: { normal: normal.evadeChance, effective: effective.evadeChance },
		hit: {
			normal: normal.playerHitChance,
			effective: effective.playerHitChance,
		},
	};
};

const cureName = (kind: AfflictionKind) =>
	ITEM_DEFINITIONS[AFFLICTION_DEFINITIONS[kind].cure as ItemKind].name;
const change = (label: string, { normal, effective }: Change, unit = "") =>
	`${label} ${normal}${unit} → ${effective}${unit} (−${normal - effective}).`;

// Popover and catalog text: exact current numbers when known, then the rule and both cures.
export const afflictionDetails = (
	kind: AfflictionKind,
	impact?: AfflictionImpact,
	remaining?: number | null,
): string => {
	const definition = AFFLICTION_DEFINITIONS[kind];
	const modifiers: AfflictionDefinition["modifiers"] = definition.modifiers;
	const exact = impact
		? [
				modifiers.maximumHealthMultiplier &&
					change("Maximum HP", impact.maxHealth),
				modifiers.evasion && change("Evade", impact.evade, "%"),
				modifiers.accuracy && change("Hit", impact.hit, "%"),
			].filter(Boolean)
		: [];
	if (modifiers.damagePerPhase && remaining)
		exact.push(
			`Up to ${remaining * modifiers.damagePerPhase} damage remaining.`,
		);
	return [
		...exact,
		definition.guidance,
		`Cure: ${cureName(kind)} (one turn) or sanctuary Cure ${definition.name} (${definition.sanctuaryFee} gold).`,
	].join(" ");
};

// Short bestiary line for monsters that inflict this affliction.
export const afflictionTrait = (kind: AfflictionKind): string => {
	const definition = AFFLICTION_DEFINITIONS[kind];
	return `${definition.name}: ${definition.summary}; refreshes without stacking. Magic resistance does not protect. ${cureName(kind)} or the sanctuary cures it.`;
};

export const afflictionFacts = (kind: AfflictionKind): string => {
	const { lifetime, summary } = AFFLICTION_DEFINITIONS[kind];
	return [
		lifetime.type === "until-cured"
			? "Lingering · until cured"
			: `Temporary · ${lifetime.duration} phases including application`,
		summary,
		"refreshes without stacking",
		"counts toward the affliction cap",
	].join(" · ");
};
