import type { Equipment } from "../items/Equipment";
import {
	type ActiveAffliction,
	afflictionAccuracySteps,
	afflictionEvasionSteps,
} from "./AfflictionDefinitions";
import { deriveAttributes } from "./Attributes";
import { resolveIncomingDamage } from "./CombatStats";
import { assertDifficulty, scaleEnemyValue } from "./Difficulty";
import { hasPerk } from "./Perks";
import type { Progression } from "./Progression";
import type { TimedEffect } from "./TimedEffects";

export const PLAYER_HIT_THRESHOLD = 4;
export const MONSTER_HIT_THRESHOLD = 5;
export const PLAYER_HIT_CHANCE = (21 - PLAYER_HIT_THRESHOLD) * 5;
export const MONSTER_HIT_CHANCE = (21 - MONSTER_HIT_THRESHOLD) * 5;
export const accuracyThresholds = (
	modifier: number,
	evasionPenalty = 0,
	accuracyPenalty = 0,
) => {
	if (
		!Number.isSafeInteger(modifier) ||
		!Number.isSafeInteger(evasionPenalty) ||
		!Number.isSafeInteger(accuracyPenalty)
	)
		throw new RangeError("Accuracy modifiers must be safe whole numbers.");
	const clamp = (threshold: number) => Math.max(2, Math.min(20, threshold));
	// Full evasion growth through Dexterity 20, then one step per four Dexterity.
	const evasionModifier =
		Math.min(modifier, 5) + Math.floor(Math.max(0, modifier - 5) / 2);
	return {
		playerHitThreshold: clamp(
			PLAYER_HIT_THRESHOLD - modifier + accuracyPenalty,
		),
		// Penalties apply after Dexterity growth, then share the usual clamp.
		monsterHitThreshold: clamp(
			MONSTER_HIT_THRESHOLD + evasionModifier - evasionPenalty,
		),
	};
};
export const deriveAccuracy = (
	progression: Progression,
	effects: readonly TimedEffect[] = [],
	equipment?: Partial<Equipment>,
	afflictions: readonly ActiveAffliction[] = [],
) => {
	// Perks are one d20 step (5 points) the other way from an affliction penalty.
	const thresholds = accuracyThresholds(
		deriveAttributes(progression, effects, equipment).dexterityModifier,
		afflictionEvasionSteps(afflictions) -
			(hasPerk(progression, "evasive") ? 1 : 0),
		afflictionAccuracySteps(afflictions) -
			(hasPerk(progression, "precise") ? 1 : 0),
	);
	return {
		...thresholds,
		playerHitChance: (21 - thresholds.playerHitThreshold) * 5,
		evadeChance: (thresholds.monsterHitThreshold - 1) * 5,
	};
};
export type AttackProfile = {
	hitThreshold: number;
	minDamage: number;
	maxDamage: number;
};
export type MeleeRolls = {
	d20: () => number;
	damage: (min: number, max: number) => number;
};
export type MeleeOutcome = { hit: boolean; damage: number };
const validateProfile = (profile: AttackProfile): void => {
	if (
		!Number.isInteger(profile.hitThreshold) ||
		profile.hitThreshold < 1 ||
		profile.hitThreshold > 20 ||
		!Number.isInteger(profile.minDamage) ||
		profile.minDamage < 1 ||
		!Number.isInteger(profile.maxDamage) ||
		profile.maxDamage < profile.minDamage
	)
		throw new RangeError("Invalid attack threshold or damage range.");
};
export const attackProfile = (
	nominalDamage: number,
	hitThreshold: number,
): AttackProfile => {
	if (!Number.isInteger(nominalDamage) || nominalDamage < 1)
		throw new RangeError("Nominal damage must be a positive whole number.");
	const profile = {
		hitThreshold,
		minDamage: Math.max(1, nominalDamage - 1),
		maxDamage: nominalDamage + 1,
	};
	validateProfile(profile);
	return profile;
};
export const resolveMeleeAttack = (
	profile: AttackProfile,
	rolls: MeleeRolls,
	armor = 0,
	difficulty = 1,
): MeleeOutcome => {
	validateProfile(profile);
	assertDifficulty(difficulty);
	if (!Number.isInteger(armor) || armor < 0)
		throw new RangeError("Armor must be a nonnegative whole number.");
	const hitRoll = rolls.d20();
	if (!Number.isInteger(hitRoll) || hitRoll < 1 || hitRoll > 20)
		throw new RangeError("A D20 roll must be between 1 and 20.");
	if (hitRoll < profile.hitThreshold) return { hit: false, damage: 0 };
	const raw = rolls.damage(profile.minDamage, profile.maxDamage);
	if (
		!Number.isInteger(raw) ||
		raw < profile.minDamage ||
		raw > profile.maxDamage
	)
		throw new RangeError("Damage roll is outside the attack range.");
	return {
		hit: true,
		damage: resolveIncomingDamage(scaleEnemyValue(raw, difficulty), armor),
	};
};
