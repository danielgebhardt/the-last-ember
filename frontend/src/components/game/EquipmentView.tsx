import { Shirt } from "lucide-react";
import type { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { EQUIPMENT_SLOT_LABELS, type Equipment, type EquipmentSlot } from "../../domain/items/Equipment";
import { itemName } from "../../domain/items/ItemValues";
import ItemIcon from "../items/ItemIcon";

const slots = [
	{ key: "head", position: "col-start-2 row-start-1" },
	{ key: "mainHand", position: "col-start-1 row-start-2" },
	{ key: "offHand", position: "col-start-3 row-start-2" },
	{ key: "leftRing", position: "col-start-1 row-start-3" },
	{ key: "rightRing", position: "col-start-3 row-start-3" },
	{ key: "chest", position: "col-start-2 row-start-3" },
] as const;

const EquipmentView = ({ equipment, selectedId, onSelect, headingRef }: {
	equipment: Equipment;
	selectedId: string | null;
	onSelect: (slot: EquipmentSlot) => void;
	headingRef: RefObject<HTMLHeadingElement | null>;
}) => (
	<section aria-labelledby="character-equipment-title" className="ember-menu-panel grid min-w-0 content-start gap-3">
		<h3 ref={headingRef} tabIndex={-1} id="character-equipment-title" className="ember-menu-section-heading flex items-center gap-2 outline-none">
			<Shirt aria-hidden="true" className="size-4 text-primary" />Equipment
		</h3>
		<div className="grid min-w-0 grid-cols-3 items-center gap-2 rounded-lg border border-primary/15 bg-background/35 p-2">
			{slots.map(({ key, position }) => {
				const label = EQUIPMENT_SLOT_LABELS[key];
				const item = equipment[key];
				return (
					<section key={key} aria-labelledby={`character-${key}`} className={`${position} min-w-0`}>
						<h4 id={`character-${key}`} className="mb-1 text-center text-xs text-muted-foreground">{label}</h4>
						<Button type="button" variant="outline"
								aria-label={`${label}: ${item ? itemName(item) : "empty"}`}
								aria-pressed={selectedId === item?.id && selectedId !== null}
								onClick={() => onSelect(key)}
								className={`ember-item-slot grid h-auto min-h-12 w-full min-w-0 justify-items-center gap-1 whitespace-normal rounded-md p-1 text-center ${item ? "border-primary/30" : "border-dashed text-muted-foreground"}`}>
							{item ? <><span className="size-5"><ItemIcon kind={item.kind} /></span><span className="break-words text-xs">{itemName(item)}</span></> : <span className="text-xs">{label} empty</span>}
						</Button>
					</section>
				);
			})}
			<div aria-hidden="true" className="col-start-2 row-start-2 flex h-16 items-center justify-center text-muted-foreground/50">
				<svg viewBox="0 0 120 220" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" className="h-16 w-12">
					<circle cx="60" cy="24" r="17" />
					<path d="M45 50H75L95 62L110 119L96 123L80 82V132L87 202H69L60 152L51 202H33L40 132V82L24 123L10 119L25 62Z" />
				</svg>
			</div>
		</div>
	</section>
);
export default EquipmentView;
