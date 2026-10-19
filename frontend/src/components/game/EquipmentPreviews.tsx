
import { equipmentSlotsFor } from "../../domain/items/Equipment";
import {
	compareEquipment,
	type EquipmentComparisonContext,
} from "../../domain/items/EquipmentComparison";
import type { ItemInstance } from "../../domain/items/Item";
import EquipmentComparisonView from "./EquipmentComparisonView";

const EquipmentPreviews = ({
							   item,
							   context,
						   }: {
	item: ItemInstance;
	context: EquipmentComparisonContext;
}) => {
	const comparisons = equipmentSlotsFor(item)
		.map((slot) => compareEquipment(item, context, slot))
		.filter((comparison) => comparison !== null);

	if (!comparisons.length) return null;

	const changesCapacity = comparisons.some(
		({ before, after }) =>
			before.maxHealth !== after.maxHealth ||
			before.maxMana !== after.maxMana,
	);

	return (
		<div className="grid gap-2">
			{comparisons.map((comparison) => (
				<EquipmentComparisonView
					key={comparison.slot}
					comparison={comparison}
				/>
			))}

			{changesCapacity && (
				<p className="text-xs leading-relaxed text-muted-foreground">
					Equipping items that increase health or mana capacity
					does not refill those resources. Removing capacity
					can reduce your current resources to the new maximum.
				</p>
			)}
		</div>
	);
};

export default EquipmentPreviews;
