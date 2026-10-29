import { Button } from "@/components/ui/button";
import type { Bag } from "../../domain/items/Bag";
import { ITEM_DEFINITIONS } from "../../domain/items/Item";
import {
	HOTBAR_SLOTS,
	type HotbarSlot,
	hotbarSlotContents,
	type PotionHotbar,
	type PotionKind,
} from "../../domain/items/PotionHotbar";
import ItemIcon from "../items/ItemIcon";
import {
	HOTBAR_CARD_CLASS_NAME,
	HOTBAR_LABEL_CLASS_NAME,
	HOTBAR_SLOT_CLASS_NAME,
	HotbarShortcut,
} from "./HotbarSlot";

const POTION_LABELS: Record<PotionKind, string> = {
	"cure-disease-potion": "Cure Disease",
	"cleansing-potion": "Cleansing",
	"soul-restoration-potion": "Soul",
	bandages: "Bandages",
	"strength-potion": "Strength",
	"dexterity-potion": "Dexterity",
	"intelligence-potion": "Intellect",
	"healing-potion": "Health",
	"mana-potion": "Mana",
	antidote: "Antidote",
	"greater-healing-potion": "Greater heal",
	"greater-mana-potion": "Greater mana",
};

const PotionHotbarView = ({
	bag,
	potionHotbar,
	alive,
	onActivate,
}: {
	bag: Bag;
	potionHotbar: PotionHotbar;
	alive: boolean;
	onActivate: (slot: HotbarSlot) => void;
}) => (
	<section
		aria-label="Potion hotbar"
		className="grid min-w-0 grid-cols-4 items-start gap-1"
	>
		{HOTBAR_SLOTS.map((slot) => {
			const { kind, count } = hotbarSlotContents({ bag, potionHotbar }, slot);
			const label = `Potion slot ${slot}: ${
				kind ? `${ITEM_DEFINITIONS[kind].name}, ${count} carried` : "empty"
			}`;

			return (
				<div key={slot} className={HOTBAR_CARD_CLASS_NAME}>
					<Button
						type="button"
						variant="outline"
						disabled={!alive}
						aria-label={label}
						aria-keyshortcuts={String(slot)}
						title={label}
						onClick={() => onActivate(slot)}
						className={`${HOTBAR_SLOT_CLASS_NAME} ${
							kind && count > 0
								? "border-amber-700/35 dark:border-amber-600/40"
								: "border-dashed"
						}`}
					>
						<HotbarShortcut shortcut={String(slot)} />

						{kind ? (
							<span className={`size-7 ${count === 0 ? "opacity-40" : ""}`}>
								<ItemIcon kind={kind} />
							</span>
						) : (
							<span aria-hidden="true" className="text-muted-foreground/40">
								—
							</span>
						)}

						{kind && (
							<span
								aria-hidden="true"
								className="absolute right-[7px] bottom-[5px] text-[11px] font-medium leading-none tabular-nums"
							>
								{count}
							</span>
						)}
					</Button>

					<span aria-hidden="true" className={HOTBAR_LABEL_CLASS_NAME}>
						{kind ? POTION_LABELS[kind] : "Empty"}
					</span>
				</div>
			);
		})}
	</section>
);

export default PotionHotbarView;
