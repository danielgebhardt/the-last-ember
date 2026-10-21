import { type RefObject, useLayoutEffect, useRef, useState } from "react";
import type { GameState } from "../../domain/game/GameState";
import { canAddToBag } from "../../domain/items/Bag";
import { ITEM_DEFINITIONS, type ItemKind } from "../../domain/items/Item";
import {
	townPotionDescription,
	townPotionKinds,
	townScrollKinds,
} from "../../domain/town/TownEconomy";
import { canReachOpenBuilding } from "../../domain/town/TownServices";
import {
	type BuyTownStockAction,
	TOWN_STOCK_STORES,
} from "../../domain/town/TownStockStores";
import ItemIcon from "../items/ItemIcon";
import { Button } from "../ui/button";
import TownServiceDialog, { ConfirmPanel } from "./TownServiceDialog";

type StoreType = BuyTownStockAction["type"];
// Presentation per store; stock, prices and purchase rules come from the domain.
const STORE_VIEWS: Record<
	StoreType,
	{
		title: string;
		leaveLabel: string;
		description: string;
		kinds: readonly ItemKind[];
		describe: (kind: ItemKind) => string;
		gridClassName: string;
		confirmLabel: string;
		confirmText: string;
		footer: string;
	}
> = {
	"buy-town-potion": {
		title: "Town potion store",
		leaveLabel: "Leave potion store",
		description:
			"Bottles sealed. Prices less comforting. Finite town stock; no restocking. Buying is free of dungeon time and never restores resources by itself.",
		kinds: townPotionKinds,
		describe: (kind) =>
			townPotionDescription(kind as (typeof townPotionKinds)[number]),
		gridClassName: "sm:grid-cols-2 lg:grid-cols-4",
		confirmLabel: "Confirm potion purchase",
		confirmText:
			"One bottle. No dungeon turn. Stock and gold change only when confirmed.",
		footer:
			"Choose a bottle to review its purchase. Drink potions from your inventory or quick slots, in town or the dungeon; the town does not buy items.",
	},
	"buy-town-scroll": {
		title: "Scroll shop",
		leaveLabel: "Leave scroll shop",
		description:
			"Every scroll counted twice. Finite town stock; no restocking. Buying is free of dungeon time.",
		kinds: townScrollKinds,
		describe: (kind) => ITEM_DEFINITIONS[kind].description,
		gridClassName: "sm:grid-cols-2",
		confirmLabel: "Confirm scroll purchase",
		confirmText:
			"One scroll. No dungeon turn. Stock and gold change only when confirmed.",
		footer:
			"Choose a scroll to review its purchase. Read scrolls from your inventory. Enchantment scrolls are dungeon finds only, and the town does not buy items.",
	},
};

const TownStockShop = ({
	store,
	open,
	state,
	error,
	onClose,
	onBuy,
	mapRef,
}: {
	store: StoreType;
	open: boolean;
	state: GameState;
	error: string;
	onClose: () => void;
	onBuy: (action: BuyTownStockAction) => void;
	mapRef: RefObject<HTMLElement | null>;
}) => {
	const view = STORE_VIEWS[store],
		rules = TOWN_STOCK_STORES[store];
	const offers: Readonly<Record<string, { price: number }>> = rules.offers;
	const stock: Readonly<Record<string, number>> = state[rules.stock];
	const title = useRef<HTMLHeadingElement>(null),
		confirmation = useRef<HTMLFieldSetElement>(null);
	const [pending, setPending] = useState<{
		kind: ItemKind;
		expectedStock: number;
	} | null>(null);
	const [focusTitle, setFocusTitle] = useState(false);
	useLayoutEffect(() => {
		if (!open) setPending(null);
	}, [open]);
	useLayoutEffect(() => {
		if (pending) confirmation.current?.focus();
	}, [pending]);
	useLayoutEffect(() => {
		if (open && focusTitle) {
			title.current?.focus();
			setFocusTitle(false);
		}
	}, [open, focusTitle]);
	const unavailable = (kind: ItemKind): string => {
		if (stock[kind] <= 0) return "Sold out";
		if (state.gold < offers[kind].price) return "Not enough gold";
		if (!canAddToBag(state.bag, { id: "town:preview", kind }))
			return "Bag full — new stack needs a slot";
		return "Available";
	};
	const finish = () => {
		setPending(null);
		setFocusTitle(true);
	};
	return (
		<TownServiceDialog
			open={open && canReachOpenBuilding(state, rules.building)}
			onClose={onClose}
			title={view.title}
			titleRef={title}
			mapRef={mapRef}
			gold={state.gold}
			error={error}
			leaveLabel={view.leaveLabel}
			description={view.description}
		>
			<ul
				className={`grid min-h-0 gap-3 overflow-y-auto ${view.gridClassName}`}
			>
				{view.kinds.map((kind) => (
					<li
						key={kind}
						className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-3 text-sm"
					>
						<h3 className="flex items-center gap-2 font-semibold">
							<span className="size-6 shrink-0">
								<ItemIcon kind={kind} />
							</span>
							{ITEM_DEFINITIONS[kind].name}
						</h3>
						<p className="text-muted-foreground">{view.describe(kind)}</p>
						<p>
							{offers[kind].price} gold · {stock[kind]} remaining
						</p>
						<p>{unavailable(kind)}</p>
						<Button
							variant="outline"
							className="mt-auto min-h-11 whitespace-normal"
							disabled={pending !== null || unavailable(kind) !== "Available"}
							onClick={() => setPending({ kind, expectedStock: stock[kind] })}
						>
							Buy {ITEM_DEFINITIONS[kind].name}
						</Button>
					</li>
				))}
			</ul>
			{pending ? (
				<ConfirmPanel
					panelRef={confirmation}
					label={view.confirmLabel}
					legend={`Buy ${ITEM_DEFINITIONS[pending.kind].name} for ${offers[pending.kind].price} gold?`}
					cancelLabel="Cancel purchase"
					confirmLabel="Confirm purchase"
					disabled={
						unavailable(pending.kind) !== "Available" ||
						stock[pending.kind] !== pending.expectedStock
					}
					onCancel={finish}
					onConfirm={() => {
						onBuy({ type: store, ...pending } as BuyTownStockAction);
						finish();
					}}
				>
					{view.confirmText}
				</ConfirmPanel>
			) : (
				<p className="shrink-0 border-t pt-3 text-sm text-muted-foreground">
					{view.footer}
				</p>
			)}
		</TownServiceDialog>
	);
};
export default TownStockShop;
