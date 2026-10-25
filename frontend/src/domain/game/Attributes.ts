import type { Equipment } from "../items/Equipment";
import { equipmentBonuses } from "../items/EquipmentBonuses";
import { playerEffectBonuses } from "./EffectBonuses";
import { pactStrength } from "./Pacts";
import { permanentAttributeGains } from "./PermanentAttributes";
import {
	levelForExperience,
	MAX_PLAYER_LEVEL,
	type Progression,
} from "./Progression";
import type { TimedEffect } from "./TimedEffects";

export const BASE_ATTRIBUTE = 10;
const ATTRIBUTE_GAIN = 2;
const validateLevel = (level: number): void => {
	if (!Number.isInteger(level) || level < 1 || level > MAX_PLAYER_LEVEL)
		throw new RangeError(
			"Attribute growth requires a supported character level.",
		);
};
export const strengthAtLevel = (level: number): number => {
	validateLevel(level);
	return BASE_ATTRIBUTE + Math.floor((level - 1) / 2) * ATTRIBUTE_GAIN;
};
export const dexterityAtLevel = (level: number): number => {
	validateLevel(level);
	return BASE_ATTRIBUTE + Math.floor(level / 2) * ATTRIBUTE_GAIN;
};
export const intelligenceAtLevel = strengthAtLevel;
export const deriveAttributes = (
	progression: Progression,
	effects: readonly TimedEffect[] = [],
	equipment?: Partial<Equipment>,
) => {
	const level = levelForExperience(progression.experience);
	const temporary = playerEffectBonuses(effects);
	const gear = equipmentBonuses(equipment);
	const permanent = permanentAttributeGains(progression);
	const bonuses = {
		strength: temporary.strength + gear.strength,
		dexterity: temporary.dexterity + gear.dexterity,
	};
	const strength =
		strengthAtLevel(level) +
		bonuses.strength +
		permanent.strength +
		pactStrength(progression);
	const dexterity =
		dexterityAtLevel(level) + bonuses.dexterity + permanent.dexterity;
	const intelligence =
		intelligenceAtLevel(level) +
		gear.intelligence +
		temporary.intelligence +
		permanent.intelligence;
	return {
		intelligence,
		intelligenceModifier: Math.floor((intelligence - BASE_ATTRIBUTE) / 2),
		strength,
		strengthModifier: Math.floor((strength - BASE_ATTRIBUTE) / 2),
		dexterity,
		dexterityModifier: Math.floor((dexterity - BASE_ATTRIBUTE) / 2),
	};
};
