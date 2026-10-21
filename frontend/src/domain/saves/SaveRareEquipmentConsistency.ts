import { isRareEquipmentKind } from "../items/Item";
import { ownedItems } from "../items/OwnedItems";
import {
	rareEquipmentId,
	selectRunRareEquipment,
} from "../items/RareEquipment";
import type { SaveDocument } from "./SaveDocument";

// The allocation survives purchase/pickup and sale, so depleted stock cannot return.
export const hasConsistentRareEquipment = ({
	state,
}: SaveDocument): boolean => {
	const owned = ownedItems(state);
	const stock = state.townEquipmentStock;
	const dungeonRare = owned.filter((i) => i.id.startsWith("rare-gear:"));
	if (
		[...owned, ...stock].some(
			(i) =>
				isRareEquipmentKind(i.kind) &&
				!i.id.startsWith("rare-gear:") &&
				i.id !==
					rareEquipmentId({
						kind: i.kind,
						source: "town",
					}),
		)
	)
		return false;
	const allocation = state.rareEquipment;
	if (!allocation) return dungeonRare.length === 0;
	const selection = selectRunRareEquipment(
		state.run.seed,
		state.run.floors.length,
	);
	if (
		!selection ||
		selection.kind !== allocation.kind ||
		(allocation.source === "town" && selection.source !== "town")
	)
		return false;
	const id = rareEquipmentId(allocation);
	const rare =
		allocation.source === "dungeon"
			? dungeonRare
			: [...owned, ...stock].filter((i) => i.id === id);
	if (
		rare.length > 1 ||
		rare.some((i) => i.id !== id || i.kind !== allocation.kind) ||
		(allocation.source === "town" && dungeonRare.length)
	)
		return false;
	if (allocation.source === "dungeon") {
		if (
			allocation.floorNumber > state.run.floors.length ||
			allocation.floorNumber < 5 ||
			allocation.floorNumber > 20 ||
			stock.some((i) => i.id === id)
		)
			return false;
		const floor = state.run.floors[allocation.floorNumber - 1];
		const p = allocation.coordinate;
		if (
			floor.terrain[p.row]?.[p.col] !== "." ||
			!floor.rooms.some(
				(r) =>
					p.row >= r.startRow &&
					p.row <= r.endRow &&
					p.col >= r.startCol &&
					p.col <= r.endCol,
			)
		)
			return false;
		if (!allocation.acquired)
			return (
				rare.length === 1 &&
				state.floorItems.some(
					(i) =>
						i.item.id === id &&
						i.floorNumber === allocation.floorNumber &&
						i.coordinate.row === p.row &&
						i.coordinate.col === p.col &&
						i.item.enchantment === undefined,
				)
			);
		return true;
	}
	if (allocation.acquired) return !stock.some((i) => i.id === id);
	return rare.length === 1 && stock.some((i) => i.id === id);
};
