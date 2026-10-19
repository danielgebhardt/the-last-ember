
import { FlaskConical, X } from "lucide-react";
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
import ItemIcon from "../items/ItemIcon";

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
			className="ember-menu-panel grid min-w-0 content-start gap-2"
		>
			<h3
				id="potion-shortcuts-title"
				ref={headingRef}
				tabIndex={-1}
				className="ember-menu-section-heading flex items-center gap-2 outline-none"
			>
				<FlaskConical
					aria-hidden="true"
					className="size-4 text-primary"
				/>
				Potion shortcuts
			</h3>

			<div className="grid grid-cols-4 gap-1.5">
				{HOTBAR_SLOTS.map((slot) => {
					const { kind, count } = hotbarSlotContents(
						{ bag, potionHotbar },
						slot,
					);

					return (
						<div
							key={slot}
							className="relative flex min-w-0 flex-col items-center gap-1 rounded-md border border-primary/20 bg-background/40 px-1 py-2 text-center"
						>
							<span className="text-[10px] text-muted-foreground">
								Slot {slot}
							</span>

							{kind ? (
								<span className="size-5 shrink-0">
									<ItemIcon kind={kind} />
								</span>
							) : (
								<span
									aria-hidden="true"
									className="flex size-5 items-center justify-center text-muted-foreground/50"
								>
									+
								</span>
							)}

							<output
								aria-label={`Potion slot ${slot} assignment`}
								className="min-w-0 text-[11px] leading-tight"
							>
								{kind
									? ITEM_DEFINITIONS[kind].name
									: "Empty"}
							</output>

							{kind && (
								<span className="text-[10px] text-muted-foreground">
									{count} carried
								</span>
							)}

							{kind && (
								<Button
									type="button"
									variant="ghost"
									size="xs"
									disabled={!enabled}
									aria-label={`Clear potion slot ${slot}`}
									title="Clear slot"
									className="absolute right-0 top-0 size-5 p-0 text-muted-foreground hover:text-destructive"
									onClick={() => {
										onAction({
											type: "clear-hotbar",
											slot,
										});
										headingRef.current?.focus({
											preventScroll: true,
										});
									}}
								>
									<X
										aria-hidden="true"
										className="size-3"
									/>
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
