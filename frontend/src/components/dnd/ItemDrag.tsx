import {
	type Announcements,
	DndContext,
	type DragEndEvent,
	DragOverlay,
	type DragStartEvent,
	type KeyboardCoordinateGetter,
	KeyboardSensor,
	MouseSensor,
	TouchSensor,
	useDraggable,
	useDroppable,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	createContext,
	type ReactNode,
	use,
	useEffect,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import type { SpellKind } from "../../domain/game/Spells";
import type { ItemInstance } from "../../domain/items/Item";
import { SPELL_ICONS, spellIconColor } from "../game/SpellVisuals";
import ItemIcon from "../items/ItemIcon";

// A dragged item or spell, its spoken name and where it came from; a target
// describes itself and whether it takes that source. Drops only map onto actions the
// dialog already offers by button.
export type ItemDragSource = Readonly<{
	from: string;
	name: string;
	item?: ItemInstance;
	spell?: SpellKind;
}>;
export type ItemDropTarget = Readonly<{
	label: string;
	accepts: (source: ItemDragSource) => boolean;
}>;

// Keyboard: M picks up the focused item, arrows jump between targets that accept
// it, Space or Enter drops and Escape cancels. Space and Enter still select an
// item when nothing is being dragged.
export const DRAG_INSTRUCTIONS =
	"To move an item by keyboard, focus it and press M. Use the arrow keys to choose a highlighted target, then Space or Enter to drop it, or Escape to cancel.";

// Jump to the nearest accepting target in the arrow's direction instead of nudging
// a few pixels, so keyboard dragging goes slot to slot.
const nearestTargetInDirection: KeyboardCoordinateGetter = (
	event,
	{ context, currentCoordinates },
) => {
	const direction = {
		ArrowUp: { x: 0, y: -1 },
		ArrowDown: { x: 0, y: 1 },
		ArrowLeft: { x: -1, y: 0 },
		ArrowRight: { x: 1, y: 0 },
	}[event.code];
	const { active, collisionRect, droppableRects, droppableContainers } =
		context;
	if (!direction || !active || !collisionRect) return undefined;
	event.preventDefault();
	const source = active.data.current as ItemDragSource | undefined;
	const origin = {
		x: collisionRect.left + collisionRect.width / 2,
		y: collisionRect.top + collisionRect.height / 2,
	};
	let best: { x: number; y: number; score: number } | undefined;
	for (const container of droppableContainers.getEnabled()) {
		const target = container.data.current as ItemDropTarget | undefined;
		const rect = droppableRects.get(container.id);
		if (!rect || !target || !source || !target.accepts(source)) continue;
		const center = {
			x: rect.left + rect.width / 2,
			y: rect.top + rect.height / 2,
		};
		const dx = center.x - origin.x;
		const dy = center.y - origin.y;
		const along = dx * direction.x + dy * direction.y;
		if (along <= 1) continue;
		// Prefer targets straight ahead over ones off to the side.
		const score = along + 2 * Math.abs(dx * direction.y + dy * direction.x);
		if (!best || score < best.score) best = { ...center, score };
	}
	return best
		? {
				x: currentCoordinates.x + best.x - origin.x,
				y: currentCoordinates.y + best.y - origin.y,
			}
		: currentCoordinates;
};

const describe = (data: unknown) =>
	(data as ItemDragSource | undefined)?.name ?? "item";
const targetLabel = (data: unknown) =>
	(data as ItemDropTarget | undefined)?.label ?? "this area";
const announcements: Announcements = {
	onDragStart: ({ active }) =>
		`Picked up ${describe(active.data.current)}. Highlighted targets accept it.`,
	onDragOver: ({ active, over }) =>
		over
			? `${describe(active.data.current)} is over ${targetLabel(over.data.current)}.`
			: `${describe(active.data.current)} is not over a target.`,
	onDragEnd: ({ active, over }) =>
		over
			? `Dropped ${describe(active.data.current)} on ${targetLabel(over.data.current)}.`
			: `Returned ${describe(active.data.current)}.`,
	onDragCancel: ({ active }) =>
		`Moving ${describe(active.data.current)} was cancelled.`,
};

const DraggingContext = createContext<ItemDragSource | null>(null);
// The item currently being dragged in this dialog, if any.
export const useDraggedItem = () => use(DraggingContext);

// One drag context per dialog. onDrop runs only for a target that accepts the item;
// anything else snaps back without an action, except that a pointer drag released
// away from every target reports onDropNowhere (a shortcut dragged off its bar).
export const ItemDragProvider = ({
	onDrop,
	onDropNowhere,
	children,
}: {
	onDrop: (source: ItemDragSource, targetId: string) => void;
	onDropNowhere?: (source: ItemDragSource) => void;
	children: ReactNode;
}) => {
	const [dragging, setDragging] = useState<ItemDragSource | null>(null);
	const active = useRef<"keyboard" | "pointer" | null>(null);
	// dnd-kit listens for keys on the document, but the dialog and tabs around a drag
	// get them first: tabs swallow arrows and the dialog closes on Escape. While a
	// drag is active, take those keys at the window and hand dnd-kit its own copy.
	useEffect(() => {
		const forward = (event: KeyboardEvent) => {
			if (!active.current || !event.isTrusted) return;
			const arrow =
				event.code.startsWith("Arrow") && active.current === "keyboard";
			if (!arrow && event.code !== "Escape") return;
			event.preventDefault();
			// Escape cancels the drag only; the dialog never sees it. dnd-kit reads the
			// code, the dialog reads the key, so the copy carries no Escape key.
			if (!arrow) event.stopPropagation();
			const { code } = event;
			const key = arrow ? event.key : "";
			// dnd-kit attaches its listener in a zero-delay timer when the drag starts;
			// queuing behind it means even an immediate key press is seen.
			setTimeout(() =>
				document.dispatchEvent(new KeyboardEvent("keydown", { code, key })),
			);
		};
		window.addEventListener("keydown", forward, true);
		return () => window.removeEventListener("keydown", forward, true);
	}, []);
	const sensors = useSensors(
		// A small movement threshold keeps clicks and taps as selection.
		useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
		// A short press starts a touch drag, so the bag still scrolls with a swipe.
		useSensor(TouchSensor, {
			activationConstraint: { delay: 180, tolerance: 6 },
		}),
		useSensor(KeyboardSensor, {
			keyboardCodes: {
				start: ["KeyM"],
				cancel: ["Escape"],
				end: ["Space", "Enter"],
			},
			coordinateGetter: nearestTargetInDirection,
		}),
	);
	const finish = (event: DragEndEvent, byPointer: boolean) => {
		setDragging(null);
		const source = event.active.data.current as ItemDragSource | undefined;
		const target = event.over?.data.current as ItemDropTarget | undefined;
		if (source && target && event.over && target.accepts(source))
			onDrop(source, String(event.over.id));
		else if (source && !event.over && byPointer) onDropNowhere?.(source);
	};
	return (
		<DndContext
			sensors={sensors}
			accessibility={{
				announcements,
				screenReaderInstructions: { draggable: DRAG_INSTRUCTIONS },
			}}
			onDragStart={(event: DragStartEvent) => {
				setDragging((event.active.data.current as ItemDragSource) ?? null);
				active.current =
					event.activatorEvent instanceof KeyboardEvent
						? "keyboard"
						: "pointer";
			}}
			onDragEnd={(event) => {
				const byPointer = active.current === "pointer";
				active.current = null;
				finish(event, byPointer);
			}}
			onDragCancel={() => {
				active.current = null;
				setDragging(null);
			}}
		>
			<DraggingContext value={dragging}>{children}</DraggingContext>
			{/* In the body, so a transformed dialog can't offset the fixed preview. */}
			{createPortal(
				<DragOverlay dropAnimation={null}>
					{dragging ? (
						<div className="ember-item-slot grid size-14 justify-items-center gap-1 rounded-md border border-primary/60 bg-card p-1 shadow-lg">
							<span className="size-5">
								{dragging.item ? (
									<ItemIcon kind={dragging.item.kind} />
								) : dragging.spell ? (
									<SpellIcon spell={dragging.spell} />
								) : null}
							</span>
							<span className="line-clamp-2 text-center text-[9px] leading-[10px]">
								{dragging.name}
							</span>
						</div>
					) : null}
				</DragOverlay>,
				document.body,
			)}
		</DndContext>
	);
};

const SpellIcon = ({ spell }: { spell: SpellKind }) => {
	const Icon = SPELL_ICONS[spell];
	return (
		<Icon aria-hidden="true" className={`size-full ${spellIconColor(spell)}`} />
	);
};

// Spreads onto the existing slot button: it stays a button for click and keyboard
// selection, and also becomes a drag source. A source that isn't a native button
// (a filled shortcut slot) keeps dnd-kit's own button role and description.
export const useItemDrag = (
	id: string,
	source: ItemDragSource | null,
	disabled = false,
	native = true,
) => {
	const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
		id,
		data: source ?? undefined,
		disabled: disabled || !source,
	});
	// Keep the button's own role, pressed and disabled state and name; the drag
	// instructions join its existing description.
	const {
		role: _role,
		"aria-pressed": _pressed,
		"aria-roledescription": _roleDescription,
		"aria-describedby": instructionsId,
		// A non-draggable item is still a working button for selection.
		"aria-disabled": _dragDisabled,
		...rest
	} = attributes;
	if (!native)
		return {
			ref: setNodeRef,
			dragProps: disabled || !source ? {} : { ...attributes, ...listeners },
			describedBy: () =>
				disabled || !source ? undefined : (instructionsId as string),
			isDragging,
		};
	return {
		ref: setNodeRef,
		dragProps: { ...rest, ...listeners },
		describedBy: (own?: string) =>
			[own, disabled || !source ? undefined : instructionsId]
				.filter(Boolean)
				.join(" ") || undefined,
		isDragging,
	};
};

export const useItemDropTarget = (id: string, target: ItemDropTarget) => {
	const dragged = useDraggedItem();
	const accepts = dragged ? target.accepts(dragged) : false;
	const { setNodeRef, isOver } = useDroppable({
		id,
		data: target,
		disabled: !!dragged && !accepts,
	});
	return { ref: setNodeRef, accepts, isOver, dragging: !!dragged };
};
