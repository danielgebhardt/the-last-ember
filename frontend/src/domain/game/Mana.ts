import type { Equipment } from "../items/Equipment";
import { equipmentBonuses } from "../items/EquipmentBonuses";
import {
	type ActiveAffliction,
	afflictionModifiers,
} from "./AfflictionDefinitions";
import { deriveAttributes } from "./Attributes";
import type { GameState } from "./GameState";
import { hasPerk } from "./Perks";
import type { Progression } from "./Progression";
import type { TimedEffect } from "./TimedEffects";

export const BASE_MAXIMUM_MANA = 10;
export const DEEP_RESERVES_MANA = 3;
export const MANA_PER_INTELLIGENCE_MODIFIER = 2;
// Afflictions scale the normal pool down (rounded down, minimum 1).
export const maximumMana = (
	progression: Progression,
	equipment?: Partial<Equipment>,
	effects: readonly TimedEffect[] = [],
	afflictions: readonly ActiveAffliction[] = [],
): number => {
	const normal =
		BASE_MAXIMUM_MANA +
		MANA_PER_INTELLIGENCE_MODIFIER *
			deriveAttributes(progression, effects, equipment).intelligenceModifier +
		equipmentBonuses(equipment).mana +
		(hasPerk(progression, "deep-reserves") ? DEEP_RESERVES_MANA : 0);
	const multiplier = afflictions.reduce(
		(product, a) =>
			product * (afflictionModifiers(a.kind).maximumManaMultiplier ?? 1),
		1,
	);
	return multiplier === 1
		? normal
		: Math.max(1, Math.floor(normal * multiplier));
};

export const growManaCapacity = (
	mana: number,
	before: Progression,
	after: Progression,
	equipment?: Partial<Equipment>,
	afflictions: readonly ActiveAffliction[] = [],
): number =>
	mana +
	maximumMana(after, equipment, [], afflictions) -
	maximumMana(before, equipment, [], afflictions);

export const MANA_RECOVERY_INTERVAL = 30;
export const QUICK_RECOVERY_INTERVAL = 24;
export const manaRecoveryInterval = (progression: Progression) =>
	hasPerk(progression, "quick-recovery")
		? QUICK_RECOVERY_INTERVAL
		: MANA_RECOVERY_INTERVAL;
// Suppression is judged before this phase's affliction expiry, so Mana Burn covers its
// whole lifetime, including its final phase. Nothing is stored for after it ends.
export const recoverManaAfterTurn = (
	state: GameState,
	suppressed = false,
): GameState => {
	if (
		suppressed ||
		state.player.health <= 0 ||
		state.quest.victory ||
		state.turn === 0 ||
		state.turn % manaRecoveryInterval(state.progression) !== 0
	)
		return state;
	const mana = Math.min(
		maximumMana(
			state.progression,
			state.equipment,
			state.effects,
			state.afflictions,
		),
		state.mana + 1,
	);
	return mana === state.mana ? state : { ...state, mana };
};
