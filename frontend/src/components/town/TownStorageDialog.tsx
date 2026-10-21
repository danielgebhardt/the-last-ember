import { Archive, Backpack } from "lucide-react";
import {
	type ReactNode,
	type RefObject,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import type { GameState } from "../../domain/game/GameState";
import {
	BAG_CAPACITY,
	type BagSlot,
	bagItemKey,
	bagSlots,
} from "../../domain/items/Bag";
import {
	canReachTownStorage,
	STORAGE_CAPACITY,
	storageItemName,
	storageRefusal,
	storageSlots,
	type TownStorageAction,
} from "../../domain/town/TownStorage";
import {
	ItemDragProvider,
	type ItemDragSource,
	useItemDrag,
	useItemDropTarget,
} from "../dnd/ItemDrag";
import ItemIcon from "../items/ItemIcon";
import { Button } from "../ui/button";
import TownServiceDialog from "./TownServiceDialog";

const BAG_SIDE = "storage-bag";
const CHEST_SIDE = "storage-chest";

// One stack: clicking moves it to the other side (Store/Take), and it can also be
// dragged there. A stack that can't move says why and stays put.
const StorageTile = ({
	slot,
	from,
	action,
	refusal,
	onMove,
}: {
	slot: BagSlot;
	from: typeof BAG_SIDE | typeof CHEST_SIDE;
	action: TownStorageAction;
	refusal: string | null;
	onMove: (action: TownStorageAction) => void;
}) => {
	const name = storageItemName(slot.item, slot.count);
	const verb = from === BAG_SIDE ? "Store" : "Take";
	const drag = useItemDrag(
		`${from}:${bagItemKey(slot.item)}`,
		{ item: slot.item, name, from },
		refusal !== null,
	);
	return (
		<li>
			<Button
				ref={drag.ref}
				type="button"
				variant="outline"
				data-item-id={slot.item.id}
				aria-label={`${verb} ${name}`}
				aria-disabled={refusal !== null || undefined}
				{...drag.dragProps}
				aria-describedby={drag.describedBy()}
				title={refusal ?? undefined}
				onClick={() => {
					if (refusal === null) onMove(action);
				}}
				className={`ember-item-slot relative grid h-auto min-h-14 w-full touch-manipulation grid-cols-[1.25rem_1fr] items-center gap-2 whitespace-normal rounded-md p-2 text-left text-xs aria-disabled:opacity-60 ${drag.isDragging ? "opacity-40" : ""}`}
			>
				<span className="size-5">
					<ItemIcon kind={slot.item.kind} />
				</span>
				<span className="min-w-0">
					<span className="block font-medium">{name}</span>
					{refusal && (
						<span className="block text-[10px] text-muted-foreground">
							{refusal}
						</span>
					)}
				</span>
			</Button>
		</li>
	);
};

// Each side is a drop target for stacks coming from the other.
const StorageSide = ({
	id,
	title,
	icon,
	used,
	capacity,
	enabled,
	children,
	empty,
}: {
	id: typeof BAG_SIDE | typeof CHEST_SIDE;
	title: string;
	icon: ReactNode;
	used: number;
	capacity: number;
	enabled: boolean;
	children: ReactNode;
	empty: string;
}) => {
	const drop = useItemDropTarget(id, {
		label: title === "Bag" ? "your bag" : "the storage chest",
		accepts: ({ from }) => enabled && from !== id,
	});
	const headingId = `${id}-title`;
	return (
		<section
			ref={drop.ref}
			aria-labelledby={headingId}
			className={`ember-menu-panel grid min-h-0 min-w-0 content-start gap-2 ${
				drop.accepts
					? `ring-2 ${drop.isOver ? "ring-primary" : "ring-primary/40"}`
					: ""
			}`}
		>
			<div className="flex items-center justify-between gap-2">
				<h3
					id={headingId}
					className="ember-menu-section-heading flex items-center gap-2"
				>
					{icon}
					{title}
				</h3>
				<output
					aria-label={`${title} capacity`}
					className="text-xs tabular-nums text-muted-foreground"
				>
					{used} / {capacity} slots
				</output>
			</div>
			<ul
				aria-label={title === "Bag" ? "Bag items" : "Stored items"}
				className="grid min-h-0 grid-cols-2 gap-2 overflow-y-auto"
			>
				{children}
			</ul>
			{used === 0 && <p className="text-xs text-muted-foreground">{empty}</p>}
		</section>
	);
};

const TownStorageDialog = ({
	open,
	state,
	error,
	onClose,
	onMove,
	mapRef,
}: {
	open: boolean;
	state: GameState;
	error: string;
	onClose: () => void;
	onMove: (action: TownStorageAction) => void;
	mapRef: RefObject<HTMLElement | null>;
}) => {
	const title = useRef<HTMLHeadingElement>(null);
	const enabled = state.player.health > 0 && !state.quest.victory;
	const bag = bagSlots(state.bag);
	const chest = storageSlots(state.townStorage);
	// The action and this request commit in one render, so the moved stack is
	// already on its new side when focus follows it.
	const [focusItemId, setFocusItemId] = useState<string | null>(null);
	useLayoutEffect(() => {
		if (!focusItemId) return;
		document
			.querySelector<HTMLElement>(`[data-item-id="${focusItemId}"]`)
			?.focus({ preventScroll: true });
		setFocusItemId(null);
	}, [focusItemId]);
	const move = (action: TownStorageAction, itemId: string) => {
		onMove(action);
		setFocusItemId(itemId);
	};

	const drop = (source: ItemDragSource, targetId: string) => {
		if (!source.item || source.from === targetId) return;
		const itemKey = bagItemKey(source.item);
		move(
			targetId === CHEST_SIDE
				? { type: "storage-deposit", itemKey }
				: { type: "storage-withdraw", itemKey },
			source.item.id,
		);
	};
	const tiles = (
		slots: readonly BagSlot[],
		from: typeof BAG_SIDE | typeof CHEST_SIDE,
	) =>
		slots.map((slot) => {
			const action: TownStorageAction = {
				type: from === BAG_SIDE ? "storage-deposit" : "storage-withdraw",
				itemKey: bagItemKey(slot.item),
			};
			return (
				<StorageTile
					key={bagItemKey(slot.item)}
					slot={slot}
					from={from}
					action={action}
					refusal={enabled ? storageRefusal(state, action) : "Unavailable"}
					onMove={(next) => move(next, slot.item.id)}
				/>
			);
		});
	return (
		<TownServiceDialog
			open={open && canReachTownStorage(state)}
			onClose={onClose}
			title="Storage chest"
			titleRef={title}
			mapRef={mapRef}
			gold={state.gold}
			error={error}
			leaveLabel="Leave storage"
			className="h-[min(40rem,calc(100dvh-2rem))] w-[min(52rem,calc(100vw-2rem))]"
			description={`Set items aside for this adventure. Select a stack, or drag it across, to move the whole stack; moving is free and costs no dungeon time. The chest holds ${STORAGE_CAPACITY} slots and never the Last Ember.`}
		>
			<ItemDragProvider onDrop={drop}>
				<div className="grid min-h-0 flex-1 gap-3 sm:grid-cols-2">
					<StorageSide
						id={BAG_SIDE}
						title="Bag"
						icon={
							<Backpack aria-hidden="true" className="size-4 text-primary" />
						}
						used={bag.length}
						capacity={BAG_CAPACITY}
						enabled={enabled}
						empty="Your bag is empty."
					>
						{tiles(bag, BAG_SIDE)}
					</StorageSide>
					<StorageSide
						id={CHEST_SIDE}
						title="Chest"
						icon={
							<Archive aria-hidden="true" className="size-4 text-primary" />
						}
						used={chest.length}
						capacity={STORAGE_CAPACITY}
						enabled={enabled}
						empty="Nothing stored yet."
					>
						{tiles(chest, CHEST_SIDE)}
					</StorageSide>
				</div>
			</ItemDragProvider>
		</TownServiceDialog>
	);
};
export default TownStorageDialog;
