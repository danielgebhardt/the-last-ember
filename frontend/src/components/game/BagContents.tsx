
import { Backpack } from "lucide-react";
import { type ReactNode, type RefObject, useId } from "react";
import { Button } from "@/components/ui/button";
import {
	BAG_CAPACITY,
	type Bag,
	bagItemKey,
	bagSlots,
} from "../../domain/items/Bag";
import {
	compareEquipment,
	type EquipmentComparisonContext,
} from "../../domain/items/EquipmentComparison";
import { itemName } from "../../domain/items/ItemValues";
import ItemIcon from "../items/ItemIcon";
import {
	comparisonDescription,
	comparisonStyles,
} from "./EquipmentComparisonView";

const BagContents = ({
						 bag,
						 comparisonContext,
						 selectedKey,
						 onSelect,
						 headingRef,
						 children,
					 }: {
	bag: Bag;
	comparisonContext: EquipmentComparisonContext;
	selectedKey: string | null;
	onSelect: (key: string) => void;
	headingRef: RefObject<HTMLHeadingElement | null>;
	children: ReactNode;
}) => {
	const comparisonId = useId();
	const slots = bagSlots(bag);

	return (
		<section
			aria-labelledby="character-bag-title"
			className="ember-menu-panel grid min-w-0 content-start gap-3"
		>
			<div className="flex w-[36rem] max-w-full items-center justify-between gap-3 pr-1">
				<h3
					ref={headingRef}
					tabIndex={-1}
					id="character-bag-title"
					className="ember-menu-section-heading flex items-center gap-2 outline-none"
				>
					<Backpack
						aria-hidden="true"
						className="size-4 text-primary"
					/>
					Bag
				</h3>

				<output
					aria-label="Bag capacity"
					className="shrink-0 text-xs tabular-nums text-muted-foreground"
				>
					{slots.length} / {BAG_CAPACITY} slots
				</output>
			</div>

			<div className="min-w-0 overflow-x-auto">
				<ul
					aria-label="Carried items"
					className="grid w-max grid-cols-[repeat(9,3.5rem)] gap-2 p-1"
				>
					{Array.from({ length: BAG_CAPACITY }, (_, index) => {
						const item = slots[index]?.item;
						const count = slots[index]?.count ?? 0;
						const comparison = item
							? compareEquipment(item, comparisonContext)
							: null;
						const descriptionId = `${comparisonId}-${index}`;

						return (
							<li
								key={
									item
										? bagItemKey(item)
										: `empty:${index}`
								}
							>
								{item ? (
									<Button
										type="button"
										variant="outline"
										aria-label={`${itemName(item)}, slot ${index + 1}`}
										aria-pressed={
											selectedKey === bagItemKey(item)
										}
										aria-describedby={
											count > 1
												? `${descriptionId}-quantity`
												: comparison
													? descriptionId
													: undefined
										}
										onClick={() =>
											onSelect(bagItemKey(item))
										}
										className={`ember-item-slot relative grid size-14 justify-items-center ${
											comparison
												? "grid-rows-[1rem_1.25rem_0.625rem] gap-0"
												: "grid-rows-[1.25rem_1.25rem] gap-1"
										} whitespace-normal rounded-md p-1 aria-pressed:ring-2 aria-pressed:ring-primary/60 aria-pressed:ring-offset-1 aria-pressed:ring-offset-card ${
											comparison
												? comparisonStyles[
													comparison.label
													].border
												: ""
										}`}
									>
										<span
											className={
												comparison
													? "size-4"
													: "size-5"
											}
										>
											<ItemIcon kind={item.kind} />
										</span>

										<span className="line-clamp-2 min-h-0 text-[9px] leading-[10px]">
											{itemName(item)}
										</span>

										{item.enchantment && (
											<span className="absolute right-0.5 top-0.5 rounded bg-background px-0.5 text-[9px] font-semibold">
												+{item.enchantment}
											</span>
										)}

										{count > 1 && (
											<span
												id={`${descriptionId}-quantity`}
												className="absolute right-1 top-0.5 rounded bg-background px-0.5 text-[10px] font-semibold tabular-nums"
											>
												<span aria-hidden="true">
													{count}
												</span>
												<span className="sr-only">
													{count} carried
												</span>
											</span>
										)}

										{comparison && (
											<>
												<span
													aria-hidden="true"
													className={`text-[8px] leading-[10px] font-medium ${
														comparisonStyles[
															comparison.label
															].text
													}`}
												>
													{comparison.label}
												</span>

												<span
													id={descriptionId}
													className="sr-only"
												>
													{comparisonDescription(
														comparison,
													)}
												</span>
											</>
										)}
									</Button>
								) : (
									<span
										role="img"
										aria-label={`Empty bag slot ${index + 1}`}
										className="ember-item-slot-empty flex size-14 items-center justify-center rounded-md border border-dashed text-xs tabular-nums text-muted-foreground/50"
									>
										{index + 1}
									</span>
								)}
							</li>
						);
					})}
				</ul>
			</div>

			{slots.length === 0 && (
				<p className="text-xs text-muted-foreground">
					Your bag is empty.
				</p>
			)}

			{children}
		</section>
	);
};

export default BagContents;
