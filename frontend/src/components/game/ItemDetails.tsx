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
	itemMagicResistance,
	itemName,
} from "../../domain/items/ItemValues";
import {
	HOTBAR_SLOTS,
	type PotionHotbar,
} from "../../domain/items/PotionHotbar";
import ItemIcon from "../items/ItemIcon";
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

	const primaryStat =
		details.type === "potion"
			? "removesAfflictions" in details
				? (details.removesAfflictions as readonly string[]).includes("disease")
					? "Removes Disease · restores capacity without healing"
					: "Removes Slowed and Mana Burn · restores evasion and mana recovery"
				: "cleanses" in details
					? "Removes poison"
					: "permanentAttribute" in details
						? "+1 permanent attribute; each bottle stacks"
						: `Recovery up to ${details.recovery.amount} ${details.recovery.resource}`
			: details.type === "scroll"
				? "removesAfflictions" in details
					? "Removes Curse · restores melee accuracy and damage"
					: "Return to town · costs one scroll and one turn"
				: details.type === "enchantment"
					? "Guaranteed +1 · maximum +3 per item"
					: details.type === "weapon"
						? `Attack bonus +${itemAttackBonus(item)}`
						: details.type === "ring" && "stats" in details
							? Object.entries(details.stats)
									.map(([stat, bonus]) => `+${bonus} ${stat}`)
									.join(" · ")
							: details.type === "shield" ||
									details.type === "chest-armor" ||
									details.type === "helmet"
								? `Armor ${itemArmor(item)}`
								: null;

	const additionalStats =
		"stats" in details && details.type !== "ring"
			? Object.entries(details.stats)
					.map(([stat, bonus]) => `+${bonus} ${stat}`)
					.join(" · ")
			: null;

	return (
		<section
			aria-label="Item details"
			aria-describedby={titleId}
			className="grid min-w-0 gap-3 rounded-lg border border-primary/25 bg-muted/20 p-3"
		>
			<div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] sm:items-start">
				<div className="flex min-w-0 items-start gap-3">
					<div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-background/70 p-2.5">
						<ItemIcon kind={item.kind} />
					</div>

					<div className="grid min-w-0 flex-1 gap-1">
						<h4
							id={titleId}
							className="text-base font-semibold leading-tight text-foreground"
						>
							{itemName(item)}
						</h4>

						<p className="text-xs text-muted-foreground">
							{labels[details.type]}
							{equippedSlot ? ` · ${EQUIPMENT_SLOT_LABELS[equippedSlot]}` : ""}
						</p>

						{equippedSlot && (
							<span className="w-fit rounded-md border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-primary">
								Equipped
							</span>
						)}
					</div>
				</div>

				<p className="text-sm leading-relaxed text-muted-foreground sm:border-l sm:border-primary/15 sm:pl-3">
					{details.description}
				</p>
			</div>

			{itemMagicResistance(item) > 0 && (
				<p className="text-xs font-medium">
					Magic resistance +{itemMagicResistance(item)} percentage points while
					equipped (50% total cap; unchanged by enchantment).
				</p>
			)}
			{(primaryStat || additionalStats) && (
				<div className="flex flex-wrap gap-2">
					{primaryStat && (
						<div className="rounded-md border border-primary/20 bg-background/50 px-3 py-2">
							<p className="text-xs font-medium tabular-nums text-foreground">
								{primaryStat}
							</p>
						</div>
					)}

					{additionalStats && (
						<div className="rounded-md border border-primary/20 bg-background/50 px-3 py-2">
							<p className="text-xs font-medium tabular-nums text-foreground">
								{additionalStats}
							</p>
						</div>
					)}
				</div>
			)}

			{!equippedSlot && (
				<EquipmentPreviews item={item} context={comparisonContext} />
			)}

			<div className="flex flex-wrap gap-2 border-t border-primary/15 pt-3">
				{equippedSlot ? (
					<Button
						type="button"
						variant="outline"
						disabled={!alive}
						onClick={() =>
							act({
								type: "unequip",
								slot: equippedSlot,
							})
						}
					>
						Unequip {EQUIPMENT_SLOT_LABELS[equippedSlot].toLowerCase()}
					</Button>
				) : (
					<>
						{slots.map((slot) => (
							<Button
								type="button"
								key={slot}
								disabled={!alive}
								onClick={() =>
									act({
										type: "equip",
										itemId: item.id,
										slot,
									})
								}
							>
								Equip on {equipmentPlacementLabel(slot)}
							</Button>
						))}

						{details.type === "scroll" && "removesAfflictions" in details && (
							<Button
								type="button"
								disabled={!alive}
								onClick={() => act({ type: "consume", itemId: item.id })}
							>
								Read {details.name}
							</Button>
						)}

						{item.kind === "exit-scroll" && (
							<Button
								type="button"
								disabled={!alive || carryingEmber}
								aria-describedby={carryingEmber ? exitRestrictionId : undefined}
								onClick={() =>
									act({
										type: "exit-dungeon",
										itemId: item.id,
									})
								}
							>
								Read town portal scroll
							</Button>
						)}

						{details.type === "potion" && (
							<Button
								type="button"
								disabled={!alive}
								onClick={() =>
									act({
										type: "consume",
										itemId: item.id,
									})
								}
							>
								Drink potion
							</Button>
						)}

						<Button
							type="button"
							variant="outline"
							disabled={!alive}
							onClick={() =>
								act({
									type: "drop",
									itemId: item.id,
								})
							}
						>
							Drop item
						</Button>
					</>
				)}
			</div>

			{item.kind === "exit-scroll" && carryingEmber && (
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
				<div className="grid gap-2 border-t border-primary/15 pt-3">
					<p className="text-xs font-medium">Potion shortcut</p>

					<p className="text-xs text-muted-foreground">
						Assign a shortcut for free. Choosing another slot moves this
						potion's assignment.
					</p>

					<fieldset
						aria-label="Assign potion shortcut"
						className="flex flex-wrap gap-2"
					>
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
									onAction({
										type: "assign-hotbar",
										slot,
										itemId: item.id,
									})
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
