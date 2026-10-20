import { Dialog } from "@base-ui/react/dialog";
import { type RefObject, useLayoutEffect, useRef, useState } from "react";
import type { GameState } from "../../domain/game/GameState";
import {
	canReachSanctuary,
	SANCTUARY_SERVICE_NAMES,
	SANCTUARY_SERVICES,
	type SanctuaryAction,
	type SanctuaryQuote,
	sameSanctuaryQuote,
	sanctuaryQuote,
} from "../../domain/town/Sanctuary";
import { Button } from "../ui/button";

const CONDITION_NAMES: Record<string, string> = {
	poisoned: "poison",
	disease: "Disease",
	slowed: "Slowed",
	"mana-burn": "Mana Burn",
	curse: "Curse",
};
const quoteDetails = (quote: SanctuaryQuote) =>
	`${quote.health ? `Restore ${quote.health} HP` : "Restore no HP"}; maximum HP ${quote.maximumHealth}. ${quote.conditions.length ? `Remove ${quote.conditions.map((c) => CONDITION_NAMES[c] ?? c).join(" and ")}. ` : ""}Mana is unchanged. ${quote.cost} gold.`;
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
	return `Removes ${quote.conditions.map((c) => CONDITION_NAMES[c] ?? c).join(" and ")}${capacity}`;
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
		<Dialog.Root
			open={open && canReachSanctuary(state)}
			onOpenChange={(value) => {
				if (!value) onClose();
			}}
		>
			<Dialog.Portal>
				<Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs" />
				<Dialog.Popup
					initialFocus={title}
					finalFocus={mapRef}
					className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[min(44rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 overflow-y-auto rounded-xl border bg-card p-4 shadow-xl"
					onKeyDown={(e) => {
						if (e.repeat && ["Enter", " "].includes(e.key)) e.preventDefault();
					}}
				>
					<div className="flex flex-wrap items-baseline justify-between gap-x-4">
						<Dialog.Title
							ref={title}
							tabIndex={-1}
							className="text-xl font-semibold outline-none"
						>
							Sanctuary
						</Dialog.Title>
						<p className="flex items-baseline gap-3">
							<span className="text-sm text-muted-foreground">
								HP {state.player.health} / {state.player.maxHealth}
							</span>
							<span className="font-semibold">Gold: {state.gold}</span>
						</p>
					</div>
					<Dialog.Description className="text-sm text-muted-foreground">
						Mercy has a price. Only a confirmed paid treatment changes your
						condition. Town treatments use no dungeon time and never restore
						mana.
					</Dialog.Description>
					<ul className="grid divide-y rounded-lg border">
						{SANCTUARY_SERVICES.map((service) => {
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
						<fieldset
							ref={confirmation}
							tabIndex={-1}
							aria-label="Confirm sanctuary treatment"
							className="grid gap-3 rounded-lg border p-3 outline-none"
						>
							<legend className="font-semibold">
								Confirm {SANCTUARY_SERVICE_NAMES[pending.service]}
							</legend>
							<p>{quoteDetails(pending)}</p>
							<div className="flex flex-wrap gap-2">
								<Button variant="outline" onClick={finish}>
									Cancel treatment
								</Button>
								<Button
									disabled={
										state.gold < pending.cost ||
										!sameSanctuaryQuote(
											pending,
											sanctuaryQuote(state, pending.service),
										)
									}
									onClick={() => {
										onTreat({ type: "sanctuary-treatment", quote: pending });
										finish();
									}}
								>
									Confirm treatment
								</Button>
							</div>
						</fieldset>
					)}
					{error && <p role="alert">{error}</p>}
					<Button
						variant="outline"
						className="ml-auto min-h-11"
						onClick={onClose}
					>
						Leave sanctuary
					</Button>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
};
export default SanctuaryDialog;
