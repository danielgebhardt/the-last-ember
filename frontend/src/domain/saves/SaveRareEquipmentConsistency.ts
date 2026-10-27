import { isRareEquipmentKind } from "../items/Item";
import { ownedItems } from "../items/OwnedItems";
import { rareFindId, selectRunRareFinds } from "../items/RareFinds";
import { TOWN_EQUIPMENT_OFFERS } from "../town/TownEquipmentStock";
import { unique } from "./SaveConsistencyHelpers";
import type { SaveDocument } from "./SaveDocument";

// A rare is a per-third find this seed selected, or its kind's one town offer.
export const hasConsistentRareEquipment = ({
	state,
}: SaveDocument): boolean => {
	const owned = ownedItems(state);
	const stock = state.townEquipmentStock;
	// A per-third find is one copy of a kind this seed selected; it never enters stock.
	const finds = selectRunRareFinds(
		state.run.seed,
		state.run.floors.length,
		state.guaranteedFeatures?.includes("rareFinds"),
	);
	const found = owned.filter((i) => i.id.startsWith("rare-find:"));
	if (
		!unique(found.map((i) => i.id)) ||
		stock.some((i) => i.id.startsWith("rare-find:")) ||
		found.some(
			(i) =>
				!isRareEquipmentKind(i.kind) ||
				i.id !== rareFindId(i.kind) ||
				!finds.some((find) => find.kind === i.kind),
		)
	)
		return false;
	// Any other rare copy is its kind's one town offer.
	if (
		[...owned, ...stock].some(
			(i) =>
				isRareEquipmentKind(i.kind) &&
				!i.id.startsWith("rare-find:") &&
				TOWN_EQUIPMENT_OFFERS[i.id]?.item.kind !== i.kind,
		)
	)
		return false;
	return true;
};
