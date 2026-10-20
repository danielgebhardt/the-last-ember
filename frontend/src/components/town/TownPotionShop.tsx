import { Dialog } from "@base-ui/react/dialog";
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
	return (
		<Dialog.Root
			open={open && canReachTownPotionStore(state)}
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
					<div className="flex shrink-0 flex-wrap items-baseline justify-between gap-x-4">
						<Dialog.Title
							ref={title}
							tabIndex={-1}
							className="text-xl font-semibold outline-none"
						>
							Town potion store
						</Dialog.Title>
						<p className="font-semibold">Gold: {state.gold}</p>
					</div>
					<Dialog.Description className="shrink-0 text-sm text-muted-foreground">
						Bottles sealed. Prices less comforting. Finite town stock; no
						restocking. Buying is free of dungeon time and never restores
						resources by itself.
					</Dialog.Description>
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
									disabled={
										pending !== null || unavailable(kind) !== "Available"
									}
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
					<div className="shrink-0 border-t pt-3">
						{pending ? (
							<fieldset
								ref={confirmation}
								tabIndex={-1}
								aria-label="Confirm potion purchase"
								className="space-y-2 outline-none"
							>
								<legend className="font-semibold">
									Buy {ITEM_DEFINITIONS[pending.kind].name} for{" "}
									{TOWN_POTION_OFFERS[pending.kind].price} gold?
								</legend>
								<p className="text-sm">
									One bottle. No dungeon turn. Stock and gold change only when
									confirmed.
								</p>
								<div className="flex flex-wrap gap-2">
									<Button
										variant="outline"
										onClick={() => {
											setPending(null);
											setFocusTitle(true);
										}}
									>
										Cancel purchase
									</Button>
									<Button
										disabled={
											unavailable(pending.kind) !== "Available" ||
											state.townPotionStock[pending.kind] !==
												pending.expectedStock
										}
										onClick={() => {
											onBuy({ type: "buy-town-potion", ...pending });
											setPending(null);
											setFocusTitle(true);
										}}
									>
										Confirm purchase
									</Button>
								</div>
							</fieldset>
						) : (
							<p className="text-sm text-muted-foreground">
								Choose a bottle to review its purchase. Potions are used from
								your inventory in the dungeon; the town does not buy items.
							</p>
						)}
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
						Leave potion store
					</Button>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
};
export default TownPotionShop;
