import { useId } from "react";
import { Button } from "@/components/ui/button";
import type { PlayerAction } from "../../domain/game/PlayerActions";
import type { Bag } from "../../domain/items/Bag";
import {
	EQUIPMENT_SLOT_LABELS,
	type EquipmentSlot,
	equipmentPlacementLabel,
	equipmentSlotsFor,
} from "../../domain/items/Equipment";
import type { EquipmentComparisonContext } from "../../domain/items/EquipmentComparison";
import { EXIT_SCROLL_EMBER_RESTRICTION } from "../../domain/items/ExitDungeonScroll";
import { ITEM_DEFINITIONS, type ItemInstance } from "../../domain/items/Item";
import {
	itemArmor,
	itemAttackBonus,
	itemName,
} from "../../domain/items/ItemValues";
import {
	HOTBAR_SLOTS,
	type PotionHotbar,
} from "../../domain/items/PotionHotbar";
import EnchantmentTargets from "./EnchantmentTargets";
import EquipmentPreviews from "./EquipmentPreviews";

const labels = {
	enchantment: "Enchantment scroll",
	scroll: "Travel scroll",
	quest: "Quest item",
	ring: "Ring",
	spellbook: "Spellbook",
	weapon: "Weapon",
	shield: "Shield",
	potion: "Potion",
	"chest-armor": "Chest armor",
	helmet: "Helmet",
};
const ItemDetails = ({
	item,
	bag = { items: [] },
	onCancel,
	comparisonContext,
	equippedSlot,
	alive,
	onAction,
	afterAction,
	potionHotbar,
	assignmentsEnabled = true,
	carryingEmber = false,
}: {
	item: ItemInstance;
	bag?: Bag;
	onCancel?: () => void;
	comparisonContext: EquipmentComparisonContext;
	equippedSlot?: EquipmentSlot;
	alive: boolean;
	onAction: (action: PlayerAction) => void;
	afterAction: () => void;
	potionHotbar: PotionHotbar;
	assignmentsEnabled?: boolean;
	carryingEmber?: boolean;
}) => {
	const titleId = useId();
	const exitRestrictionId = useId();
	const { equipment } = comparisonContext;
	const details = ITEM_DEFINITIONS[item.kind];
	const slots = equipmentSlotsFor(item);
	const act = (action: PlayerAction) => {
		onAction(action);
		afterAction();
	};
	return (
		<section
			aria-labelledby={titleId}
			className="grid gap-2 rounded-lg border bg-muted/30 p-4"
		>
			<h4 id={titleId} className="text-xs font-medium text-muted-foreground">
				Item details
			</h4>
			<p className="font-medium">{itemName(item)}</p>
			<p className="text-xs text-muted-foreground">{labels[details.type]}</p>
			<p className="text-sm leading-relaxed text-muted-foreground">
				{details.description}
			</p>
			<p className="text-xs font-medium tabular-nums">
				{details.type === "potion"
					? "cleanses" in details
						? "Removes poison"
						: "permanentAttribute" in details
							? "+1 permanent attribute; each bottle stacks"
							: `Recovery up to ${details.recovery.amount} ${details.recovery.resource}`
					: details.type === "scroll"
						? "Floor 1 entrance · one scroll and one turn"
						: details.type === "enchantment"
							? "Guaranteed +1; maximum +3 per item"
							: details.type === "weapon"
								? `Attack bonus +${itemAttackBonus(item)}`
								: details.type === "ring" && "stats" in details
									? Object.entries(details.stats)
											.map(([stat, bonus]) => `+${bonus} ${stat}`)
											.join(" · ")
									: `Armor ${itemArmor(item)}`}
			</p>
			{"stats" in details && details.type !== "ring" && (
				<p className="text-xs font-medium">
					{Object.entries(details.stats)
						.map(([stat, bonus]) => `+${bonus} ${stat}`)
						.join(" · ")}
				</p>
			)}
			{!equippedSlot && (
				<EquipmentPreviews item={item} context={comparisonContext} />
			)}
			<div className="flex flex-wrap gap-2">
				{equippedSlot ? (
					<Button
						type="button"
						variant="outline"
						disabled={!alive}
						onClick={() => act({ type: "unequip", slot: equippedSlot })}
					>
						Unequip {EQUIPMENT_SLOT_LABELS[equippedSlot].toLowerCase()}
					</Button>
				) : (
					<>
						<Button
							type="button"
							variant="outline"
							disabled={!alive}
							onClick={() => act({ type: "drop", itemId: item.id })}
						>
							Drop item
						</Button>
						{slots.map((slot) => (
							<Button
								type="button"
								disabled={!alive}
								key={slot}
								onClick={() => act({ type: "equip", itemId: item.id, slot })}
							>
								Equip on {equipmentPlacementLabel(slot)}
							</Button>
						))}
						{details.type === "scroll" && (
							<Button
								type="button"
								disabled={!alive || carryingEmber}
								aria-describedby={carryingEmber ? exitRestrictionId : undefined}
								onClick={() => act({ type: "exit-dungeon", itemId: item.id })}
							>
								Read exit scroll
							</Button>
						)}
						{details.type === "potion" && (
							<Button
								type="button"
								disabled={!alive}
								onClick={() => act({ type: "consume", itemId: item.id })}
							>
								Drink potion
							</Button>
						)}
					</>
				)}
			</div>
			{details.type === "scroll" && carryingEmber && (
				<p id={exitRestrictionId} className="text-sm text-muted-foreground">
					{EXIT_SCROLL_EMBER_RESTRICTION}
				</p>
			)}
			{details.type === "enchantment" && !equippedSlot && (
				<EnchantmentTargets
					scrollId={item.id}
					equipment={equipment}
					bag={bag}
					alive={alive}
					onAction={act}
					onCancel={onCancel ?? afterAction}
				/>
			)}
			{details.type === "potion" && !equippedSlot && (
				<div className="grid gap-2 border-t pt-3">
					<p className="text-xs text-muted-foreground">
						Assign a shortcut (free). Choosing another slot moves this potion's
						assignment.
					</p>
					<fieldset aria-label="Assign potion shortcut" className="flex gap-2">
						{HOTBAR_SLOTS.map((slot) => (
							<Button
								key={slot}
								type="button"
								variant={
									potionHotbar[slot - 1] === item.kind ? "default" : "outline"
								}
								size="sm"
								disabled={!assignmentsEnabled}
								aria-label={`Assign to potion slot ${slot}`}
								aria-pressed={potionHotbar[slot - 1] === item.kind}
								onClick={() =>
									onAction({ type: "assign-hotbar", slot, itemId: item.id })
								}
							>
								{slot}
							</Button>
						))}
					</fieldset>
				</div>
			)}
		</section>
	);
};
export default ItemDetails;
