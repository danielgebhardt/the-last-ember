import type { Equipment } from "../items/Equipment";
import {
	type ActiveAffliction,
	afflictionAccuracySteps,
	afflictionEvasionSteps,
} from "./AfflictionDefinitions";
import { deriveAttributes } from "./Attributes";
import { resolveIncomingDamage } from "./CombatStats";
import { assertDifficulty, scaleEnemyValue } from "./Difficulty";
import { pactHalvesEvasion } from "./Pacts";
import { hasPerk } from "./Perks";
import type { PlayerStats } from "./PlayerStats";
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
	// One evasion step per four Dexterity, half the accuracy growth.
	const evasionModifier = Math.floor(modifier / 2);
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
// Below a quarter of maximum health, while still alive.
export const isLastStand = (progression: Progression, player: PlayerStats) =>
	hasPerk(progression, "last-stand") &&
	player.health > 0 &&
	player.health * 4 < player.maxHealth;
export const deriveAccuracy = (
	progression: Progression,
	effects: readonly TimedEffect[] = [],
	equipment?: Partial<Equipment>,
	afflictions: readonly ActiveAffliction[] = [],
	// Last stand needs current health; without it, the bonus is not applied.
	player?: PlayerStats,
) => {
	// Perks are d20 steps (5 points each) the other way from an affliction penalty.
	const thresholds = accuracyThresholds(
		deriveAttributes(progression, effects, equipment).dexterityModifier,
		afflictionEvasionSteps(afflictions) -
			(hasPerk(progression, "evasive") ? 1 : 0) +
			(hasPerk(progression, "reckless") ? 1 : 0) -
			(player && isLastStand(progression, player) ? 2 : 0),
		afflictionAccuracySteps(afflictions) -
			(hasPerk(progression, "precise") ? 1 : 0),
	);
	// The Pact of Iron halves evasion, rounding down, but keeps the usual floor.
	const monsterHitThreshold = pactHalvesEvasion(progression)
		? Math.max(2, 1 + Math.floor((thresholds.monsterHitThreshold - 1) / 2))
		: thresholds.monsterHitThreshold;
	return {
		...thresholds,
		monsterHitThreshold,
		playerHitChance: (21 - thresholds.playerHitThreshold) * 5,
		evadeChance: (monsterHitThreshold - 1) * 5,
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
