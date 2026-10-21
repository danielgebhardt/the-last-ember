import { Dialog } from "@base-ui/react/dialog";
import { Tabs } from "@base-ui/react/tabs";
import {
	Backpack,
	BookOpen,
	PackageOpen,
	TrendingUp,
	UserRound,
} from "lucide-react";
import {
	type ReactNode,
	type RefObject,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { Button } from "@/components/ui/button";
import { EmberMenuHeader } from "@/components/ui/EmberMenu";
import { EmberTab, EmberTabsList } from "@/components/ui/EmberTabs";
import type { ActivityHistory } from "../../domain/game/ActivityHistory";
import type { QuestState } from "../../domain/game/Adventure";
import type { ActiveAffliction } from "../../domain/game/AfflictionDefinitions";
import { pendingPerkCount } from "../../domain/game/Perks";
import type { PlayerAction } from "../../domain/game/PlayerActions";
import type { PlayerStats } from "../../domain/game/PlayerStats";
import type { Progression } from "../../domain/game/Progression";
import type { SpellHotbar } from "../../domain/game/SpellHotbar";
import type { SpellKind } from "../../domain/game/Spells";
import type { TimedEffect } from "../../domain/game/TimedEffects";
import { type Bag, bagItemKey } from "../../domain/items/Bag";
import {
	EQUIPMENT_SLOT_LABELS,
	type Equipment,
	type EquipmentSlot,
} from "../../domain/items/Equipment";
import type { FloorItem } from "../../domain/items/FloorItems";
import type { PotionHotbar } from "../../domain/items/PotionHotbar";
import {
	ItemDragProvider,
	type ItemDragSource,
	useItemDropTarget,
} from "../dnd/ItemDrag";
import { formatActivityEvent } from "./ActivityMessages";
import BagContents, { BAG_DROP_ID } from "./BagContents";
import { isCharacterShortcut } from "./CharacterShortcut";
import CharacterStats from "./CharacterStats";
import EquipmentView, { equipDropId } from "./EquipmentView";
import FloorItemsView from "./FloorItemsView";
import ItemDetails from "./ItemDetails";
import PerksPanel from "./PerksPanel";
import PotionAssignments, { potionSlotFrom } from "./PotionAssignments";
import ProgressionView from "./ProgressionView";
import QuestStatus from "./QuestStatus";
import SpellsView from "./SpellsView";

const GROUND_DROP_ID = "ground";
// Dragging a bag stack here drops every copy on your tile for one turn, like Drop.
const GroundPanel = ({
	enabled,
	children,
}: {
	enabled: boolean;
	children: ReactNode;
}) => {
	const drop = useItemDropTarget(GROUND_DROP_ID, {
		label: "the ground",
		accepts: ({ from }) => enabled && from === "bag",
	});
	return (
		<div
			ref={drop.ref}
			className={`ember-menu-panel min-w-0 ${
				drop.accepts
					? `ring-2 ${drop.isOver ? "ring-primary" : "ring-primary/40"}`
					: ""
			}`}
		>
			<h3 className="ember-menu-section-heading mb-2 flex items-center gap-2">
				<PackageOpen aria-hidden="true" className="size-4 text-primary" />
				Nearby / Ground
			</h3>
			{children}
		</div>
	);
};

type CharacterDialogProps = {
	afflictions?: readonly ActiveAffliction[];
	effects?: readonly TimedEffect[];
	player: PlayerStats;
	mana: number;
	knownSpells: readonly SpellKind[];
	spellHotbar: SpellHotbar;
	progression: Progression;
	won?: boolean;
	quest: QuestState;
	equipment: Equipment;
	bag: Bag;
	potionHotbar: PotionHotbar;
	floorItems: readonly FloorItem[];
	// The adventure seed fixes each level's perk offers.
	seed: number;
	// Items can only be dropped on the ground in the dungeon.
	inTown?: boolean;
	gold?: number;
	turn: number;
	history: ActivityHistory;
	actionError: string;
	onAction: (action: PlayerAction) => void;
	onCloseRequested: () => void;
	finalFocus?: RefObject<HTMLElement | null>;
};

const CharacterDialog = ({
	player,
	effects = [],
	afflictions = [],
	mana,
	knownSpells,
	spellHotbar,
	progression,
	won = false,
	quest,
	equipment,
	bag,
	potionHotbar,
	floorItems,
	seed,
	inTown = false,
	gold = 0,
	turn,
	history,
	actionError,
	onAction,
	onCloseRequested,
	finalFocus,
}: CharacterDialogProps) => {
	const [selection, setSelection] = useState<
		| { source: "bag"; key: string }
		| { source: "equipment"; slot: EquipmentSlot; id: string }
		| null
	>(null);
	const comparisonContext = {
		equipment,
		player,
		progression,
		effects,
		afflictions,
	};
	const bagHeadingRef = useRef<HTMLHeadingElement>(null);
	const equipmentHeadingRef = useRef<HTMLHeadingElement>(null);
	const selected =
		selection?.source === "bag"
			? bag.items.find((item) => bagItemKey(item) === selection.key)
			: selection?.source === "equipment" &&
					equipment[selection.slot]?.id === selection.id
				? equipment[selection.slot]
				: null;
	const detailsRef = useRef<HTMLDivElement>(null);
	useLayoutEffect(() => {
		if (selection && !selected) setSelection(null);
	}, [selection, selected]);
	const selectedKey = selected
		? selection?.source === "bag"
			? selection.key
			: selected.id
		: null;
	useLayoutEffect(() => {
		if (selectedKey) detailsRef.current?.scrollIntoView?.({ block: "nearest" });
	}, [selectedKey]);
	// A drop is a gesture for an existing button: Equip/Unequip (same turn cost and
	// refusals) or a free shortcut assignment. Afterwards focus follows a moved item
	// wherever it now sits.
	const dragEnabled = player.health > 0 && !won;
	const dropItem = (source: ItemDragSource, targetId: string) => {
		const item = source.item;
		if (!item) return;
		const slot = (Object.keys(EQUIPMENT_SLOT_LABELS) as EquipmentSlot[]).find(
			(s) => equipDropId(s) === targetId,
		);
		const potionSlot = potionSlotFrom(targetId);
		const fromPotionSlot = potionSlotFrom(source.from);
		if (slot && source.from === "bag")
			onAction({ type: "equip", itemId: item.id, slot });
		else if (targetId === BAG_DROP_ID && source.from.startsWith("slot:"))
			onAction({
				type: "unequip",
				slot: source.from.slice("slot:".length) as EquipmentSlot,
			});
		else if (potionSlot)
			onAction({ type: "assign-hotbar", slot: potionSlot, itemId: item.id });
		else if (targetId === BAG_DROP_ID && fromPotionSlot)
			onAction({ type: "clear-hotbar", slot: fromPotionSlot });
		else if (targetId === GROUND_DROP_ID && source.from === "bag")
			onAction({ type: "drop", itemId: item.id, wholeStack: true });
		else return;
		if (source.from === "bag" || source.from.startsWith("slot:")) {
			setSelection(null);
			setFocusItemId(item.id);
		}
	};
	// A potion shortcut dragged off the bar and released is cleared.
	const dropItemNowhere = (source: ItemDragSource) => {
		const fromPotionSlot = potionSlotFrom(source.from);
		if (fromPotionSlot)
			onAction({ type: "clear-hotbar", slot: fromPotionSlot });
	};
	// The action and this request commit in one render, so the moved item is already
	// in its new place when this runs.
	const [focusItemId, setFocusItemId] = useState<string | null>(null);
	useLayoutEffect(() => {
		if (!focusItemId) return;
		document
			.querySelector<HTMLElement>(`[data-item-id="${focusItemId}"]`)
			?.focus({ preventScroll: true });
		setFocusItemId(null);
	}, [focusItemId]);
	const perksWaiting = pendingPerkCount(progression);
	const titleRef = useRef<HTMLHeadingElement>(null);
	const events = history.entries.filter((entry) => entry.event.turn === turn);
	return (
		<Dialog.Portal>
			<Dialog.Backdrop className="fixed inset-0 z-50 bg-black/30 supports-backdrop-filter:backdrop-blur-xs" />
			<Dialog.Popup
				initialFocus={titleRef}
				finalFocus={finalFocus}
				onKeyDown={(event) => {
					if (!isCharacterShortcut(event.key)) return;
					if (
						event.ctrlKey ||
						event.metaKey ||
						event.altKey ||
						event.target instanceof HTMLInputElement ||
						event.target instanceof HTMLTextAreaElement ||
						(event.target instanceof HTMLElement &&
							event.target.isContentEditable)
					)
						return;
					event.preventDefault();
					event.stopPropagation();
					if (!event.repeat) onCloseRequested();
				}}
				className="
   ember-menu-frame
   fixed top-1/2 left-1/2 z-50
   flex h-[min(52rem,calc(100dvh-2rem))]
   max-h-[calc(100dvh-2rem)]
   w-[calc(100%-2rem)] max-w-[86rem]
   -translate-x-1/2 -translate-y-1/2
   flex-col overflow-hidden rounded-xl border
   text-sm text-popover-foreground
"
			>
				<EmberMenuHeader
					className="shrink-0"
					icon={<Backpack className="size-5" />}
					heading={
						<Dialog.Title
							ref={titleRef}
							tabIndex={-1}
							className="ember-menu-title outline-none"
						>
							The Adventurer's Ledger
						</Dialog.Title>
					}
					subtitle={
						<Dialog.Description className="ember-menu-description">
							Your progression, equipment, carried items, and known spells.
						</Dialog.Description>
					}
					actions={
						<Dialog.Close
							render={
								<Button
									variant="outline"
									size="sm"
									className="shrink-0 border-primary/25"
								/>
							}
						>
							Close
						</Dialog.Close>
					}
				/>

				<Tabs.Root
					defaultValue="character"
					className="flex min-h-0 min-w-0 flex-1 flex-col"
				>
					<EmberTabsList aria-label="Character sections" className="px-4 pt-2">
						<EmberTab value="character">
							<UserRound aria-hidden="true" className="size-4" />
							Character
						</EmberTab>

						<EmberTab value="progression">
							<TrendingUp aria-hidden="true" className="size-4" />
							Progression
							{perksWaiting > 0 && (
								<span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
									<span aria-hidden="true">{perksWaiting}</span>
									<span className="sr-only">
										{perksWaiting === 1
											? ", 1 perk available"
											: `, ${perksWaiting} perks available`}
									</span>
								</span>
							)}
						</EmberTab>

						<EmberTab value="spells">
							<BookOpen aria-hidden="true" className="size-4" />
							Spells
						</EmberTab>
					</EmberTabsList>

					<Tabs.Panel
						value="character"
						className="min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-auto"
					>
						<div className="shrink-0 border-b border-primary/20 bg-primary/[0.035] px-4 py-3">
							<CharacterStats
								afflictions={afflictions}
								effects={effects}
								player={player}
								mana={mana}
								equipment={equipment}
								progression={progression}
							/>
						</div>
						<div className="min-w-0 p-2 pb-4">
							<ItemDragProvider
								onDrop={dropItem}
								onDropNowhere={dropItemNowhere}
							>
								<div className="grid min-w-0 items-start gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,38.125rem)]">
									<div className="grid min-w-0 content-start gap-2">
										<EquipmentView
											dragEnabled={dragEnabled}
											equipment={equipment}
											selectedId={
												selection?.source === "equipment"
													? (selected?.id ?? null)
													: null
											}
											headingRef={equipmentHeadingRef}
											onSelect={(slot) => {
												const item = equipment[slot];
												setSelection(
													item
														? { source: "equipment", slot, id: item.id }
														: null,
												);
											}}
										/>
										<PotionAssignments
											enabled={!won}
											bag={bag}
											potionHotbar={potionHotbar}
											onAction={onAction}
										/>
									</div>
									<div className="grid min-w-0 content-start gap-2">
										<BagContents
											dragEnabled={dragEnabled}
											bag={bag}
											comparisonContext={comparisonContext}
											selectedKey={
												selection?.source === "bag" ? selectedKey : null
											}
											headingRef={bagHeadingRef}
											onSelect={(key) => setSelection({ source: "bag", key })}
										>
											{selected && selection ? (
												<div ref={detailsRef} className="min-w-0">
													<ItemDetails
														bag={bag}
														onCancel={() => {
															setSelection(null);
															bagHeadingRef.current?.focus({
																preventScroll: true,
															});
														}}
														item={selected}
														carryingEmber={quest.cureRecovered}
														comparisonContext={comparisonContext}
														potionHotbar={potionHotbar}
														assignmentsEnabled={!won}
														equippedSlot={
															selection.source === "equipment"
																? selection.slot
																: undefined
														}
														alive={player.health > 0 && !won}
														onAction={onAction}
														afterAction={() => {
															const heading =
																selection.source === "bag"
																	? bagHeadingRef
																	: equipmentHeadingRef;
															heading.current?.focus({ preventScroll: true });
														}}
													/>
												</div>
											) : bag.items.length > 0 ? (
												<p className="text-xs text-muted-foreground">
													Select an item to see its details.
												</p>
											) : null}
										</BagContents>
										<QuestStatus quest={quest} pouch />
										<GroundPanel enabled={dragEnabled && !inTown}>
											<FloorItemsView
												compactEmpty
												items={floorItems}
												alive={player.health > 0 && !won}
												onAction={onAction}
											/>
										</GroundPanel>
									</div>
								</div>
							</ItemDragProvider>
						</div>
					</Tabs.Panel>
					<Tabs.Panel
						value="progression"
						className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto"
					>
						<div className="grid min-w-0 items-start gap-3 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
							<ProgressionView
								afflictions={afflictions}
								equipment={equipment}
								effects={effects}
								progression={progression}
							/>
							<PerksPanel
								seed={seed}
								progression={progression}
								enabled={player.health > 0 && !won}
								onAction={onAction}
							/>
						</div>
					</Tabs.Panel>
					<Tabs.Panel
						value="spells"
						className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto"
					>
						<SpellsView
							effects={effects}
							equipment={equipment}
							slots={spellHotbar}
							onAction={onAction}
							assignmentsEnabled={!won}
							knownSpells={knownSpells}
							mana={mana}
							progression={progression}
						/>
					</Tabs.Panel>
				</Tabs.Root>
				<div className="ember-menu-footer grid max-h-36 shrink-0 overflow-y-auto gap-2 px-4 py-3">
					{actionError && (
						<p role="alert" className="text-sm text-destructive">
							{actionError}
						</p>
					)}
					{player.health <= 0 && (
						<p role="alert" className="text-sm text-destructive">
							You died. Start a new dungeon or replay a seed to try again.
						</p>
					)}
					<div
						role="status"
						aria-label="Character activity"
						aria-live="polite"
						aria-atomic="true"
						className="grid gap-1 text-xs leading-relaxed"
					>
						<p className="font-medium tabular-nums">
							Gold {gold} · Turn {turn} · Health {player.health} /{" "}
							{player.maxHealth}
						</p>
						{events.map((entry) => (
							<p key={entry.id} className="text-muted-foreground">
								{formatActivityEvent(entry.event)}
							</p>
						))}
					</div>
				</div>
			</Dialog.Popup>
		</Dialog.Portal>
	);
};

export default CharacterDialog;
