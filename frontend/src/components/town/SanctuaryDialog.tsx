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
};
const quoteDetails = (quote: SanctuaryQuote) =>
	`${quote.health ? `Restore ${quote.health} HP` : "Restore no HP"}; maximum HP ${quote.maximumHealth}. ${quote.conditions.length ? `Remove ${quote.conditions.map((c) => CONDITION_NAMES[c] ?? c).join(" and ")}. ` : ""}Mana is unchanged. ${quote.cost} gold.`;
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
					<Dialog.Title
						ref={title}
						tabIndex={-1}
						className="text-xl font-semibold outline-none"
					>
						Sanctuary
					</Dialog.Title>
					<Dialog.Description className="text-sm text-muted-foreground">
						Mercy has a price. Only a confirmed paid treatment changes your
						condition. Town treatments use no dungeon time.
					</Dialog.Description>
					<p>
						Gold: {state.gold} · HP {state.player.health} /{" "}
						{state.player.maxHealth}
					</p>
					<ul className="grid gap-3">
						{SANCTUARY_SERVICES.map((service) => {
							const quote = sanctuaryQuote(state, service);
							const reason = !quote.cost
								? "Not needed"
								: state.gold < quote.cost
									? "Not enough gold"
									: null;
							return (
								<li key={service} className="grid gap-2 rounded-lg border p-3">
									<h3 className="font-semibold">
										{SANCTUARY_SERVICE_NAMES[service]}
									</h3>
									<p>{quoteDetails(quote)}</p>
									<Button
										variant="outline"
										className="min-h-11 whitespace-normal"
										disabled={pending !== null || reason !== null}
										onClick={() => setPending(quote)}
									>
										{SANCTUARY_SERVICE_NAMES[service]}
										{reason ? ` (${reason})` : ""}
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
