import type { Equipment } from "../items/Equipment";
import { equipmentBonuses } from "../items/EquipmentBonuses";
import {
	type ActiveAffliction,
	AFFLICTION_DEFINITIONS,
} from "./AfflictionDefinitions";
import { DEFAULT_PLAYER_MAX_HEALTH } from "./PlayerStats";
import {
	HEALTH_PER_LEVEL,
	levelForExperience,
	type Progression,
} from "./Progression";
export const maximumHealth = (
	progression: Progression,
	equipment: Equipment,
	afflictions: readonly ActiveAffliction[] = [],
): number => {
	const normal =
		DEFAULT_PLAYER_MAX_HEALTH +
		HEALTH_PER_LEVEL * (levelForExperience(progression.experience) - 1) +
		equipmentBonuses(equipment).health;
	return Math.max(
		1,
		Math.floor(
			normal *
				(afflictions.some((a) => a.kind === "disease")
					? AFFLICTION_DEFINITIONS.disease.modifiers.maximumHealthMultiplier
					: 1),
		),
	);
};
