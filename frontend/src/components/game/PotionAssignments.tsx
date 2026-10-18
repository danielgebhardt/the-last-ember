
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import type { PlayerAction } from "../../domain/game/PlayerActions";
import type { Bag } from "../../domain/items/Bag";
import { ITEM_DEFINITIONS } from "../../domain/items/Item";
import {
	HOTBAR_SLOTS,
	hotbarSlotContents,
	type PotionHotbar,
} from "../../domain/items/PotionHotbar";

const PotionAssignments = ({
							   bag,
							   potionHotbar,
							   onAction,
							   enabled = true,
						   }: {
	bag: Bag;
	enabled?: boolean;
	potionHotbar: PotionHotbar;
	onAction: (action: PlayerAction) => void;
}) => {
	const headingRef = useRef<HTMLHeadingElement>(null);

	return (
		<section
			aria-labelledby="potion-shortcuts-title"
			className="ember-menu-panel grid content-start gap-2"
		>
			<h3
				id="potion-shortcuts-title"
				ref={headingRef}
				tabIndex={-1}
				className="ember-menu-section-heading outline-none"
			>
				Potion shortcuts
			</h3>

			<p className="text-xs text-muted-foreground">
				Select a carried potion to assign it for free.
			</p>

			<div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
				{HOTBAR_SLOTS.map((slot) => {
					const { kind, count } = hotbarSlotContents(
						{ bag, potionHotbar },
						slot,
					);

					return (
						<div
							key={slot}
							className="grid content-start gap-1 rounded-lg border border-primary/15 bg-background/35 p-1.5"
						>
							<p className="text-xs font-medium text-muted-foreground">
								Slot {slot}
							</p>

							<output
								aria-label={`Potion slot ${slot} assignment`}
								className="text-xs leading-relaxed"
							>
								{kind
									? `${ITEM_DEFINITIONS[kind].name} · ${count} carried`
									: "Empty"}
							</output>

							{kind && (
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={!enabled}
									aria-label={`Clear potion slot ${slot}`}
									onClick={() => {
										onAction({ type: "clear-hotbar", slot });
										headingRef.current?.focus({
											preventScroll: true,
										});
									}}
								>
									Clear
								</Button>
							)}
						</div>
					);
				})}
			</div>
		</section>
	);
};

export default PotionAssignments;
