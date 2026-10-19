import { Dialog } from "@base-ui/react/dialog";
import { type RefObject, useLayoutEffect, useRef, useState } from "react";
import type { GameState } from "../../domain/game/GameState";
import { canAddToBag } from "../../domain/items/Bag";
import {
	EQUIPMENT_SLOT_LABELS,
	equipmentSlotFor,
} from "../../domain/items/Equipment";
import { compareEquipment } from "../../domain/items/EquipmentComparison";
import { ITEM_DEFINITIONS } from "../../domain/items/Item";
import {
	TOWN_EQUIPMENT_OFFERS,
	townEquipmentOffers,
} from "../../domain/town/TownEquipmentStock";
import {
	type BuyTownEquipmentAction,
	reachableTownEquipmentStore,
} from "../../domain/town/TownEquipmentStore";
import EquipmentComparisonView from "../game/EquipmentComparisonView";
import ItemIcon from "../items/ItemIcon";
import { Button } from "../ui/button";

const TownEquipmentShop = ({
	open,
	state,
	error,
	onClose,
	onBuy,
	mapRef,
}: {
	open: boolean;
	state: GameState;
	error: string;
	onClose: () => void;
	onBuy: (action: BuyTownEquipmentAction) => void;
	mapRef: RefObject<HTMLElement | null>;
}) => {
	const store = reachableTownEquipmentStore(state);
	const title = useRef<HTMLHeadingElement>(null),
		confirmation = useRef<HTMLFieldSetElement>(null);
	const [pending, setPending] = useState<string | null>(null);
	useLayoutEffect(() => {
		if (!open) setPending(null);
	}, [open]);
	useLayoutEffect(() => {
		if (pending) confirmation.current?.focus();
	}, [pending]);
	const unavailable = (id: string) => {
		const offer = TOWN_EQUIPMENT_OFFERS[id];
		if (!state.townEquipmentStock.some((item) => item.id === id))
			return "Sold out";
		if (state.gold < offer.price) return "Not enough gold";
		if (!canAddToBag(state.bag, offer.item)) return "Bag full";
		return null;
	};
	const finish = () => {
		setPending(null);
		title.current?.focus();
	};
	const selected = pending ? TOWN_EQUIPMENT_OFFERS[pending] : null;
	const name = store === "armor" ? "armor" : "weapon";
	return (
		<Dialog.Root
			open={open && store !== null}
			onOpenChange={(value) => {
				if (!value) onClose();
			}}
		>
			<Dialog.Portal>
				<Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs" />
				<Dialog.Popup
					initialFocus={title}
					finalFocus={mapRef}
					className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[min(64rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 overflow-hidden rounded-xl border bg-card p-4 shadow-xl"
					onKeyDown={(event) => {
						if (event.repeat && ["Enter", " "].includes(event.key))
							event.preventDefault();
					}}
				>
					<Dialog.Title
						ref={title}
						tabIndex={-1}
						className="shrink-0 text-xl font-semibold outline-none"
					>
						Town {name} store
					</Dialog.Title>
					<Dialog.Description className="shrink-0 text-sm text-muted-foreground">
						{store === "armor"
							? "Protection sold separately from confidence."
							: "Every edge has a price."}{" "}
						Finite stock. Purchases go into your bag; nothing is automatically
						equipped. Town stores do not buy items.
					</Dialog.Description>
					<p className="shrink-0 font-semibold">Gold: {state.gold}</p>
					<ul className="grid min-h-0 gap-3 overflow-y-auto sm:grid-cols-2">
						{townEquipmentOffers()
							.filter((offer) => offer.store === store)
							.map(({ item, price }) => {
								const definition = ITEM_DEFINITIONS[item.kind],
									comparison = compareEquipment(item, state),
									slot = equipmentSlotFor(item);
								return (
									<li
										key={item.id}
										className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-3 text-sm"
									>
										<h3 className="flex items-center gap-2 font-semibold">
											<span className="size-6 shrink-0">
												<ItemIcon kind={item.kind} />
											</span>
											{definition.name}
											{item.enchantment ? ` +${item.enchantment}` : ""}
										</h3>
										<p className="text-muted-foreground">
											{definition.description}
										</p>
										<p>
											{slot ? EQUIPMENT_SLOT_LABELS[slot] : "Equipment"} ·
											Dungeon tier {definition.minFloor} · Enchantment +
											{item.enchantment ?? 0}
										</p>
										<p>{price} gold</p>
										{comparison && (
											<EquipmentComparisonView comparison={comparison} />
										)}
										<Button
											variant="outline"
											className="mt-auto min-h-11 whitespace-normal"
											disabled={
												pending !== null || unavailable(item.id) !== null
											}
											onClick={() => setPending(item.id)}
										>
											Buy {definition.name}
											{item.enchantment ? ` +${item.enchantment}` : ""}
											{unavailable(item.id) ? ` (${unavailable(item.id)})` : ""}
										</Button>
									</li>
								);
							})}
					</ul>
					<div className="min-h-28 shrink-0 border-t pt-3">
						{selected && pending ? (
							<fieldset
								ref={confirmation}
								tabIndex={-1}
								aria-label="Confirm equipment purchase"
								className="space-y-2 outline-none"
							>
								<legend className="font-semibold">
									Buy {ITEM_DEFINITIONS[selected.item.kind].name}
									{selected.item.enchantment
										? ` +${selected.item.enchantment}`
										: ""}{" "}
									for {selected.price} gold?
								</legend>
								<p className="text-sm">
									One specific copy, placed in your bag. No dungeon turn. Your
									worn equipment stays yours.
								</p>
								<div className="flex flex-wrap gap-2">
									<Button variant="outline" onClick={finish}>
										Cancel purchase
									</Button>
									<Button
										disabled={unavailable(pending) !== null}
										onClick={() => {
											onBuy({ type: "buy-town-equipment", offerId: pending });
											finish();
										}}
									>
										Confirm purchase
									</Button>
								</div>
							</fieldset>
						) : (
							<p className="text-sm text-muted-foreground">
								Compare your whole loadout before buying. Equip or sell
								separately in the dungeon; wandering merchants retain their
								existing sale rules.
							</p>
						)}
						<p
							role="status"
							className="min-h-6 pt-2 text-sm text-muted-foreground"
						>
							{error}
						</p>
					</div>
					<Button
						variant="outline"
						className="min-h-11 shrink-0 self-end"
						onClick={onClose}
					>
						Leave {name} store
					</Button>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
};
export default TownEquipmentShop;
