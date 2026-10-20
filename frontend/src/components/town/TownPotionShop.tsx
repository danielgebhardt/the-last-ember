import { type RefObject, useLayoutEffect, useRef, useState } from "react";
import type { GameState } from "../../domain/game/GameState";
import { canAddToBag } from "../../domain/items/Bag";
import { ITEM_DEFINITIONS } from "../../domain/items/Item";
import {
	TOWN_POTION_OFFERS,
	type TownPotion,
	townPotionDescription,
	townPotionKinds,
} from "../../domain/town/TownEconomy";
import {
	type BuyTownPotionAction,
	canReachTownPotionStore,
} from "../../domain/town/TownPotionStore";
import ItemIcon from "../items/ItemIcon";
import { Button } from "../ui/button";
import TownServiceDialog, { ConfirmPanel } from "./TownServiceDialog";

const TownPotionShop = ({
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
	onBuy: (action: BuyTownPotionAction) => void;
	mapRef: RefObject<HTMLElement | null>;
}) => {
	const title = useRef<HTMLHeadingElement>(null),
		confirmation = useRef<HTMLFieldSetElement>(null);
	const [pending, setPending] = useState<{
		kind: TownPotion;
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
	const unavailable = (kind: TownPotion): string => {
		if (state.townPotionStock[kind] <= 0) return "Sold out";
		if (state.gold < TOWN_POTION_OFFERS[kind].price) return "Not enough gold";
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
			open={open && canReachTownPotionStore(state)}
			onClose={onClose}
			title="Town potion store"
			titleRef={title}
			mapRef={mapRef}
			gold={state.gold}
			error={error}
			leaveLabel="Leave potion store"
			description="Bottles sealed. Prices less comforting. Finite town stock; no restocking. Buying is free of dungeon time and never restores resources by itself."
		>
			<ul className="grid min-h-0 gap-3 overflow-y-auto sm:grid-cols-2 lg:grid-cols-4">
				{townPotionKinds.map((kind) => (
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
						<p className="text-muted-foreground">
							{townPotionDescription(kind)}
						</p>
						<p>
							{TOWN_POTION_OFFERS[kind].price} gold ·{" "}
							{state.townPotionStock[kind]} remaining
						</p>
						<p>{unavailable(kind)}</p>
						<Button
							variant="outline"
							className="mt-auto min-h-11 whitespace-normal"
							disabled={pending !== null || unavailable(kind) !== "Available"}
							onClick={() =>
								setPending({
									kind,
									expectedStock: state.townPotionStock[kind],
								})
							}
						>
							Buy {ITEM_DEFINITIONS[kind].name}
						</Button>
					</li>
				))}
			</ul>
			{pending ? (
				<ConfirmPanel
					panelRef={confirmation}
					label="Confirm potion purchase"
					legend={`Buy ${ITEM_DEFINITIONS[pending.kind].name} for ${TOWN_POTION_OFFERS[pending.kind].price} gold?`}
					cancelLabel="Cancel purchase"
					confirmLabel="Confirm purchase"
					disabled={
						unavailable(pending.kind) !== "Available" ||
						state.townPotionStock[pending.kind] !== pending.expectedStock
					}
					onCancel={finish}
					onConfirm={() => {
						onBuy({ type: "buy-town-potion", ...pending });
						finish();
					}}
				>
					One bottle. No dungeon turn. Stock and gold change only when
					confirmed.
				</ConfirmPanel>
			) : (
				<p className="shrink-0 border-t pt-3 text-sm text-muted-foreground">
					Choose a bottle to review its purchase. Potions are used from your
					inventory in the dungeon; the town does not buy items.
				</p>
			)}
		</TownServiceDialog>
	);
};
export default TownPotionShop;
