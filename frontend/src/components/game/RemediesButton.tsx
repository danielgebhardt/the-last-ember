import { Popover } from "@base-ui/react/popover";
import { BriefcaseMedical } from "lucide-react";
import {
	type ActiveAffliction,
	AFFLICTION_DEFINITIONS,
	type AfflictionKind,
} from "../../domain/game/AfflictionDefinitions";
import type { Bag } from "../../domain/items/Bag";
import { ITEM_DEFINITIONS } from "../../domain/items/Item";
import { carriedRemedies } from "../../domain/items/Remedies";
import ItemIcon from "../items/ItemIcon";
import {
	HOTBAR_CARD_CLASS_NAME,
	HOTBAR_LABEL_CLASS_NAME,
	HOTBAR_SLOT_CLASS_NAME,
	HotbarShortcut,
} from "./HotbarSlot";

const names = (kinds: readonly AfflictionKind[]) =>
	new Intl.ListFormat("en", { style: "long", type: "conjunction" }).format(
		kinds.map((kind) => AFFLICTION_DEFINITIONS[kind].name),
	);

const RemediesButton = ({
	bag,
	afflictions,
	enabled,
	open,
	onOpenChange,
	onUse,
}: {
	bag: Bag;
	afflictions: readonly ActiveAffliction[];
	enabled: boolean;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onUse: (itemId: string) => void;
}) => {
	const remedies = carriedRemedies(bag, afflictions);
	const needed = remedies.some(({ treats }) => treats.length > 0);

	return (
		<Popover.Root open={open && enabled} onOpenChange={onOpenChange}>
			<div className={HOTBAR_CARD_CLASS_NAME}>
				<Popover.Trigger
					disabled={!enabled}
					aria-label={needed ? "Remedies, cure available" : "Remedies"}
					aria-keyshortcuts="P"
					className={`${HOTBAR_SLOT_CLASS_NAME} border-amber-600/60 bg-amber-500/10 disabled:opacity-50 dark:border-amber-500/50 dark:bg-amber-500/10`}
				>
					<HotbarShortcut shortcut="P" />
					<BriefcaseMedical
						aria-hidden="true"
						className="size-6 text-amber-600 dark:text-amber-400"
					/>
					{needed && (
						<span
							aria-hidden="true"
							className="absolute top-1 right-1 size-2.5 rounded-full bg-red-500 ring-2 ring-background"
						/>
					)}
				</Popover.Trigger>
				<span aria-hidden="true" className={HOTBAR_LABEL_CLASS_NAME}>
					Remedies
				</span>
			</div>
			<Popover.Portal>
				<Popover.Positioner
					side="top"
					align="start"
					sideOffset={10}
					className="z-50"
				>
					<Popover.Popup
						// Number keys pick a listed remedy instead of a potion slot while open.
						onKeyDown={(event) => {
							if (!/^[1-9]$/.test(event.key)) return;
							event.preventDefault();
							const choice = remedies[Number(event.key) - 1];
							if (choice?.treats.length) onUse(choice.itemId);
						}}
						className="ember-menu-panel w-80 rounded-xl border border-amber-700/40 bg-popover p-2 shadow-2xl outline-none"
					>
						<Popover.Title className="flex items-center gap-2 px-2 pt-1 pb-2 font-heading text-sm font-semibold">
							<BriefcaseMedical
								aria-hidden="true"
								className="size-4 text-amber-600 dark:text-amber-400"
							/>
							Remedies
						</Popover.Title>
						{remedies.length === 0 ? (
							<p className="px-2 pb-2 text-sm text-muted-foreground">
								You carry no remedies. Cures for Poison, Disease, Bleeding and
								other conditions appear here once you find or buy them.
							</p>
						) : (
							<ul className="grid gap-1">
								{remedies.map(
									({ kind, itemId, count, cures, treats }, index) => (
										<li key={kind}>
											<button
												type="button"
												disabled={treats.length === 0}
												aria-keyshortcuts={String(index + 1)}
												onClick={() => onUse(itemId)}
												className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border px-2 py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-55 ${
													treats.length
														? "border-amber-600/60 bg-amber-500/10 hover:bg-amber-500/20"
														: "border-border/60"
												}`}
											>
												<span className="relative flex size-9 items-center justify-center rounded-md border border-border/60 bg-background/60 p-1.5">
													<ItemIcon kind={kind} />
													<span
														aria-hidden="true"
														className="absolute -top-1.5 -left-1.5 rounded bg-muted px-1 text-[10px] leading-4 text-muted-foreground"
													>
														{index + 1}
													</span>
												</span>
												<span className="min-w-0">
													<span className="block truncate text-sm font-medium">
														{ITEM_DEFINITIONS[kind].name}
													</span>
													<span
														className={`block text-xs leading-snug ${
															treats.length
																? "font-medium text-amber-700 dark:text-amber-300"
																: "text-muted-foreground"
														}`}
													>
														{treats.length
															? `Cures your ${names(treats)}`
															: `Cures ${names(cures)}`}
													</span>
												</span>
												<span className="rounded-md border border-border/60 px-1.5 text-xs tabular-nums text-muted-foreground">
													<span className="sr-only">, </span>×{count}
												</span>
											</button>
										</li>
									),
								)}
							</ul>
						)}
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	);
};

export default RemediesButton;
