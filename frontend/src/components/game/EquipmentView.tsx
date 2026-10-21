import { Shirt } from "lucide-react";
import type { RefObject } from "react";
import { Button } from "@/components/ui/button";
import {
	EQUIPMENT_SLOT_LABELS,
	type Equipment,
	type EquipmentSlot,
	fitsEquipmentSlot,
} from "../../domain/items/Equipment";
import type { ItemInstance } from "../../domain/items/Item";
import { itemName } from "../../domain/items/ItemValues";
import { useItemDrag, useItemDropTarget } from "../dnd/ItemDrag";
import ItemIcon from "../items/ItemIcon";

const slots = [
	{ key: "head", position: "col-start-2 row-start-1" },
	{ key: "mainHand", position: "col-start-1 row-start-2" },
	{ key: "offHand", position: "col-start-3 row-start-2" },
	{ key: "leftRing", position: "col-start-1 row-start-3" },
	{ key: "rightRing", position: "col-start-3 row-start-3" },
	{ key: "chest", position: "col-start-2 row-start-3" },
] as const;

export const equipDropId = (slot: EquipmentSlot) => `equip:${slot}`;
export const slotDragFrom = (slot: EquipmentSlot) => `slot:${slot}`;

// A slot is both a drop target for bag gear that fits it and, when filled, a drag
// source that can be dropped back into the bag.
const EquipmentSlotCell = ({
	slot,
	position,
	item,
	selectedId,
	onSelect,
	dragEnabled,
}: {
	slot: EquipmentSlot;
	position: string;
	item: ItemInstance | null;
	selectedId: string | null;
	onSelect: (slot: EquipmentSlot) => void;
	dragEnabled: boolean;
}) => {
	const label = EQUIPMENT_SLOT_LABELS[slot];
	const drag = useItemDrag(
		`slot-item:${slot}`,
		item ? { item, name: itemName(item), from: slotDragFrom(slot) } : null,
		!dragEnabled,
	);
	const drop = useItemDropTarget(equipDropId(slot), {
		label: `the ${label.toLowerCase()} slot`,
		accepts: ({ item: dragged, from }) =>
			dragEnabled &&
			from === "bag" &&
			dragged !== undefined &&
			fitsEquipmentSlot(dragged, slot),
	});
	return (
		<section
			ref={drop.ref}
			aria-labelledby={`character-${slot}`}
			className={`${position} min-w-0 rounded-md ${drop.accepts ? `ring-2 ${drop.isOver ? "ring-primary" : "ring-primary/40"}` : ""}`}
		>
			<h4
				id={`character-${slot}`}
				className="mb-1 text-center text-xs text-muted-foreground"
			>
				{label}
			</h4>
			<Button
				ref={drag.ref}
				type="button"
				variant="outline"
				data-item-id={item?.id}
				aria-label={`${label}: ${item ? itemName(item) : "empty"}`}
				aria-pressed={selectedId === item?.id && selectedId !== null}
				{...drag.dragProps}
				aria-describedby={drag.describedBy()}
				onClick={() => onSelect(slot)}
				className={`ember-item-slot grid h-auto min-h-12 w-full min-w-0 touch-manipulation justify-items-center gap-1 whitespace-normal rounded-md p-1 text-center ${item ? "border-primary/30" : "border-dashed text-muted-foreground"} ${drag.isDragging ? "opacity-40" : ""}`}
			>
				{item ? (
					<>
						<span className="size-5">
							<ItemIcon kind={item.kind} />
						</span>
						<span className="break-words text-xs">{itemName(item)}</span>
					</>
				) : (
					<span className="text-xs">{label} empty</span>
				)}
			</Button>
		</section>
	);
};

const EquipmentView = ({
	equipment,
	selectedId,
	onSelect,
	headingRef,
	dragEnabled = false,
}: {
	equipment: Equipment;
	selectedId: string | null;
	onSelect: (slot: EquipmentSlot) => void;
	headingRef: RefObject<HTMLHeadingElement | null>;
	dragEnabled?: boolean;
}) => (
	<section
		aria-labelledby="character-equipment-title"
		className="ember-menu-panel grid min-w-0 content-start gap-3"
	>
		<h3
			ref={headingRef}
			tabIndex={-1}
			id="character-equipment-title"
			className="ember-menu-section-heading flex items-center gap-2 outline-none"
		>
			<Shirt aria-hidden="true" className="size-4 text-primary" />
			Equipment
		</h3>
		<div className="grid min-w-0 grid-cols-3 items-center gap-2 rounded-lg border border-primary/15 bg-background/35 p-2">
			{slots.map(({ key, position }) => (
				<EquipmentSlotCell
					key={key}
					slot={key}
					position={position}
					item={equipment[key]}
					selectedId={selectedId}
					onSelect={onSelect}
					dragEnabled={dragEnabled}
				/>
			))}
			<div
				aria-hidden="true"
				className="col-start-2 row-start-2 flex h-16 items-center justify-center text-muted-foreground/50"
			>
				<svg
					aria-hidden="true"
					focusable="false"
					viewBox="0 0 120 220"
					fill="none"
					stroke="currentColor"
					strokeWidth="3"
					strokeLinejoin="round"
					className="h-16 w-12"
				>
					<circle cx="60" cy="24" r="17" />
					<path d="M45 50H75L95 62L110 119L96 123L80 82V132L87 202H69L60 152L51 202H33L40 132V82L24 123L10 119L25 62Z" />
				</svg>
			</div>
		</div>
	</section>
);
export default EquipmentView;
