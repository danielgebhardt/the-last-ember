import { Dialog } from "@base-ui/react/dialog";
import { Tabs } from "@base-ui/react/tabs";
import { type RefObject, useLayoutEffect, useRef, useState } from "react";
import type { GameState } from "../../domain/game/GameState";
import { canAddToBag } from "../../domain/items/Bag";
import { compareEquipment } from "../../domain/items/EquipmentComparison";
import { ITEM_DEFINITIONS, type ItemInstance } from "../../domain/items/Item";
import { itemName } from "../../domain/items/ItemValues";
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
import { EmberTab, EmberTabsList } from "../ui/EmberTabs";

// Armor splits by slot so each tab fits without scrolling; weapons stay one list.
const ARMOR_TABS = [
	{ value: "chest-armor", label: "Body armor" },
	{ value: "helmet", label: "Helmets" },
	{ value: "shield", label: "Shields" },
	{ value: "ring", label: "Rings" },
] as const;
type ArmorTab = (typeof ARMOR_TABS)[number]["value"];

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
	const [tab, setTab] = useState<ArmorTab>("chest-armor");
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
	const offerList = (include: (item: ItemInstance) => boolean) => (
		<ul className="grid gap-3 sm:grid-cols-2">
			{townEquipmentOffers()
				.filter((offer) => offer.store === store && include(offer.item))
				.map(({ item, price }) => {
					const comparison = compareEquipment(item, state);
					const reason = unavailable(item.id);
					return (
						<li
							key={item.id}
							className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-3 text-sm"
						>
							<div className="flex items-start justify-between gap-3">
								<h3 className="flex items-center gap-2 font-semibold">
									<span className="size-6 shrink-0">
										<ItemIcon kind={item.kind} />
									</span>
									{itemName(item)}
								</h3>
								<span
									className={`shrink-0 rounded-md border border-amber-700/50 bg-amber-500/10 px-2 py-0.5 font-semibold tabular-nums text-amber-800 dark:text-amber-300 ${reason === "Not enough gold" ? "opacity-60" : ""}`}
								>
									{price} gold
								</span>
							</div>
							<p className="text-muted-foreground">
								{ITEM_DEFINITIONS[item.kind].description}
							</p>
							{comparison && (
								<EquipmentComparisonView comparison={comparison} />
							)}
							<Button
								variant="outline"
								className="mt-auto min-h-11 whitespace-normal"
								disabled={pending !== null || reason !== null}
								onClick={() => setPending(item.id)}
							>
								Buy {itemName(item)}
								{reason ? ` (${reason})` : ""}
							</Button>
						</li>
					);
				})}
		</ul>
	);
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
					// Tabs swap content of different heights; a fixed armor-store height keeps the
					// dialog still while switching. Weapons stay content-sized.
					className={`fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[min(64rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 overflow-hidden rounded-xl border bg-card p-4 shadow-xl ${store === "armor" ? "h-[min(56rem,calc(100dvh-2rem))]" : ""}`}
					onKeyDown={(event) => {
						if (event.repeat && ["Enter", " "].includes(event.key))
							event.preventDefault();
					}}
				>
					<div className="flex shrink-0 flex-wrap items-baseline justify-between gap-x-4">
						<Dialog.Title
							ref={title}
							tabIndex={-1}
							className="text-xl font-semibold outline-none"
						>
							Town {name} store
						</Dialog.Title>
						<p className="font-semibold">Gold: {state.gold}</p>
					</div>
					<Dialog.Description className="shrink-0 text-sm text-muted-foreground">
						{store === "armor"
							? "Protection sold separately from confidence."
							: "Every edge has a price."}{" "}
						Finite stock. Purchases go into your bag; nothing is automatically
						equipped. Compare your whole loadout before buying; equip or sell in
						the dungeon. Town stores do not buy items.
					</Dialog.Description>
					{store === "armor" ? (
						<Tabs.Root
							value={tab}
							onValueChange={(value) => setTab(value as ArmorTab)}
							className="flex min-h-0 flex-1 flex-col gap-3"
						>
							<EmberTabsList aria-label="Armor categories" className="shrink-0">
								{ARMOR_TABS.map(({ value, label }) => (
									<EmberTab key={value} value={value}>
										{label}
									</EmberTab>
								))}
							</EmberTabsList>
							{ARMOR_TABS.map(({ value, label }) => (
								<Tabs.Panel
									key={value}
									value={value}
									aria-label={label}
									className="min-h-0 overflow-y-auto"
								>
									{offerList(
										(item) => ITEM_DEFINITIONS[item.kind].type === value,
									)}
								</Tabs.Panel>
							))}
						</Tabs.Root>
					) : (
						<div className="min-h-0 overflow-y-auto">
							{offerList(() => true)}
						</div>
					)}
					{/* The confirmation area takes space only while it has something to show. */}
					<div
						className={`shrink-0 ${pending || error ? "border-t pt-3" : ""}`}
					>
						{selected && pending ? (
							<fieldset
								ref={confirmation}
								tabIndex={-1}
								aria-label="Confirm equipment purchase"
								className="space-y-2 outline-none"
							>
								<legend className="font-semibold">
									Buy {itemName(selected.item)} for {selected.price} gold?
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
						) : null}
						<p
							role="status"
							className={`text-sm text-muted-foreground ${error ? "pt-2" : ""}`}
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
