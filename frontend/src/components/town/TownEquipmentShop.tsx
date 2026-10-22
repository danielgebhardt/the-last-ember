import { Tabs } from "@base-ui/react/tabs";
import { type RefObject, useLayoutEffect, useRef, useState } from "react";
import type { GameState } from "../../domain/game/GameState";
import { haggledPrice } from "../../domain/game/PerkEffects";
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
import TownServiceDialog, {
	ConfirmPanel,
	PriceBadge,
} from "./TownServiceDialog";

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
		if (state.gold < haggledPrice(state.progression, offer.price))
			return "Not enough gold";
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
								<PriceBadge
									price={haggledPrice(state.progression, price)}
									dimmed={reason === "Not enough gold"}
								/>
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
		<TownServiceDialog
			open={open && store !== null}
			onClose={onClose}
			title={`Town ${name} store`}
			titleRef={title}
			mapRef={mapRef}
			gold={state.gold}
			error={error}
			leaveLabel={`Leave ${name} store`}
			// Armor tabs swap content of different heights; a fixed height keeps the dialog still.
			className={`w-[min(64rem,calc(100vw-2rem))] ${store === "armor" ? "h-[min(56rem,calc(100dvh-2rem))]" : ""}`}
			description={`${store === "armor" ? "Protection sold separately from confidence." : "Every edge has a price."} Finite stock. Purchases go into your bag; nothing is automatically equipped. Compare your whole loadout before buying; equip from your bag at any time. Town stores do not buy items.`}
		>
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
							{offerList((item) => ITEM_DEFINITIONS[item.kind].type === value)}
						</Tabs.Panel>
					))}
				</Tabs.Root>
			) : (
				<div className="min-h-0 overflow-y-auto">{offerList(() => true)}</div>
			)}
			{selected && pending && (
				<ConfirmPanel
					panelRef={confirmation}
					label="Confirm equipment purchase"
					legend={`Buy ${itemName(selected.item)} for ${haggledPrice(state.progression, selected.price)} gold?`}
					cancelLabel="Cancel purchase"
					confirmLabel="Confirm purchase"
					disabled={unavailable(pending) !== null}
					onCancel={finish}
					onConfirm={() => {
						onBuy({ type: "buy-town-equipment", offerId: pending });
						finish();
					}}
				>
					One specific copy, placed in your bag. No dungeon turn. Your worn
					equipment stays yours.
				</ConfirmPanel>
			)}
		</TownServiceDialog>
	);
};
export default TownEquipmentShop;
