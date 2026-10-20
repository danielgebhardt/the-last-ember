import { Dialog } from "@base-ui/react/dialog";
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
		<Dialog.Root
			open={open && canReachTownLibrary(state)}
			onOpenChange={(value) => {
				if (!value) onClose();
			}}
		>
			<Dialog.Portal>
				<Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs" />
				<Dialog.Popup
					initialFocus={title}
					finalFocus={mapRef}
					className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[min(52rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 overflow-y-auto rounded-xl border bg-card p-4 shadow-xl"
					onKeyDown={(event) => {
						if (event.repeat && ["Enter", " "].includes(event.key))
							event.preventDefault();
					}}
				>
					<div className="flex flex-wrap items-baseline justify-between gap-x-4">
						<Dialog.Title
							ref={title}
							tabIndex={-1}
							className="text-xl font-semibold outline-none"
						>
							Library
						</Dialog.Title>
						<p className="font-semibold">Gold: {state.gold}</p>
					</div>
					<Dialog.Description className="text-sm text-muted-foreground">
						The books outlast the librarians. Three rare spellbooks this
						adventure&apos;s dungeon will never offer. Buying one teaches its
						spell at once; no bag space or dungeon turn.
					</Dialog.Description>
					<ul className="grid gap-3 sm:grid-cols-3">
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
											<span
												className={`shrink-0 rounded-md border border-amber-700/50 bg-amber-500/10 px-2 py-0.5 font-semibold tabular-nums text-amber-800 dark:text-amber-300 ${reason ? "opacity-60" : ""}`}
											>
												{LIBRARY_PRICE} gold
											</span>
										)}
									</div>
									<p className="font-medium">{spellFacts(spell)}</p>
									<p className="text-muted-foreground">
										{definition.description}
									</p>
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
					{pending && selected ? (
						<fieldset
							ref={confirmation}
							tabIndex={-1}
							aria-label="Confirm spellbook purchase"
							className="grid gap-3 rounded-lg border p-3 outline-none"
						>
							<legend className="font-semibold">
								Learn {SPELL_DEFINITIONS[selected.spell].name} for{" "}
								{LIBRARY_PRICE} gold?
							</legend>
							<p className="text-sm">
								The spell joins your known spells now. No dungeon turn.
							</p>
							<div className="flex flex-wrap gap-2">
								<Button variant="outline" onClick={finish}>
									Cancel purchase
								</Button>
								<Button
									disabled={libraryRefusal(state, selected.spell) !== null}
									onClick={() => {
										onLearn(pending);
										finish();
									}}
								>
									Confirm purchase
								</Button>
							</div>
						</fieldset>
					) : null}
					{error && <p role="alert">{error}</p>}
					<Button
						variant="outline"
						className="ml-auto min-h-11"
						onClick={onClose}
					>
						Leave library
					</Button>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
};
export default TownLibraryDialog;
