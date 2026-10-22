import {
	EQUIPMENT_SLOT_LABELS,
	equipmentSlotsFor,
} from "../../domain/items/Equipment";
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

	const changesSpellModifier = comparisons.some(
		({ before, after }) => before.spellPowerBonus !== after.spellPowerBonus,
	);
	const changesCapacity = comparisons.some(
		({ before, after }) =>
			before.maxHealth !== after.maxHealth || before.maxMana !== after.maxMana,
	);

	return (
		<div className="grid gap-2">
			<EquipmentComparisonView comparison={comparisons[0]} />
			{/* A ring fits either hand; the other slot's comparison is one click away. */}
			{comparisons.slice(1).map((comparison) => (
				<details
					key={comparison.slot}
					className="text-xs text-muted-foreground"
				>
					<summary className="cursor-pointer">
						Compare with {EQUIPMENT_SLOT_LABELS[comparison.slot].toLowerCase()}
					</summary>
					<div className="mt-2">
						<EquipmentComparisonView comparison={comparison} />
					</div>
				</details>
			))}
			{changesSpellModifier && (
				<p className="text-xs text-muted-foreground">
					The base spell modifier also improves Heal. Control and movement
					effects do not scale.
				</p>
			)}
			{changesCapacity && (
				<p className="text-xs leading-relaxed text-muted-foreground">
					Capacity gains don't refill health or mana; losing capacity can lower
					them to the new maximum.
				</p>
			)}
		</div>
	);
};

export default EquipmentPreviews;
