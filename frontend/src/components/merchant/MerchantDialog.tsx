import { Dialog } from "@base-ui/react/dialog";
import { Tabs } from "@base-ui/react/tabs";
import {
	type ReactNode,
	type RefObject,
	useId,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { Button } from "@/components/ui/button";
import type { GameState } from "../../domain/game/GameState";
import type { Progression } from "../../domain/game/Progression";
import { compareEquipment } from "../../domain/items/EquipmentComparison";
import { ITEM_DEFINITIONS, type ItemInstance } from "../../domain/items/Item";
import { itemName } from "../../domain/items/ItemValues";
import { lowerEquipmentSale } from "../../domain/merchant/LowerEquipmentSales";
import {
	equipmentSaleGold,
	equipmentSalePrice,
	MERCHANT_OFFERS,
	type MerchantSupply,
	merchantPrice,
} from "../../domain/merchant/MerchantRules";
import {
	ItemDragProvider,
	useDraggedItem,
	useItemDrag,
	useItemDropTarget,
} from "../dnd/ItemDrag";
import {
	comparisonDescription,
	comparisonStyles,
} from "../game/EquipmentComparisonView";
import EquipmentPreviews from "../game/EquipmentPreviews";
import ItemIcon from "../items/ItemIcon";
import MerchantIcon from "../objects/MerchantIcon";

const SALE_DROP_ID = "sale";
// Lets a sale button also be dragged onto the sell area; it stays a normal button.
const SaleDragSource = ({
	item,
	enabled,
	render,
}: {
	item: ItemInstance;
	enabled: boolean;
	render: (drag: ReturnType<typeof useItemDrag>) => ReactNode;
}) => {
	const drag = useItemDrag(
		`sale:${item.id}`,
		{ item, name: itemName(item), from: "sale" },
		!enabled,
	);
	return render(drag);
};
// The footer is always a drop target; while gear is dragged it invites the drop,
// which only proposes a sale for confirmation.
const SellDropArea = ({
	enabled,
	progression,
	children,
}: {
	enabled: boolean;
	progression: Progression;
	children: ReactNode;
}) => {
	const drop = useItemDropTarget(SALE_DROP_ID, {
		label: "the sell area",
		accepts: ({ from }) => enabled && from === "sale",
	});
	const dragged = useDraggedItem();
	return (
		<div
			ref={drop.ref}
			className={`h-full rounded-md ${drop.accepts ? `ring-2 ${drop.isOver ? "ring-primary" : "ring-primary/40"}` : ""}`}
		>
			{drop.accepts && dragged?.item ? (
				<p className="flex h-full items-center justify-center p-2 text-sm">
					Drop here to sell {dragged.name} for{" "}
					{equipmentSaleGold(dragged.item, progression)} gold. You will confirm
					first.
				</p>
			) : (
				children
			)}
		</div>
	);
};

type Props = {
	venue?: "dungeon" | "rag-and-bone";
	open: boolean;
	state: GameState;
	error?: string;
	onClose: () => void;
	mapRef: RefObject<HTMLElement | null>;
	onBuy?: (kind: MerchantSupply) => void;
	onSell?: (itemId: string) => void;
	onSellLower?: () => void;
};
const MerchantDialog = ({
	venue = "dungeon",
	open,
	state,
	error,
	onClose,
	mapRef,
	onBuy,
	onSell,
	onSellLower,
}: Props) => {
	const inTown = venue === "rag-and-bone";
	const [confirmLowerSale, setConfirmLowerSale] = useState(false);
	// A gear stack dropped on the sell area waits here for confirmation.
	const [pendingSale, setPendingSale] = useState<ItemInstance | null>(null);
	const saleConfirmationRef = useRef<HTMLFieldSetElement>(null);
	useLayoutEffect(() => {
		if (open && pendingSale)
			saleConfirmationRef.current?.focus({ preventScroll: true });
	}, [open, pendingSale]);
	const confirmationRef = useRef<HTMLFieldSetElement>(null);
	const lowerSale = lowerEquipmentSale(state);
	useLayoutEffect(() => {
		if (open && confirmLowerSale)
			confirmationRef.current?.focus({ preventScroll: true });
	}, [open, confirmLowerSale]);
	useLayoutEffect(() => {
		if (!open) {
			setConfirmLowerSale(false);
			setPendingSale(null);
		}
	}, [open]);
	const titleRef = useRef<HTMLHeadingElement>(null),
		[tab, setTab] = useState<"buy" | "sell">(inTown ? "sell" : "buy");
	const buyTab = useRef<HTMLButtonElement>(null),
		sellTab = useRef<HTMLButtonElement>(null),
		[focusAfterSale, setFocusAfterSale] = useState(false);
	useLayoutEffect(() => {
		if (open && focusAfterSale) {
			sellTab.current?.focus({ preventScroll: true });
			setFocusAfterSale(false);
		}
	}, [open, focusAfterSale]);
	const comparisonId = useId();
	const supplies = Object.keys(MERCHANT_OFFERS) as MerchantSupply[];
	const gear = state.bag.items.filter(
		(item) => equipmentSalePrice(item) !== null,
	);
	const [saleItems, setSaleItems] = useState<readonly ItemInstance[]>(gear);
	// A bulk sale clears its items outright; single sales keep a placeholder.
	const [bulkSold, setBulkSold] = useState<ReadonlySet<string>>(new Set());
	const shownSaleItems = saleItems.filter(
		(item) =>
			!bulkSold.has(item.id) || gear.some((copy) => copy.id === item.id),
	);
	useLayoutEffect(() => {
		setSaleItems((previous) => {
			if (!open) {
				setBulkSold((sold) => (sold.size ? new Set() : sold));
				return previous.length ? [] : previous;
			}
			const added = state.bag.items.filter(
				(item) =>
					equipmentSalePrice(item) !== null &&
					!previous.some((copy) => copy.id === item.id),
			);
			return added.length ? [...previous, ...added] : previous;
		});
	}, [open, state.bag]);
	return (
		<Dialog.Root
			open={open}
			onOpenChange={(value) => {
				if (!value) onClose();
			}}
		>
			<Dialog.Portal>
				<Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 supports-backdrop-filter:backdrop-blur-xs" />
				<Dialog.Popup
					initialFocus={titleRef}
					finalFocus={mapRef}
					// One height for Buy and Sell, so switching tabs never moves the dialog.
					className="fixed top-1/2 left-1/2 z-50 flex h-[calc(100dvh-2rem)] w-[min(60rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-2 overflow-hidden rounded-xl border bg-card p-4 shadow-xl sm:h-[min(34rem,calc(100dvh-2rem))]"
					onKeyDown={(event) => {
						if (event.repeat || event.ctrlKey || event.metaKey || event.altKey)
							return;
						const key = event.key.toLowerCase();
						if ((!inTown && key === "b") || key === "s") {
							event.preventDefault();
							event.stopPropagation();
							setTab(key === "b" ? "buy" : "sell");
							setConfirmLowerSale(false);
							(key === "b" ? buyTab.current : sellTab.current)?.focus();
						}
						const index = Number(key) - 1;
						if (
							tab === "buy" &&
							Number.isInteger(index) &&
							index >= 0 &&
							index < supplies.length
						) {
							event.preventDefault();
							event.stopPropagation();
							const kind = supplies[index];
							if (
								onBuy &&
								state.gold >= merchantPrice(kind, state.progression) &&
								state.merchantStock[kind] > 0
							)
								onBuy(kind);
						}
					}}
				>
					<header className="flex shrink-0 items-start justify-between gap-4">
						<div>
							<Dialog.Title
								ref={titleRef}
								tabIndex={-1}
								className="flex items-center gap-2 text-lg font-semibold outline-none"
							>
								<span className="size-7">
									<MerchantIcon />
								</span>
								{inTown ? "The Rag & Bone" : "Wandering potion merchant"}
							</Dialog.Title>
							<Dialog.Description className="mt-1 text-sm text-muted-foreground">
								{inTown
									? "We buy what the ruins failed to keep. Sentiment has no resale value. Browsing and selling do not advance dungeon time."
									: "Shared stock for this adventure. Browsing is free; each trade takes one turn and monsters act."}
							</Dialog.Description>
						</div>
						<Dialog.Close render={<Button variant="outline" />}>
							Close
						</Dialog.Close>
					</header>
					<ItemDragProvider
						onDrop={(source, targetId) => {
							if (targetId === SALE_DROP_ID && source.item) {
								setConfirmLowerSale(false);
								setPendingSale(source.item);
							}
						}}
					>
						<Tabs.Root
							value={tab}
							onValueChange={(value) => {
								if (value === "buy" || value === "sell") {
									setTab(value);
									setConfirmLowerSale(false);
									setPendingSale(null);
								}
							}}
							className="flex min-h-0 flex-1 flex-col gap-2"
						>
							<Tabs.List
								className="flex shrink-0 items-center gap-2 border-b"
								aria-label="Merchant trading"
							>
								{!inTown && (
									<Tabs.Tab
										value="buy"
										ref={buyTab}
										className="rounded-t px-4 py-2 font-semibold data-[active]:border-b-2 data-[active]:border-primary"
									>
										Buy
									</Tabs.Tab>
								)}
								<Tabs.Tab
									value="sell"
									ref={sellTab}
									className="rounded-t px-4 py-2 font-semibold data-[active]:border-b-2 data-[active]:border-primary"
								>
									Sell
								</Tabs.Tab>
								<p className="ml-auto font-semibold tabular-nums">
									Gold {state.gold}
								</p>
							</Tabs.List>
							{!inTown && (
								<Tabs.Panel
									value="buy"
									className="grid min-h-0 flex-1 content-start gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-4"
								>
									{supplies.map((kind, index) => (
										<Button
											key={kind}
											variant="outline"
											className="relative grid h-auto min-w-0 content-start justify-items-start gap-2 whitespace-normal p-3 text-left"
											disabled={
												!onBuy ||
												state.merchantStock[kind] === 0 ||
												state.gold < merchantPrice(kind, state.progression)
											}
											onClick={() => onBuy?.(kind)}
										>
											<kbd className="absolute top-3 right-3 rounded border px-1.5 text-xs text-muted-foreground">
												{index + 1}
											</kbd>
											<span className="size-7 shrink-0">
												<ItemIcon kind={kind} />
											</span>
											<span>
												<span className="block font-semibold">
													{ITEM_DEFINITIONS[kind].name}
												</span>
												<span className="block text-xs text-muted-foreground">
													{merchantPrice(kind, state.progression)} gold ·{" "}
													{state.merchantStock[kind]} remaining
												</span>
												<span className="mt-1 block text-xs font-normal text-muted-foreground">
													{ITEM_DEFINITIONS[kind].description}
												</span>
											</span>
										</Button>
									))}
								</Tabs.Panel>
							)}
							<Tabs.Panel
								value="sell"
								className="min-h-0 flex-1 overflow-y-auto"
							>
								<p className="mb-2 text-xs text-muted-foreground">
									Unequip worn gear first. Sell carried equipment only; supplies
									and the flame stay yours. A single sale leaves its slot until
									you close; a bulk sale clears its items.
								</p>
								{shownSaleItems.length > 0 && (
									<ul className="grid items-start gap-2 sm:grid-cols-2 lg:grid-cols-4">
										{shownSaleItems.map((original) => {
											const current = gear.find(
												(item) => item.id === original.id,
											);
											const sold = !current;
											const item = current ?? original;
											const comparison = compareEquipment(item, state);
											const descriptionId = `${comparisonId}-${item.id}`;
											return (
												<li
													key={item.id}
													className="relative min-w-0 rounded-lg"
												>
													<div
														aria-hidden={sold || undefined}
														className={`grid content-start gap-1 ${sold ? "invisible pointer-events-none opacity-0" : ""}`}
													>
														<SaleDragSource
															item={item}
															enabled={inTown && !!onSell && !sold}
															render={(drag) => (
																<Button
																	ref={drag.ref}
																	variant="outline"
																	className={`h-auto min-h-20 w-full touch-manipulation justify-start gap-2 whitespace-normal p-2 text-left ${comparison ? comparisonStyles[comparison.label].border : ""} ${drag.isDragging ? "opacity-40" : ""}`}
																	aria-label={`${itemName(item)} · Sell for ${equipmentSaleGold(item, state.progression)} gold`}
																	disabled={!onSell || sold}
																	{...drag.dragProps}
																	aria-describedby={drag.describedBy(
																		comparison ? descriptionId : undefined,
																	)}
																	onClick={() => {
																		onSell?.(item.id);
																		setConfirmLowerSale(false);
																		setFocusAfterSale(true);
																	}}
																>
																	<span className="size-6 shrink-0">
																		<ItemIcon kind={item.kind} />
																	</span>
																	<span>
																		<span className="block break-words">
																			{itemName(item)}
																		</span>
																		<span className="block text-xs text-muted-foreground">
																			Sell for{" "}
																			{equipmentSaleGold(
																				item,
																				state.progression,
																			)}{" "}
																			gold
																		</span>
																		{comparison && (
																			<span
																				aria-hidden="true"
																				className={`block text-xs font-medium ${comparisonStyles[comparison.label].text}`}
																			>
																				{comparison.label}
																			</span>
																		)}
																	</span>
																</Button>
															)}
														/>
														{comparison && (
															<>
																<span id={descriptionId} className="sr-only">
																	{comparisonDescription(comparison)}
																</span>
																<details className="text-xs">
																	<summary className="cursor-pointer rounded px-2 py-1 text-muted-foreground">
																		Compare {itemName(item)}
																	</summary>
																	<div className="mt-2">
																		<EquipmentPreviews
																			item={item}
																			context={state}
																		/>
																	</div>
																</details>
															</>
														)}
													</div>
													{sold && (
														<p
															role="status"
															className="absolute inset-0 flex items-center justify-center p-3 text-sm text-muted-foreground"
														>
															Sold: {itemName(item)}
														</p>
													)}
												</li>
											);
										})}
									</ul>
								)}
								{gear.length === 0 && (
									<p className="text-sm text-muted-foreground">
										No carried equipment to sell.
									</p>
								)}
							</Tabs.Panel>
						</Tabs.Root>
						<div
							className={
								tab === "sell"
									? "h-28 shrink-0 overflow-y-auto border-t pt-2 sm:h-16"
									: "hidden"
							}
						>
							{tab === "sell" &&
								(pendingSale ? (
									<fieldset
										ref={saleConfirmationRef}
										tabIndex={-1}
										aria-label="Confirm equipment sale"
										className="flex flex-wrap items-center justify-between gap-2"
									>
										<p className="text-sm">
											Sell {itemName(pendingSale)} for{" "}
											{equipmentSaleGold(pendingSale, state.progression)} gold?
										</p>
										<div className="flex flex-wrap gap-2">
											<Button
												disabled={!onSell}
												onClick={() => {
													onSell?.(pendingSale.id);
													setPendingSale(null);
													setFocusAfterSale(true);
												}}
											>
												Confirm sale
											</Button>
											<Button
												variant="outline"
												onClick={() => {
													setPendingSale(null);
													setFocusAfterSale(true);
												}}
											>
												Cancel sale
											</Button>
										</div>
									</fieldset>
								) : confirmLowerSale ? (
									<fieldset
										ref={confirmationRef}
										tabIndex={-1}
										aria-label="Confirm Lower equipment sale"
										className="flex flex-wrap items-center justify-between gap-2"
									>
										<div>
											<p className="text-sm">
												Sell {lowerSale.items.length} Lower items for{" "}
												{lowerSale.gold} gold?
											</p>
											<p className="text-xs text-muted-foreground">
												{inTown
													? "The whole sale is free of dungeon time."
													: "The whole sale takes one turn, then monsters act once."}
											</p>
										</div>
										<div className="flex flex-wrap gap-2">
											<Button
												disabled={!onSellLower || !lowerSale.items.length}
												onClick={() => {
													onSellLower?.();
													setBulkSold(
														(sold) =>
															new Set([
																...sold,
																...lowerSale.items.map((item) => item.id),
															]),
													);
													setConfirmLowerSale(false);
													setFocusAfterSale(true);
												}}
											>
												Confirm bulk sale
											</Button>
											<Button
												variant="outline"
												onClick={() => {
													setConfirmLowerSale(false);
													setFocusAfterSale(true);
												}}
											>
												Cancel bulk sale
											</Button>
										</div>
									</fieldset>
								) : (
									<SellDropArea
										enabled={inTown && !!onSell}
										progression={state.progression}
									>
										<div className="flex flex-wrap items-center gap-x-4 gap-y-1">
											<Button
												variant="outline"
												disabled={!onSellLower || !lowerSale.items.length}
												onClick={() => setConfirmLowerSale(true)}
											>
												Sell all Lower items ({lowerSale.items.length}) ·{" "}
												{lowerSale.gold} gold
											</Button>
											<p className="text-xs text-muted-foreground">
												Red/Lower gear only. Better, Same and Tradeoff items
												stay yours. You can also drag gear here to sell it.
											</p>
										</div>
									</SellDropArea>
								))}
						</div>
					</ItemDragProvider>
					<div className={error ? "shrink-0" : "hidden"}>
						{error && (
							<p role="alert" className="text-sm text-destructive">
								{error}
							</p>
						)}
					</div>
					<p className="shrink-0 text-xs text-muted-foreground">
						{inTown
							? "Tab and Enter select equipment on Sell · Escape closes."
							: "B / S switches tabs · 1–4 buys on Buy · Tab and Enter select equipment on Sell · Escape closes."}
					</p>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
};
export default MerchantDialog;
