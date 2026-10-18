
import type { RefObject } from "react";
import { Button } from "@/components/ui/button";
import {
	EQUIPMENT_SLOT_LABELS,
	type Equipment,
	type EquipmentSlot,
} from "../../domain/items/Equipment";
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

const EquipmentView = ({
						   equipment,
						   selectedId,
						   onSelect,
						   headingRef,
					   }: {
	equipment: Equipment;
	selectedId: string | null;
	onSelect: (slot: EquipmentSlot) => void;
	headingRef: RefObject<HTMLHeadingElement | null>;
}) => {
	return (
		<section
			aria-labelledby="character-equipment-title"
			className="ember-menu-panel grid content-start gap-3"
		>
			<h3
				ref={headingRef}
				tabIndex={-1}
				id="character-equipment-title"
				className="ember-menu-section-heading outline-none"
			>
				Equipment
			</h3>

			<div className="grid grid-cols-3 items-center gap-2 rounded-lg border border-primary/15 bg-background/35 p-2">
				{slots.map(({ key, position }) => {
					const label = EQUIPMENT_SLOT_LABELS[key];

					return (
						<section
							key={key}
							aria-labelledby={`character-${key}`}
							className={position}
						>
							<h4
								id={`character-${key}`}
								className="mb-1 text-center text-xs text-muted-foreground"
							>
								{label}
							</h4>

							<Button
								type="button"
								variant="outline"
								aria-label={`${label}: ${equipment[key] ? itemName(equipment[key]) : "empty"}`}
								aria-pressed={
									selectedId === equipment[key]?.id &&
									selectedId !== null
								}
								onClick={() => onSelect(key)}
								className="ember-item-slot grid h-auto min-h-12 w-full justify-items-center gap-1 whitespace-normal p-1 text-center aria-pressed:border-primary aria-pressed:bg-primary/10"
							>
								{equipment[key] ? (
									<>
                              <span className="size-5">
                                 <ItemIcon kind={equipment[key].kind} />
                              </span>

										<span className="text-xs">
                                 {itemName(equipment[key])}
                              </span>
									</>
								) : (
									<span className="text-xs text-muted-foreground">
                              {label} empty
                           </span>
								)}
							</Button>
						</section>
					);
				})}

				<svg
					aria-hidden="true"
					focusable="false"
					viewBox="0 0 120 220"
					fill="none"
					stroke="currentColor"
					strokeWidth="3"
					strokeLinejoin="round"
					className="col-start-2 row-start-2 h-12 w-full text-muted-foreground/50"
				>
					<circle cx="60" cy="24" r="17" />
					<path d="M45 50H75L95 62L110 119L96 123L80 82V132L87 202H69L60 152L51 202H33L40 132V82L24 123L10 119L25 62Z" />
				</svg>
			</div>
		</section>
	);
};

export default EquipmentView;
