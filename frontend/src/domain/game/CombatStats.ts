import type { Equipment } from "../items/Equipment";
import { equipmentBonuses } from "../items/EquipmentBonuses";
import { itemArmor, itemAttackBonus } from "../items/ItemValues";
import { deriveAttributes } from "./Attributes";
import { playerEffectBonuses } from "./EffectBonuses";
import { hasPerk } from "./Perks";
import { BASE_PLAYER_ATTACK_DAMAGE } from "./PlayerStats";
import type { Progression } from "./Progression";
import type { TimedEffect } from "./TimedEffects";

export const deriveCombatStats = (
	equipment: Equipment,
	progression: Progression,
	effects: readonly TimedEffect[] = [],
) => {
	const attributes = deriveAttributes(progression, effects, equipment);
	const strengthBonus = attributes.strengthModifier;
	const bonuses = equipmentBonuses(equipment);
	const weaponBonus = itemAttackBonus(equipment.mainHand);
	const armor = Object.values(armorContributions(equipment)).reduce<number>(
		(sum, value) => sum + value,
		0,
	);
	return {
		magicResistance: Math.min(
			50,
			5 +
				Math.max(0, attributes.intelligenceModifier) +
				bonuses.magicResistance,
		),
		magicResistanceEquipmentBonus: bonuses.magicResistance,
		magicResistanceIntelligenceBonus: Math.max(
			0,
			attributes.intelligenceModifier,
		),
		baseAttack: BASE_PLAYER_ATTACK_DAMAGE,
		weaponBonus,
		strengthBonus,
		perkAttack: perkAttack(progression),
		attack:
			BASE_PLAYER_ATTACK_DAMAGE +
			strengthBonus +
			weaponBonus +
			perkAttack(progression),
		armor:
			armor +
			playerEffectBonuses(effects).armor +
			bonuses.armor +
			(hasPerk(progression, "iron-hide") ? 1 : 0),
	};
};

export const RECKLESS_DAMAGE = 2;
const perkAttack = (progression: Progression) =>
	(hasPerk(progression, "brutal") ? 1 : 0) +
	(hasPerk(progression, "reckless") ? RECKLESS_DAMAGE : 0);

export const resolveIncomingDamage = (
	incoming: number,
	armor: number,
): number => Math.max(1, incoming - armor);

export const armorContributions = (equipment: Equipment) => ({
	shield: itemArmor(equipment.offHand),
	chest: itemArmor(equipment.chest),
	head: itemArmor(equipment.head),
});

// Enemy magic bypasses physical armor. Round only after difficulty scaling and
// resistance, preserving a minimum landed hit and consuming no random rolls.
export const resolveIncomingMagicDamage = (
	incoming: number,
	resistance: number,
): number =>
	Math.max(
		1,
		Math.round(
			(incoming * (100 - Math.max(0, Math.min(50, resistance)))) / 100,
		),
	);
