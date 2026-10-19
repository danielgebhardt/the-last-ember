import { deriveAttributes } from "../game/Attributes";
import { deriveCombatStats } from "../game/CombatStats";
import type { GameState } from "../game/GameState";
import { maximumMana } from "../game/Mana";
import { attackProfile, deriveAccuracy } from "../game/MeleeRules";
import { maximumHealth } from "../game/PlayerHealth";
import {
	type Equipment,
	type EquipmentSlot,
	equipmentSlotsFor,
	replaceEquipmentSlot,
} from "./Equipment";
import { equipmentBonuses } from "./EquipmentBonuses";
import type { ItemInstance } from "./Item";

export type EquipmentComparisonContext = Pick<
	GameState,
	"equipment" | "player" | "progression" | "effects" | "afflictions"
>;

const loadoutStats = (
	context: EquipmentComparisonContext,
	equipment: Equipment,
) => {
	const { progression, effects } = context;
	const combat = deriveCombatStats(equipment, progression, effects);
	const accuracy = deriveAccuracy(progression, effects, equipment);
	const damage = attackProfile(combat.attack, accuracy.playerHitThreshold);
	const attributes = deriveAttributes(progression, effects, equipment);
	return {
		maxHealth: context.afflictions?.length
			? maximumHealth(progression, equipment, context.afflictions)
			: context.player.maxHealth +
				equipmentBonuses(equipment).health -
				equipmentBonuses(context.equipment).health,
		maxMana: maximumMana(progression, equipment, effects),
		spellPowerBonus: attributes.intelligenceModifier,
		minDamage: damage.minDamage,
		maxDamage: damage.maxDamage,
		armor: combat.armor,
		magicResistance: combat.magicResistance,
		magicResistanceEquipmentBonus: combat.magicResistanceEquipmentBonus,
		hitChance: accuracy.playerHitChance,
		evadeChance: accuracy.evadeChance,
		strength: attributes.strength,
		dexterity: attributes.dexterity,
		intelligence: attributes.intelligence,
	};
};
// Keep raw attributes as secondary benefits, including points between modifier thresholds.
// Include them so a capacity gain does not conceal an attribute loss.
const comparedStats = [
	"maxHealth",
	"maxMana",
	"spellPowerBonus",
	"minDamage",
	"maxDamage",
	"armor",
	"magicResistance",
	"magicResistanceEquipmentBonus",
	"hitChance",
	"evadeChance",
	"strength",
	"dexterity",
	"intelligence",
] as const;
const compareSlot = (
	item: ItemInstance,
	context: EquipmentComparisonContext,
	slot: EquipmentSlot,
) => {
	const before = loadoutStats(context, context.equipment);
	const after = loadoutStats(
		context,
		replaceEquipmentSlot(context.equipment, slot, item),
	);
	const gains = comparedStats.some((stat) => after[stat] > before[stat]);
	const losses = comparedStats.some((stat) => after[stat] < before[stat]);
	const label =
		gains && losses ? "Tradeoff" : gains ? "Better" : losses ? "Lower" : "Same";
	return { slot, before, after, label } as const;
};
// Badges pick the most useful compatible destination; details show every slot.
// This is a preview at the current effect phase, without advancing a turn.
export const compareEquipment = (
	item: ItemInstance,
	context: EquipmentComparisonContext,
	requestedSlot?: EquipmentSlot,
) => {
	const slots = equipmentSlotsFor(item);
	if (!slots.length || (requestedSlot && !slots.includes(requestedSlot)))
		return null;
	if (requestedSlot) return compareSlot(item, context, requestedSlot);
	const rank = { Better: 3, Same: 2, Tradeoff: 1, Lower: 0 };
	return slots
		.map((slot) => compareSlot(item, context, slot))
		.sort((a, b) => rank[b.label] - rank[a.label])[0];
};
