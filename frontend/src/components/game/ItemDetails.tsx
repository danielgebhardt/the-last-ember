import { useId, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	AFFLICTION_DEFINITIONS,
	type AfflictionKind,
} from "../../domain/game/AfflictionDefinitions";
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
import EnchantmentDialog from "./EnchantmentDialog";
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

// Remedies name exactly what they cure, from the affliction definitions.
const remedyStat = (kinds: readonly AfflictionKind[]) =>
	`Removes ${kinds.map((kind) => AFFLICTION_DEFINITIONS[kind].name).join(" and ")} · one use, one turn`;

// Long descriptions are clamped to keep the details column short; More only
// appears when the clamp actually hides text. Keyed by item, so each item
// starts collapsed.
const ClampedDescription = ({ text }: { text: string }) => {
	const id = useId();
	const paragraph = useRef<HTMLParagraphElement>(null);
	const [expanded, setExpanded] = useState(false);
	const [clamped, setClamped] = useState(false);
	useLayoutEffect(() => {
		const element = paragraph.current;
		if (!element || expanded) return;
		const measure = () =>
			setClamped(element.scrollHeight > element.clientHeight);
		measure();
		if (typeof ResizeObserver === "undefined") return;
		const observer = new ResizeObserver(measure);
		observer.observe(element);
		return () => observer.disconnect();
	}, [expanded]);
	return (
		<div className="@lg:border-l @lg:border-primary/15 @lg:pl-3">
			<p
				id={id}
				ref={paragraph}
				className={`text-sm leading-relaxed text-muted-foreground ${expanded ? "" : "line-clamp-3"}`}
			>
				{text}
			</p>
			{clamped && (
				<button
					type="button"
					aria-expanded={expanded}
					aria-controls={id}
					className="mt-0.5 rounded-sm text-xs font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
					onClick={() => setExpanded(!expanded)}
				>
					{expanded ? "Less" : "More"}
				</button>
			)}
		</div>
	);
};

const ItemDetails = ({
	item,
	bag = { items: [] },
	comparisonContext,
	equippedSlot,
	alive,
	onAction,
	afterAction,
	potionHotbar,
	assignmentsEnabled = true,
	carryingEmber = false,
	inTown = false,
}: {
	item: ItemInstance;
	bag?: Bag;
	comparisonContext: EquipmentComparisonContext;
	equippedSlot?: EquipmentSlot;
	alive: boolean;
	onAction: (action: PlayerAction) => void;
	afterAction: () => void;
	potionHotbar: PotionHotbar;
	assignmentsEnabled?: boolean;
	carryingEmber?: boolean;
	inTown?: boolean;
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
				? remedyStat(details.removesAfflictions)
				: "permanentAttribute" in details
					? "+1 permanent attribute; each bottle stacks"
					: `Recovery up to ${details.recovery.amount} ${details.recovery.resource}`
			: details.type === "scroll"
				? "removesAfflictions" in details
					? remedyStat(details.removesAfflictions)
					: "Return to town · costs one scroll and one turn"
				: details.type === "enchantment"
					? "Guaranteed +1 · maximum +3 per item"
					: details.type === "weapon"
						? `Attack bonus +${itemAttackBonus(item)}${
								"goldBound" in details && details.goldBound
									? ` · +1 per ${details.goldBound.goldPerPoint.toLocaleString("en-US")} gold carried (max +${details.goldBound.maxBonus})`
									: "bloodrage" in details && details.bloodrage
										? ` · +1 per ${details.bloodrage.missingShare * 100}% health missing (max +${details.bloodrage.maxBonus}) · −${details.bloodrage.armorPenalty} armor · health potions restore ${Math.round(details.bloodrage.healingShare * 100)}%`
										: ""
							}`
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
			className="@container grid min-w-0 gap-3 rounded-lg border border-primary/25 bg-muted/20 p-3"
		>
			<div className="grid min-w-0 gap-3 @lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] @lg:items-start">
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

				<ClampedDescription key={item.id} text={details.description} />
			</div>

			{/* Unequipped items show this change in their comparison instead. */}
			{equippedSlot && itemMagicResistance(item) > 0 && (
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

						{details.type === "enchantment" && (
							<EnchantmentDialog
								equipment={equipment}
								bag={bag}
								alive={alive}
								inTown={inTown}
								onAction={onAction}
								onLastScroll={afterAction}
							/>
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
								{item.kind === "bandages" ? "Apply Bandages" : "Drink potion"}
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
