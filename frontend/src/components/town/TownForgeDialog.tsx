import { Tabs } from "@base-ui/react/tabs";
import { type RefObject, useLayoutEffect, useRef, useState } from "react";
import type { GameState } from "../../domain/game/GameState";
import {
	EQUIPMENT_SLOT_LABELS,
	type EquipmentSlot,
} from "../../domain/items/Equipment";
import { ITEM_DEFINITIONS, type ItemInstance } from "../../domain/items/Item";
import {
	itemArmor,
	itemAttackBonus,
	itemName,
} from "../../domain/items/ItemValues";
import {
	canReachTownForge,
	ownedForgeItems,
	type TownForgeAction,
	townForgePrice,
	townForgeRefusal,
} from "../../domain/town/TownForge";
import ItemIcon from "../items/ItemIcon";
import { Button } from "../ui/button";
import { EmberTab, EmberTabsList } from "../ui/EmberTabs";
import TownServiceDialog, {
	ConfirmPanel,
	PriceBadge,
} from "./TownServiceDialog";

// Equipped first for convenience; the other tabs list only bag items of that type.
const FORGE_TABS = [
	{
		value: "equipped",
		label: "Equipped",
		empty: "Nothing reforgeable is worn.",
	},
	{ value: "weapon", label: "Weapons", empty: "No weapons in your bag." },
	{
		value: "chest-armor",
		label: "Body armor",
		empty: "No body armor in your bag.",
	},
	{ value: "helmet", label: "Helmets", empty: "No helmets in your bag." },
	{ value: "shield", label: "Shields", empty: "No shields in your bag." },
] as const;
type ForgeTab = (typeof FORGE_TABS)[number]["value"];

// The raised value uses the equipment comparison's improvement green.
const statChange = (item: ItemInstance) => {
	const next = { ...item, enchantment: (item.enchantment ?? 0) + 1 };
	const [label, value] =
		ITEM_DEFINITIONS[item.kind].type === "weapon"
			? ["Attack", itemAttackBonus]
			: ["Armor", itemArmor];
	return (
		<>
			{label} {value(item)} →{" "}
			<span className="font-semibold text-green-700 dark:text-green-400">
				{value(next)}
			</span>
		</>
	);
};

const TownForgeDialog = ({
	open,
	state,
	error,
	onClose,
	onReforge,
	mapRef,
}: {
	open: boolean;
	state: GameState;
	error: string;
	onClose: () => void;
	onReforge: (action: TownForgeAction) => void;
	mapRef: RefObject<HTMLElement | null>;
}) => {
	const title = useRef<HTMLHeadingElement>(null),
		confirmation = useRef<HTMLFieldSetElement>(null);
	const [pending, setPending] = useState<TownForgeAction | null>(null);
	const [tab, setTab] = useState<ForgeTab>("equipped");
	useLayoutEffect(() => {
		if (!open) {
			setPending(null);
			setTab("equipped");
		}
	}, [open]);
	useLayoutEffect(() => {
		if (pending) confirmation.current?.focus();
	}, [pending]);
	const finish = () => {
		setPending(null);
		title.current?.focus();
	};
	const { equipped, bag } = ownedForgeItems(state);
	const slotOf = (item: ItemInstance) =>
		(Object.keys(state.equipment) as EquipmentSlot[]).find(
			(slot) => state.equipment[slot]?.id === item.id,
		);
	const owned = [...equipped, ...bag];
	const selected = pending
		? owned.find((item) => item.id === pending.itemId)
		: undefined;
	const card = (item: ItemInstance) => {
		const price = townForgePrice(item);
		const reason = townForgeRefusal(state, item);
		const slot = slotOf(item);
		const capped = reason?.startsWith("Already") || reason?.startsWith("Rare");
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
						{slot && (
							<span className="text-xs font-normal text-muted-foreground">
								{EQUIPMENT_SLOT_LABELS[slot]}
							</span>
						)}
					</h3>
					{!capped && (
						<PriceBadge price={price} dimmed={reason === "Not enough gold"} />
					)}
				</div>
				<p className="text-muted-foreground">
					{capped ? reason : <>+1: {statChange(item)}</>}
				</p>
				<Button
					variant="outline"
					className="mt-auto min-h-11 whitespace-normal"
					disabled={pending !== null || reason !== null}
					onClick={() =>
						setPending({
							type: "town-forge",
							itemId: item.id,
							enchantment: item.enchantment ?? 0,
							price,
						})
					}
				>
					Reforge {itemName(item)}
					{reason && !capped ? ` (${reason})` : ""}
				</Button>
			</li>
		);
	};
	return (
		<TownServiceDialog
			open={open && canReachTownForge(state)}
			onClose={onClose}
			title="Town forge"
			titleRef={title}
			mapRef={mapRef}
			gold={state.gold}
			error={error}
			leaveLabel="Leave forge"
			// Fixed height: switching tabs never resizes the dialog.
			className="h-[min(44rem,calc(100dvh-2rem))] w-[min(64rem,calc(100vw-2rem))]"
			description="The smith improves what you own, never what you hope to own. Each reforge adds +1 (up to +3) to one ordinary weapon or armor piece, worn or in your bag. Higher tiers and levels cost more. No dungeon turn."
		>
			<Tabs.Root
				value={tab}
				onValueChange={(value) => setTab(value as ForgeTab)}
				className="flex min-h-0 flex-1 flex-col gap-3"
			>
				<EmberTabsList aria-label="Forge categories" className="shrink-0">
					{FORGE_TABS.map(({ value, label }) => (
						<EmberTab key={value} value={value}>
							{label}
						</EmberTab>
					))}
				</EmberTabsList>
				{FORGE_TABS.map(({ value, label, empty }) => {
					const items =
						value === "equipped"
							? equipped
							: bag.filter(
									(item) => ITEM_DEFINITIONS[item.kind].type === value,
								);
					return (
						<Tabs.Panel
							key={value}
							value={value}
							aria-label={label}
							className="min-h-0 overflow-y-auto"
						>
							{items.length ? (
								<ul className="grid gap-3 sm:grid-cols-2">{items.map(card)}</ul>
							) : (
								<p className="text-sm text-muted-foreground">{empty}</p>
							)}
						</Tabs.Panel>
					);
				})}
			</Tabs.Root>
			{pending && selected && (
				<ConfirmPanel
					panelRef={confirmation}
					label="Confirm reforging"
					legend={`Reforge ${itemName(selected)} to +${pending.enchantment + 1} for ${pending.price} gold?`}
					cancelLabel="Cancel reforging"
					confirmLabel="Confirm reforging"
					disabled={townForgeRefusal(state, selected) !== null}
					onCancel={finish}
					onConfirm={() => {
						onReforge(pending);
						finish();
					}}
				>
					{statChange(selected)}. The same item stays where it is. No dungeon
					turn.
				</ConfirmPanel>
			)}
		</TownServiceDialog>
	);
};
export default TownForgeDialog;
