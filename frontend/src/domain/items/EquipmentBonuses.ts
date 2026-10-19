import type { Equipment } from "./Equipment";
import { ITEM_DEFINITIONS, type ItemDefinition } from "./Item";
export const equipmentBonuses = (equipment?: Partial<Equipment>) => {
	const bonuses = {
		strength: 0,
		dexterity: 0,
		intelligence: 0,
		health: 0,
		mana: 0,
		armor: 0,
		magicResistance: 0,
	};
	for (const item of Object.values(equipment ?? {})) {
		if (!item) continue;
		const definition: ItemDefinition = ITEM_DEFINITIONS[item.kind];
		const stats = definition.stats;
		bonuses.magicResistance += definition.magicResistance ?? 0;
		if (ITEM_DEFINITIONS[item.kind].type === "ring")
			bonuses.armor += ITEM_DEFINITIONS[item.kind].armor;
		for (const key of [
			"strength",
			"dexterity",
			"intelligence",
			"health",
			"mana",
		] as const)
			bonuses[key] += stats?.[key] ?? 0;
	}
	return bonuses;
};
