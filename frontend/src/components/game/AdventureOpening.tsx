import { Dialog } from "@base-ui/react/dialog";
import { ArrowRight, FolderOpen, Shield } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import {
	DEFAULT_RUN_CONFIGURATION,
	type RunConfiguration,
} from "../../domain/dungeon/RunConfiguration";
import { ADVENTURE_STORY } from "../../domain/game/AdventureStory";
import type { SaveDocument } from "../../domain/saves/SaveFormat";
import AdventureSaveSheet from "./AdventureSaveSheet";
import DifficultyChoice from "./DifficultyChoice";
import DungeonSizeChoice from "./DungeonSizeChoice";
import EmberEmblem from "./EmberEmblem";

const AdventureOpening = ({
	onBegin,
	onRestore,
	startError,
	initialConfiguration = DEFAULT_RUN_CONFIGURATION,
}: {
	onBegin: (configuration: RunConfiguration) => void;
	startError?: string;
	initialConfiguration?: RunConfiguration;
	onRestore: (document: SaveDocument) => void;
}) => {
	const [configuration, setConfiguration] = useState(initialConfiguration);
	const [saveOpen, setSaveOpen] = useState(false);
	const title = useRef<HTMLHeadingElement>(null);

	return (
		<div className="flex min-h-dvh items-center justify-center bg-muted/30 p-3 sm:p-6">
			<Dialog.Root open disablePointerDismissal>
				<Dialog.Portal>
					<Dialog.Backdrop className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm" />

					<Dialog.Popup
						initialFocus={title}
						className="
                     fixed top-1/2 left-1/2 z-50
                     max-h-[calc(100dvh-1.5rem)]
                     w-[calc(100%-1.5rem)] max-w-2xl
                     -translate-x-1/2 -translate-y-1/2
                     overflow-y-auto rounded-xl
                     border border-amber-800/35
                     bg-popover text-popover-foreground
                     shadow-[0_24px_70px_rgba(0,0,0,0.35)]
                     dark:border-amber-600/35
                  "
					>
						{/* Title and emblem */}
						<div
							className="
                        relative border-b border-amber-800/20
                        bg-gradient-to-b
                        from-amber-100/70 via-card to-card
                        px-5 pt-4 pb-3 text-center
                        dark:border-amber-500/20
                        dark:from-[#302318] dark:via-card dark:to-card
                     "
						>
							<EmberEmblem className="mx-auto size-14" />

							<Dialog.Title
								ref={title}
								tabIndex={-1}
								className="
                           mt-1 font-serif text-3xl font-bold
                           tracking-wide text-amber-950 outline-none
                           dark:text-amber-100
                        "
							>
								{ADVENTURE_STORY.title}
							</Dialog.Title>

							<div
								aria-hidden="true"
								className="mx-auto mt-2 flex max-w-60 items-center gap-3"
							>
								<span className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-700/60 dark:to-amber-500/60" />
								<span className="size-2 rotate-45 border border-amber-700/70 bg-amber-500/25 dark:border-amber-400/70" />
								<span className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-700/60 dark:to-amber-500/60" />
							</div>

							<p className="mt-2 text-[10px] font-medium uppercase tracking-[0.2em] text-amber-900/70 dark:text-amber-300/70">
								A journey beneath the dying light
							</p>
						</div>

						<div className="space-y-3 px-5 py-4 sm:px-6">
							{/* Framed prologue */}

							{/* Framed prologue */}
							<div
								className="
      rounded-lg border border-amber-800/20
      bg-gradient-to-b from-amber-50/80 to-muted/30
      px-4 py-2.5
      dark:border-amber-600/20
      dark:from-amber-950/15 dark:to-muted/20
   "
							>
								<Dialog.Description className="font-serif text-sm leading-relaxed text-foreground/90">
									{ADVENTURE_STORY.opening.join(" ")}
								</Dialog.Description>
							</div>

							{/* Gameplay reminder */}
							<div
								className="
                           flex items-start gap-2.5
                           rounded-md border-l-2 border-amber-600/60
                           bg-amber-700/5 px-3 py-2
                           dark:border-amber-400/60
                           dark:bg-amber-400/5
                        "
							>
								<Shield
									aria-hidden="true"
									className="mt-0.5 size-4 shrink-0 text-amber-800 dark:text-amber-400"
								/>
								<p className="text-xs leading-relaxed text-foreground/85">
									Explore carefully. Every action gives your enemies a turn.
									Your spells, supplies, and discoveries may be the difference
									between a safe return and a lost expedition.
								</p>
							</div>

							{/* Adventure settings */}
							<form
								className="grid gap-3"
								onSubmit={(event) => {
									event.preventDefault();
									onBegin(configuration);
								}}
							>
								<DungeonSizeChoice
									configuration={configuration}
									onChange={(size) =>
										setConfiguration((current) => ({
											...current,
											...size,
										}))
									}
								/>

								<DifficultyChoice
									value={configuration.difficulty ?? 1}
									onChange={(difficulty) =>
										setConfiguration((current) => ({
											...current,
											difficulty,
										}))
									}
								/>

								{startError && (
									<p role="alert" className="text-sm text-destructive">
										{startError}
									</p>
								)}

								<Button
									type="submit"
									className="
                              group h-11 w-full
                              border border-amber-700/70
                              bg-gradient-to-b from-amber-300 to-amber-500
                              font-serif text-base font-bold text-amber-950
                              shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_3px_12px_rgba(180,83,9,0.15)]
                              hover:from-amber-200 hover:to-amber-400
                              dark:border-amber-500/70
                              dark:from-[#865015] dark:to-[#4b2b10]
                              dark:text-amber-100
                              dark:hover:from-[#a2631c] dark:hover:to-[#603817]
                           "
								>
									Begin Adventure
									<ArrowRight
										aria-hidden="true"
										className="ml-1 size-4 transition-transform group-hover:translate-x-1"
									/>
								</Button>
							</form>

							{/* Load existing adventure */}
							<Sheet open={saveOpen} onOpenChange={setSaveOpen}>
								<SheetTrigger
									render={
										<Button
											type="button"
											variant="outline"
											className="
                                    h-9 w-full
                                    border-amber-900/30
                                    bg-gradient-to-b from-card to-muted/50
                                    text-foreground
                                    hover:border-amber-700/60
                                    hover:bg-amber-700/10
                                    dark:border-amber-600/35
                                    dark:hover:border-amber-400/60
                                    dark:hover:bg-amber-400/10
                                 "
										/>
									}
								>
									<FolderOpen
										aria-hidden="true"
										className="size-4 text-amber-800 dark:text-amber-400"
									/>
									Load an existing save
								</SheetTrigger>

								<AdventureSaveSheet onRestore={onRestore} />
							</Sheet>

							<div className="text-center">
								<p className="text-xs text-muted-foreground">
									<output aria-label="Selected adventure size">
										{configuration.rows} × {configuration.cols} tiles
										{" · "}
										{configuration.floorCount} floors
									</output>
								</p>
								<p className="mt-1 text-[10px] italic text-muted-foreground/70">
									Inspired by the classic roguelike Larn.
								</p>
							</div>
						</div>
					</Dialog.Popup>
				</Dialog.Portal>
			</Dialog.Root>
		</div>
	);
};

export default AdventureOpening;
