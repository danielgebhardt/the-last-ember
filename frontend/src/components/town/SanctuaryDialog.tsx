import { type RefObject, useLayoutEffect, useRef, useState } from "react";
import type { GameState } from "../../domain/game/GameState";
import {
	canReachSanctuary,
	SANCTUARY_SERVICE_NAMES,
	SANCTUARY_SERVICES,
	type SanctuaryAction,
	type SanctuaryQuote,
	sameSanctuaryQuote,
	sanctuaryConditionName,
	sanctuaryQuote,
} from "../../domain/town/Sanctuary";
import { Button } from "../ui/button";
import TownServiceDialog, { ConfirmPanel } from "./TownServiceDialog";

const quoteDetails = (quote: SanctuaryQuote) =>
	`${quote.health ? `Restore ${quote.health} HP` : "Restore no HP"}; maximum HP ${quote.maximumHealth}. ${quote.conditions.length ? `Remove ${quote.conditions.map((c) => sanctuaryConditionName(c)).join(" and ")}. ` : ""}Mana is unchanged. ${quote.cost} gold.`;
// One compact line per service; the confirmation keeps the full quote wording.
const rowDetails = (
	quote: SanctuaryQuote,
	player: { health: number; maxHealth: number },
) => {
	if (quote.service === "health")
		return quote.health
			? `+${quote.health} HP (${player.health} → ${player.health + quote.health})`
			: "Already at full health";
	if (!quote.conditions.length) return "Nothing to treat";
	const capacity =
		quote.maximumHealth !== player.maxHealth
			? ` · max HP ${player.maxHealth} → ${quote.maximumHealth}`
			: "";
	return `Removes ${quote.conditions.map((c) => sanctuaryConditionName(c)).join(" and ")}${capacity}`;
};
const SanctuaryDialog = ({
	open,
	state,
	error,
	onClose,
	onTreat,
	mapRef,
}: {
	open: boolean;
	state: GameState;
	error: string;
	onClose: () => void;
	onTreat: (action: SanctuaryAction) => void;
	mapRef: RefObject<HTMLElement | null>;
}) => {
	const title = useRef<HTMLHeadingElement>(null),
		confirmation = useRef<HTMLFieldSetElement>(null);
	const [pending, setPending] = useState<SanctuaryQuote | null>(null);
	const [focusTitle, setFocusTitle] = useState(false);
	useLayoutEffect(() => {
		if (!open) setPending(null);
	}, [open]);
	useLayoutEffect(() => {
		if (pending) confirmation.current?.focus();
	}, [pending]);
	useLayoutEffect(() => {
		if (open && focusTitle) {
			title.current?.focus();
			setFocusTitle(false);
		}
	}, [open, focusTitle]);
	const finish = () => {
		setPending(null);
		setFocusTitle(true);
	};
	return (
		<TownServiceDialog
			open={open && canReachSanctuary(state)}
			onClose={onClose}
			title="Sanctuary"
			titleRef={title}
			mapRef={mapRef}
			gold={state.gold}
			aside={
				<span className="text-sm text-muted-foreground">
					HP {state.player.health} / {state.player.maxHealth}
				</span>
			}
			error={error}
			leaveLabel="Leave sanctuary"
			className="w-[min(44rem,calc(100vw-2rem))]"
			description="Mercy has a price. Only a confirmed paid treatment changes your condition. Town treatments use no dungeon time and never restore mana. Cures are listed for the conditions you have."
		>
			<ul className="grid min-h-0 divide-y overflow-y-auto rounded-lg border">
				{SANCTUARY_SERVICES.filter(
					(service) =>
						service === "health" ||
						service === "cleanse" ||
						state.afflictions.some((a) => a.kind === service),
				).map((service) => {
					const quote = sanctuaryQuote(state, service);
					const reason = !quote.cost
						? "Not needed"
						: state.gold < quote.cost
							? "Not enough gold"
							: null;
					const nameId = `sanctuary-${service}-name`,
						priceId = `sanctuary-${service}-price`;
					return (
						<li
							key={service}
							className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2 ${reason === "Not needed" ? "text-muted-foreground" : ""}`}
						>
							<span className="min-w-0">
								<span id={nameId} className="font-semibold">
									{SANCTUARY_SERVICE_NAMES[service]}
								</span>{" "}
								<span className="text-sm text-muted-foreground">
									{rowDetails(quote, state.player)}
								</span>
							</span>
							<Button
								variant="outline"
								aria-labelledby={`${nameId} ${priceId}`}
								className="min-h-11 shrink-0 tabular-nums"
								disabled={pending !== null || reason !== null}
								onClick={() => setPending(quote)}
							>
								<span id={priceId}>
									{reason === "Not needed"
										? "Not needed"
										: `${quote.cost} gold${reason ? ` (${reason})` : ""}`}
								</span>
							</Button>
						</li>
					);
				})}
			</ul>
			{pending && (
				<ConfirmPanel
					panelRef={confirmation}
					label="Confirm sanctuary treatment"
					legend={`Confirm ${SANCTUARY_SERVICE_NAMES[pending.service]}`}
					cancelLabel="Cancel treatment"
					confirmLabel="Confirm treatment"
					disabled={
						state.gold < pending.cost ||
						!sameSanctuaryQuote(pending, sanctuaryQuote(state, pending.service))
					}
					onCancel={finish}
					onConfirm={() => {
						onTreat({ type: "sanctuary-treatment", quote: pending });
						finish();
					}}
				>
					{quoteDetails(pending)}
				</ConfirmPanel>
			)}
		</TownServiceDialog>
	);
};
export default SanctuaryDialog;
