import type { Equipment } from "../items/Equipment";
import { equipmentBonuses } from "../items/EquipmentBonuses";
import {
	type ActiveAffliction,
	afflictionModifiers,
} from "./AfflictionDefinitions";
import { hasPerk } from "./Perks";
import { DEFAULT_PLAYER_MAX_HEALTH } from "./PlayerStats";
import {
	HEALTH_PER_LEVEL,
	levelForExperience,
	type Progression,
} from "./Progression";
export const TOUGH_HEALTH = 4;
export const maximumHealth = (
	progression: Progression,
	equipment: Equipment,
	afflictions: readonly ActiveAffliction[] = [],
): number => {
	const normal =
		DEFAULT_PLAYER_MAX_HEALTH +
		HEALTH_PER_LEVEL * (levelForExperience(progression.experience) - 1) +
		equipmentBonuses(equipment).health +
		(hasPerk(progression, "tough") ? TOUGH_HEALTH : 0);
	const multiplier = afflictions.reduce(
		(product, a) =>
			product * (afflictionModifiers(a.kind).maximumHealthMultiplier ?? 1),
		1,
	);
	return Math.max(1, Math.floor(normal * multiplier));
};
