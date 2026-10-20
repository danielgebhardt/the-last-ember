import { createEquipment, type Equipment } from "../domain/items/Equipment";
import type { EquipmentComparisonContext } from "../domain/items/EquipmentComparison";

export const createComparisonContext = (
	equipment: Equipment = createEquipment(),
	overrides: Partial<EquipmentComparisonContext> = {},
): EquipmentComparisonContext => ({
	equipment,
	player: { health: 7, maxHealth: 10 },
	progression: { experience: 0 },
	effects: [],
	afflictions: [],
	...overrides,
});
