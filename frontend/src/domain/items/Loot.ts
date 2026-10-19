import { selectWeighted } from "../content/WeightedSelection";
import type { ItemKind, LootSource } from "./Item";
import { lootWeights } from "./LootWeights";
export const selectLootKind = (
	floor: number,
	source: LootSource,
	random: () => number,
	preferences: Partial<Record<ItemKind, number>> = {},
	includeDiseaseRemedy = false,
): ItemKind | undefined =>
	selectWeighted(
		lootWeights(floor, source, preferences).filter(
			(entry) => includeDiseaseRemedy || entry.value !== "cure-disease-potion",
		),
		random,
	);
