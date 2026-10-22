import { type RefObject, useLayoutEffect, useRef, useState } from "react";
import type { GameState } from "../../domain/game/GameState";
import { SPELL_DEFINITIONS } from "../../domain/game/Spells";
import {
	canReachTownLibrary,
	LIBRARY_PRICE,
	type LibraryLearnAction,
	libraryOffers,
	libraryRefusal,
	spellFacts,
} from "../../domain/town/TownLibrary";
import { SPELL_ICONS, spellIconColor } from "../game/SpellVisuals";
import { Button } from "../ui/button";
import TownServiceDialog, {
	ConfirmPanel,
	PriceBadge,
} from "./TownServiceDialog";

const TownLibraryDialog = ({
	open,
	state,
	error,
	onClose,
	onLearn,
	mapRef,
}: {
	open: boolean;
	state: GameState;
	error: string;
	onClose: () => void;
	onLearn: (action: LibraryLearnAction) => void;
	mapRef: RefObject<HTMLElement | null>;
}) => {
	const title = useRef<HTMLHeadingElement>(null),
		confirmation = useRef<HTMLFieldSetElement>(null);
	const [pending, setPending] = useState<LibraryLearnAction | null>(null);
	useLayoutEffect(() => {
		if (!open) setPending(null);
	}, [open]);
	useLayoutEffect(() => {
		if (pending) confirmation.current?.focus();
	}, [pending]);
	const finish = () => {
		setPending(null);
		title.current?.focus();
	};
	const offers = libraryOffers(state.run);
	const selected = offers.find((offer) => offer.book === pending?.book);
	return (
		<TownServiceDialog
			open={open && canReachTownLibrary(state)}
			onClose={onClose}
			title="Library"
			titleRef={title}
			mapRef={mapRef}
			gold={state.gold}
			error={error}
			leaveLabel="Leave library"
			className="w-[min(52rem,calc(100vw-2rem))]"
			description="The books outlast the librarians. Three rare spellbooks this adventure's dungeon will never offer. Buying one teaches its spell at once; no bag space or dungeon turn."
		>
			<ul className="grid min-h-0 gap-3 overflow-y-auto sm:grid-cols-3">
				{offers.map(({ book, spell }) => {
					const definition = SPELL_DEFINITIONS[spell];
					const Icon = SPELL_ICONS[spell];
					const reason = libraryRefusal(state, spell);
					return (
						<li
							key={book}
							className={`flex flex-col gap-2 rounded-lg border bg-muted/20 p-3 text-sm ${reason === "Already known" ? "text-muted-foreground" : ""}`}
						>
							<div className="flex items-start justify-between gap-3">
								<h3 className="flex items-center gap-2 font-semibold">
									<Icon
										aria-hidden="true"
										className={`size-6 shrink-0 ${spellIconColor(spell)}`}
									/>
									{definition.name}
								</h3>
								{reason !== "Already known" && (
									<PriceBadge price={LIBRARY_PRICE} dimmed={reason !== null} />
								)}
							</div>
							<p className="font-medium">
								{spellFacts(spell, state.progression)}
							</p>
							<p className="text-muted-foreground">{definition.description}</p>
							<Button
								variant="outline"
								className="mt-auto min-h-11 whitespace-normal"
								disabled={pending !== null || reason !== null}
								onClick={() => setPending({ type: "library-learn", book })}
							>
								{reason === "Already known"
									? `${definition.name} (Already known)`
									: `Learn ${definition.name}${reason ? ` (${reason})` : ""}`}
							</Button>
						</li>
					);
				})}
			</ul>
			{pending && selected && (
				<ConfirmPanel
					panelRef={confirmation}
					label="Confirm spellbook purchase"
					legend={`Learn ${SPELL_DEFINITIONS[selected.spell].name} for ${LIBRARY_PRICE} gold?`}
					cancelLabel="Cancel purchase"
					confirmLabel="Confirm purchase"
					disabled={libraryRefusal(state, selected.spell) !== null}
					onCancel={finish}
					onConfirm={() => {
						onLearn(pending);
						finish();
					}}
				>
					The spell joins your known spells now. No dungeon turn.
				</ConfirmPanel>
			)}
		</TownServiceDialog>
	);
};
export default TownLibraryDialog;
