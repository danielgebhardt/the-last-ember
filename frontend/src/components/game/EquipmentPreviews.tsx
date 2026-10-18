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
	return (
		<div className="grid gap-2">
			{comparisons.map((comparison) => (
				<EquipmentComparisonView
					key={comparison.slot}
					comparison={comparison}
				/>
			))}
			<p className="text-xs text-muted-foreground">
				The base spell modifier adds to Heal and ordinary spell damage. Heavy
				attacks add twice this modifier; Renewal and poison add half, rounded
				down. Control and movement effects do not scale. Spell cards show
				current amounts; target defenses and area rules still apply.
				Intelligence also adds modest magic resistance against enemy spells and
				elemental breath.
			</p>
			<p className="text-xs text-muted-foreground">
				Preview uses current active effects, before monsters act. Capacity gains
				do not refill health or mana; removing capacity can clamp current
				resources.
			</p>
		</div>
	);
};
export default EquipmentPreviews;
