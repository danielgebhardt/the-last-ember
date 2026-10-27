import { Dialog } from "@base-ui/react/dialog";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmberMenuHeader } from "@/components/ui/EmberMenu";
import type { PlayerAction } from "../../domain/game/PlayerActions";
import type { Bag } from "../../domain/items/Bag";
import {
	EQUIPMENT_SLOT_LABELS,
	type Equipment,
	type EquipmentSlot,
} from "../../domain/items/Equipment";
import { ITEM_DEFINITIONS, type ItemInstance } from "../../domain/items/Item";
import {
	isEnchantableKind,
	itemArmor,
	itemAttackBonus,
	itemName,
	MAX_ENCHANTMENT,
} from "../../domain/items/ItemValues";
import ItemIcon from "../items/ItemIcon";

const stat = (item: ItemInstance) =>
	ITEM_DEFINITIONS[item.kind].type === "weapon"
		? { label: "Attack", value: itemAttackBonus }
		: { label: "Armor", value: itemArmor };

// Filled pips for the current enchantment, a glowing one for the level it would reach.
const Pips = ({ level, next }: { level: number; next: boolean }) => (
	<span className="flex gap-1" aria-hidden="true">
		{Array.from({ length: MAX_ENCHANTMENT }, (_, index) => (
			<span
				key={index}
				className={`size-2 rotate-45 rounded-[1px] border ${
					index < level
						? "border-primary bg-primary"
						: index === level && next
							? "border-primary bg-primary/30"
							: "border-muted-foreground/40"
				}`}
			/>
		))}
	</span>
);

const TargetCard = ({
	item,
	slot,
	disabled,
	onEnchant,
}: {
	item: ItemInstance;
	slot?: EquipmentSlot;
	disabled: boolean;
	onEnchant: () => void;
}) => {
	const level = item.enchantment ?? 0;
	const capped = level >= MAX_ENCHANTMENT;
	const { label, value } = stat(item);
	const next = { ...item, enchantment: level + 1 };
	return (
		<li>
			<button
				type="button"
				disabled={disabled || capped}
				onClick={onEnchant}
				aria-label={
					capped
						? `${itemName(item)} is fully enchanted`
						: `Enchant ${itemName(item)} to +${level + 1}`
				}
				className="group grid w-full grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 rounded-lg border bg-muted/20 p-3 text-left text-sm transition-colors hover:border-primary hover:bg-primary/10 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-55"
			>
				<span className="row-span-2 size-9">
					<ItemIcon kind={item.kind} />
				</span>
				<span className="flex min-w-0 items-baseline justify-between gap-2">
					<span className="truncate font-semibold">{itemName(item)}</span>
					<span className="shrink-0 text-xs text-muted-foreground">
						{slot ? EQUIPMENT_SLOT_LABELS[slot] : "Bag"}
					</span>
				</span>
				<span className="flex items-center justify-between gap-2">
					<Pips level={level} next={!capped} />
					<span className="text-xs text-muted-foreground">
						{capped ? (
							"Fully enchanted"
						) : (
							<>
								{label} {value(item)} →{" "}
								<span className="font-semibold text-green-700 dark:text-green-400">
									{value(next)}
								</span>
							</>
						)}
					</span>
				</span>
			</button>
		</li>
	);
};

// Opened from an enchantment scroll; stays open so several scrolls can be read in a row.
const EnchantmentDialog = ({
	equipment,
	bag,
	alive,
	onAction,
	onLastScroll,
}: {
	equipment: Equipment;
	bag: Bag;
	alive: boolean;
	onAction: (action: PlayerAction) => void;
	// Reading the last scroll removes it, and this dialog with it; focus moves on first.
	onLastScroll: () => void;
}) => {
	const [open, setOpen] = useState(false);
	// The last piece chosen and its level then; success shows only once the game applied it.
	const [last, setLast] = useState<{ id: string; level: number } | null>(null);
	const titleRef = useRef<HTMLHeadingElement>(null);
	const scrolls = bag.items.filter(
		(item) => item.kind === "enchantment-scroll",
	);
	const worn = (Object.keys(equipment) as EquipmentSlot[]).flatMap((slot) => {
		const item = equipment[slot];
		return item && isEnchantableKind(item.kind) ? [{ item, slot }] : [];
	});
	const carried = bag.items.filter((item) => isEnchantableKind(item.kind));
	const enchanted = [...worn.map(({ item }) => item), ...carried].find(
		(item) => item.id === last?.id && (item.enchantment ?? 0) > last.level,
	);
	const enchant = (item: ItemInstance) => {
		const scroll = scrolls[0];
		if (!scroll) return;
		onAction({ type: "enchant", scrollId: scroll.id, targetItemId: item.id });
		setLast({ id: item.id, level: item.enchantment ?? 0 });
		if (scrolls.length === 1) onLastScroll();
	};
	const section = (
		heading: string,
		entries: { item: ItemInstance; slot?: EquipmentSlot }[],
		empty: string,
	) => (
		<section className="grid gap-2">
			<h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
				{heading}
			</h3>
			{entries.length ? (
				<ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
					{entries.map(({ item, slot }) => (
						<TargetCard
							key={item.id}
							item={item}
							slot={slot}
							disabled={!alive || !scrolls.length}
							onEnchant={() => enchant(item)}
						/>
					))}
				</ul>
			) : (
				<p className="text-sm text-muted-foreground">{empty}</p>
			)}
		</section>
	);
	return (
		<Dialog.Root
			open={open}
			onOpenChange={(value) => {
				setOpen(value);
				if (!value) setLast(null);
			}}
		>
			<Dialog.Trigger render={<Button type="button" disabled={!alive} />}>
				Read enchantment scroll
			</Dialog.Trigger>
			<Dialog.Portal>
				<Dialog.Backdrop className="fixed inset-0 z-50 bg-black/30 supports-backdrop-filter:backdrop-blur-xs" />
				<Dialog.Popup
					initialFocus={titleRef}
					className="ember-menu-frame fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[min(52rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border text-sm text-popover-foreground"
				>
					<EmberMenuHeader
						className="shrink-0"
						icon={
							<span className="size-5">
								<ItemIcon kind="enchantment-scroll" />
							</span>
						}
						heading={
							<Dialog.Title
								ref={titleRef}
								tabIndex={-1}
								className="ember-menu-title outline-none"
							>
								Enchant equipment
							</Dialog.Title>
						}
						subtitle={
							<Dialog.Description className="ember-menu-description">
								Each scroll adds a guaranteed +1, up to +3. Reading is free in town; in the dungeon, it takes one turn.
								Weapons gain attack; shields, chest pieces and helmets gain
								armor.
							</Dialog.Description>
						}
						actions={
							<span className="rounded-full border border-primary/40 px-2.5 py-0.5 text-xs font-semibold tabular-nums">
								{scrolls.length} {scrolls.length === 1 ? "scroll" : "scrolls"}
							</span>
						}
					/>
					<div className="grid min-h-0 gap-4 overflow-y-auto p-4">
						{section("Worn", worn, "Nothing enchantable is worn.")}
						{section(
							"In your bag",
							carried.map((item) => ({ item })),
							"No weapons or armor in your bag.",
						)}
					</div>
					<div className="flex shrink-0 items-center justify-between gap-3 border-t px-4 py-3">
						<p role="status" className="text-sm text-muted-foreground">
							{enchanted
								? `${ITEM_DEFINITIONS[enchanted.kind].name} is now +${enchanted.enchantment}.`
								: scrolls.length
										? "Choose a piece to enchant. Rings cannot be enchanted."
										: "No enchantment scrolls left."}
						</p>
						<Dialog.Close render={<Button variant="outline" />}>
							Done
						</Dialog.Close>
					</div>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
};
export default EnchantmentDialog;
