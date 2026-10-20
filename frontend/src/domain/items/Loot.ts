import { selectWeighted } from "../content/WeightedSelection";
import { ITEM_DEFINITIONS, type ItemKind, type LootSource } from "./Item";
import { lootWeights } from "./LootWeights";
export const selectLootKind = (
	floor: number,
	source: LootSource,
	random: () => number,
	preferences: Partial<Record<ItemKind, number>> = {},
	remedies: readonly ItemKind[] = [],
): ItemKind | undefined =>
	selectWeighted(
		// Each remedy joins the pool only in adventures whose saved marker enables it,
		// so adding one never reinterprets an existing adventure's reward rolls.
		lootWeights(floor, source, preferences).filter(
			(entry) =>
				!("removesAfflictions" in ITEM_DEFINITIONS[entry.value]) ||
				remedies.includes(entry.value),
		),
		random,
	);
