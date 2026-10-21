import { FlaskConical, X } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import type { PlayerAction } from "../../domain/game/PlayerActions";
import type { Bag } from "../../domain/items/Bag";
import { ITEM_DEFINITIONS } from "../../domain/items/Item";
import {
	HOTBAR_SLOTS,
	type HotbarSlot,
	hotbarSlotContents,
	isPotionKind,
	type PotionHotbar,
} from "../../domain/items/PotionHotbar";
import { useItemDrag, useItemDropTarget } from "../dnd/ItemDrag";
import ItemIcon from "../items/ItemIcon";

export const POTION_SLOT_PREFIX = "potion-slot:";
export const potionSlotId = (slot: HotbarSlot) =>
	`${POTION_SLOT_PREFIX}${slot}`;
export const potionSlotFrom = (id: string): HotbarSlot | undefined =>
	HOTBAR_SLOTS.find((slot) => potionSlotId(slot) === id);

// A shortcut slot takes a potion dragged from the bag or from another slot; a filled
// slot can itself be dragged to another slot, or off the bar to clear it.
const PotionSlot = ({
	slot,
	bag,
	potionHotbar,
	enabled,
	onClear,
}: {
	slot: HotbarSlot;
	bag: Bag;
	potionHotbar: PotionHotbar;
	enabled: boolean;
	onClear: () => void;
}) => {
	const { kind, count, item } = hotbarSlotContents({ bag, potionHotbar }, slot);
	const drop = useItemDropTarget(potionSlotId(slot), {
		label: `potion slot ${slot}`,
		accepts: ({ item: dragged, from }) =>
			enabled &&
			dragged !== undefined &&
			isPotionKind(dragged.kind) &&
			from !== potionSlotId(slot),
	});
	const drag = useItemDrag(
		`potion-slot-item:${slot}`,
		item
			? {
					item,
					name: ITEM_DEFINITIONS[item.kind].name,
					from: potionSlotId(slot),
				}
			: null,
		!enabled,
		false,
	);
	return (
		<div
			ref={drop.ref}
			className={`relative min-w-0 rounded-md border border-primary/20 bg-background/40 ${
				drop.accepts
					? `ring-2 ${drop.isOver ? "ring-primary" : "ring-primary/40"}`
					: ""
			}`}
		>
			<div
				ref={drag.ref}
				{...drag.dragProps}
				{...(item
					? {
							"aria-label": `Potion slot ${slot}: ${ITEM_DEFINITIONS[item.kind].name}`,
							"aria-describedby": drag.describedBy(),
						}
					: {})}
				className={`flex min-w-0 touch-manipulation flex-col items-center gap-1 rounded-md px-1 py-2 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring ${drag.isDragging ? "opacity-40" : ""}`}
			>
				<span className="text-[10px] text-muted-foreground">Slot {slot}</span>

				{kind ? (
					<span className="size-5 shrink-0">
						<ItemIcon kind={kind} />
					</span>
				) : (
					<span
						aria-hidden="true"
						className="flex size-5 items-center justify-center text-muted-foreground/50"
					>
						+
					</span>
				)}

				<output
					aria-label={`Potion slot ${slot} assignment`}
					className="min-w-0 text-[11px] leading-tight"
				>
					{kind ? ITEM_DEFINITIONS[kind].name : "Empty"}
					{kind && (
						<span className="block text-[10px] text-muted-foreground">
							<span className="sr-only"> · </span>
							{count} carried
						</span>
					)}
				</output>
			</div>

			{kind && (
				<Button
					type="button"
					variant="ghost"
					size="xs"
					disabled={!enabled}
					aria-label={`Clear potion slot ${slot}`}
					title="Clear slot"
					className="absolute right-0 top-0 size-5 p-0 text-muted-foreground hover:text-destructive"
					onClick={onClear}
				>
					<X aria-hidden="true" className="size-3" />
				</Button>
			)}
		</div>
	);
};

const PotionAssignments = ({
	bag,
	potionHotbar,
	onAction,
	enabled = true,
}: {
	bag: Bag;
	enabled?: boolean;
	potionHotbar: PotionHotbar;
	onAction: (action: PlayerAction) => void;
}) => {
	const headingRef = useRef<HTMLHeadingElement>(null);

	return (
		<section
			aria-labelledby="potion-shortcuts-title"
			className="ember-menu-panel grid min-w-0 content-start gap-2"
		>
			<h3
				id="potion-shortcuts-title"
				ref={headingRef}
				tabIndex={-1}
				className="ember-menu-section-heading flex items-center gap-2 outline-none"
			>
				<FlaskConical aria-hidden="true" className="size-4 text-primary" />
				Potion shortcuts
			</h3>

			<div className="grid grid-cols-4 gap-1.5">
				{HOTBAR_SLOTS.map((slot) => (
					<PotionSlot
						key={slot}
						slot={slot}
						bag={bag}
						potionHotbar={potionHotbar}
						enabled={enabled}
						onClear={() => {
							onAction({ type: "clear-hotbar", slot });
							headingRef.current?.focus({ preventScroll: true });
						}}
					/>
				))}
			</div>
		</section>
	);
};

export default PotionAssignments;
