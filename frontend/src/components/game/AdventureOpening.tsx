import { Dialog } from "@base-ui/react/dialog";
import { ArrowRight, FolderOpen, History, Shield } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import AccountMenu from "../../accounts/AccountMenu";
import { useAccount } from "../../accounts/AccountProvider";
import DeveloperGeneration from "../../developer/DeveloperGeneration";
import {
	DEFAULT_RUN_CONFIGURATION,
	type RunConfiguration,
} from "../../domain/dungeon/RunConfiguration";
import { ADVENTURE_STORY } from "../../domain/game/AdventureStory";
import type { DeveloperFeature } from "../../domain/game/DeveloperFeatures";
import { type SaveDocument, saveSummary } from "../../domain/saves/SaveFormat";
import { useSaves } from "../../saves/SavesProvider";
import RankingsButton from "../../statistics/RankingsButton";
import AdventureSaveSheet from "./AdventureSaveSheet";
import AppearanceChoice from "./AppearanceChoice";
import DifficultyChoice from "./DifficultyChoice";
import EmberEmblem from "./EmberEmblem";
import RunHistoryDialog from "./RunHistoryDialog";

// Gold rule with a centred diamond, used under the title and between settings.
const Flourish = ({ className }: { className: string }) => (
	<div
		aria-hidden="true"
		className={`mx-auto flex items-center gap-3 ${className}`}
	>
		<span className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-700/60 dark:to-amber-500/60" />
		<span className="size-2 rotate-45 border border-amber-700/70 bg-amber-500/25 dark:border-amber-400/70" />
		<span className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-700/60 dark:to-amber-500/60" />
	</div>
);

const AdventureOpening = ({
	onBegin,
	onRestore,
	startError,
	initialConfiguration = DEFAULT_RUN_CONFIGURATION,
	suspended = false,
}: {
	onBegin: (
		configuration: RunConfiguration,
		disabled?: DeveloperFeature[],
	) => void;
	startError?: string;
	initialConfiguration?: RunConfiguration;
	onRestore: (document: SaveDocument) => void;
	suspended?: boolean;
}) => {
	const [configuration, setConfiguration] = useState(initialConfiguration);
	const [disabled, setDisabled] = useState<DeveloperFeature[]>([]);
	const account = useAccount();
	const developer = account.user?.developer === true;
	// biome-ignore lint/correctness/useExhaustiveDependencies: account changes reset the developer-only draft.
	useEffect(() => setDisabled([]), [account.user?.uid, developer]);
	const [saveOpen, setSaveOpen] = useState(false);
	const [accountOpen, setAccountOpen] = useState(false);
	// Read again when the player signs in or out, or a cloud copy arrives.
	const saves = useSaves();
	const [localOwner, setLocalOwner] = useState<string | null>(null);
	const [slow, setSlow] = useState(false);
	const owner = account.user?.uid ?? null;
	// biome-ignore lint/correctness/useExhaustiveDependencies: each account must explicitly choose local saves.
	useEffect(() => {
		setLocalOwner(null);
	}, [owner]);
	// biome-ignore lint/correctness/useExhaustiveDependencies: a different account gets a fresh wait period.
	useEffect(() => {
		setSlow(false);
		if (saves.initialCheck !== "checking") return;
		const timer = window.setTimeout(() => setSlow(true), 8000);
		return () => window.clearTimeout(timer);
	}, [saves.initialCheck, owner]);
	const blocked =
		account.busy ||
		account.status === "loading" ||
		!!saves.guestOffer ||
		(saves.initialCheck !== "ready" && (!owner || localOwner !== owner));
	useEffect(() => {
		if (suspended) {
			setAccountOpen(false);
			setSaveOpen(false);
		}
	}, [suspended]);
	// biome-ignore lint/correctness/useExhaustiveDependencies: owner and version mark changes.
	const autosave = useMemo(() => {
		const result = saves.read("autosave");
		return result.ok ? result.value : null;
	}, [saves.owner, saves.version]);
	const title = useRef<HTMLHeadingElement>(null);

	return (
		<div className="flex min-h-dvh items-center justify-center bg-muted/30 p-3 sm:p-6">
			<Dialog.Root open={!suspended} disablePointerDismissal>
				<Dialog.Portal>
					<Dialog.Backdrop className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm" />

					<Dialog.Popup
						initialFocus={title}
						className="
                     fixed top-1/2 left-1/2 z-50
                     max-h-[calc(100dvh-1.5rem)]
                     w-[calc(100%-1.5rem)] max-w-[65rem]
                     -translate-x-1/2 -translate-y-1/2
                     overflow-y-auto rounded-xl
                     border border-amber-800/35
                     bg-gradient-to-b
                     from-amber-100/70 via-popover via-30% to-popover
                     px-5 py-5 text-popover-foreground
                     shadow-[0_24px_70px_rgba(0,0,0,0.35)]
                     sm:px-7
                     dark:border-amber-600/35
                     dark:from-[#302318]
                     [@media(max-height:800px)]:py-4
                     [@media(max-height:800px)]:[&_label]:py-1.5
                  "
					>
						<div className="grid gap-5 min-[900px]:grid-cols-[minmax(0,13fr)_minmax(0,7fr)] min-[900px]:gap-0">
							<div className="min-w-0 min-[900px]:pr-7">
								<form
									className="grid gap-2.5"
									onSubmit={(event) => {
										event.preventDefault();
										if (blocked) return;
										// Always the standard dungeon; only the difficulty is chosen here.
										onBegin(
											{
												...DEFAULT_RUN_CONFIGURATION,
												difficulty: configuration.difficulty,
											},
											developer ? disabled : [],
										);
									}}
								>
									<div className="text-center">
										<EmberEmblem className="mx-auto size-14 [@media(max-height:800px)]:size-10" />

										<Dialog.Title
											ref={title}
											tabIndex={-1}
											className="
                                 mt-1 font-serif text-4xl font-bold
                                 tracking-wide text-amber-950 outline-none
                                 dark:text-amber-100
                              "
										>
											{ADVENTURE_STORY.title}
										</Dialog.Title>

										<Flourish className="mt-2 max-w-sm" />

										<p className="mt-2 text-[11px] font-medium uppercase tracking-[0.25em] text-amber-900/70 dark:text-amber-300/70">
											{ADVENTURE_STORY.subtitle}
										</p>
									</div>

									{/* Framed prologue */}
									<div
										className="
                              rounded-lg border border-amber-800/20
                              bg-gradient-to-b from-amber-50/80 to-muted/30
                              px-5 py-3.5
                              dark:border-amber-600/20
                              dark:from-amber-950/15 dark:to-muted/20
                           "
									>
										<Dialog.Description
											render={<div />}
											className="grid gap-2 font-serif text-base leading-normal text-foreground/90"
										>
											{ADVENTURE_STORY.opening.map((paragraph) => (
												<p key={paragraph}>{paragraph}</p>
											))}
										</Dialog.Description>
									</div>

									{/* Gameplay reminder */}
									<div
										className="
                              flex items-start gap-3
                              rounded-md border-l-2 border-amber-600/60
                              bg-amber-700/5 px-4 py-3
                              dark:border-amber-400/60
                              dark:bg-amber-400/5
                           "
									>
										<Shield
											aria-hidden="true"
											className="mt-0.5 size-5 shrink-0 text-amber-800 dark:text-amber-400"
										/>
										<p className="text-[15px] leading-normal text-foreground/85">
											Explore carefully. Every action gives your enemies a turn.
											Your spells, supplies, and discoveries may be the
											difference between a safe return and a lost expedition.
										</p>
									</div>
									{/* Actions */}
									{startError && (
										<p role="alert" className="text-sm text-destructive">
											{startError}
										</p>
									)}

									<Button
										type="submit"
										disabled={blocked}
										className="
                           group h-12 w-full
                           border border-amber-700/70
                           bg-gradient-to-b from-amber-300 to-amber-500
                           font-serif text-lg font-bold text-amber-950
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
								<div className="mt-2.5 grid gap-2.5">
									<div
										className={`grid gap-2.5 ${autosave ? "sm:grid-cols-2" : ""}`}
									>
										{autosave && (
											<Button
												type="button"
												variant="outline"
												disabled={blocked}
												aria-describedby="autosave-summary"
												onClick={() => onRestore(autosave)}
												className="
                                 h-10 w-full
                                 border-amber-700/50
                                 bg-amber-500/10
                                 text-foreground
                                 hover:border-amber-700/70
                                 hover:bg-amber-500/20
                                 dark:border-amber-500/50
                                 dark:hover:border-amber-400/70
                              "
											>
												<History
													aria-hidden="true"
													className="size-4 text-amber-800 dark:text-amber-400"
												/>
												Continue autosave
											</Button>
										)}

										{/* Load existing adventure */}
										<Sheet open={saveOpen} onOpenChange={setSaveOpen}>
											<SheetTrigger
												render={
													<Button
														type="button"
														disabled={blocked}
														variant="outline"
														className="
                                       h-10 w-full
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
									</div>

									{autosave && (
										<p
											id="autosave-summary"
											className="-mt-1 text-center text-[11px] text-muted-foreground"
										>
											{saveSummary(autosave)} ·{" "}
											<time dateTime={autosave.savedAt}>
												{new Date(autosave.savedAt).toLocaleString()}
											</time>
										</p>
									)}

									<div className="grid grid-cols-2 gap-2.5 [&>button]:h-10">
										<RunHistoryDialog triggerClassName="w-full text-muted-foreground hover:text-foreground" />
										<RankingsButton />
									</div>

									<div className="text-center">
										<p className="text-[10px] italic text-muted-foreground/70">
											Inspired by the classic roguelike Larn.
										</p>
									</div>
								</div>
							</div>
							{/* Adventure settings */}
							<div
								className="
                           grid min-w-0 content-start gap-3
                           min-[900px]:border-l min-[900px]:border-amber-800/25
                           min-[900px]:pl-7
                           dark:min-[900px]:border-amber-500/25
                        "
							>
								{account.status !== "unavailable" && (
									<div className="grid min-w-0 grid-cols-1 gap-2 rounded-lg border border-amber-800/20 bg-background/50 p-3 dark:border-amber-500/25">
										<p className="text-xs text-muted-foreground">
											{account.status === "signed-in"
												? "Your adventure, on any device."
												: "Sign in to keep your adventure on any device."}
										</p>
										<AccountMenu
											opening
											open={accountOpen}
											onOpenChange={setAccountOpen}
										/>
										{(saves.initialCheck !== "ready" ||
											account.status === "loading") && (
											<div className="grid gap-2 border-t border-border/60 pt-2 text-xs">
												<p role="status">
													{account.status === "loading"
														? "Checking your sign-in…"
														: saves.initialCheck === "checking"
															? slow
																? "Cloud saves are taking longer than usual."
																: "Checking cloud saves…"
															: "Cloud saves couldn't be checked."}
												</p>
												{owner &&
													(saves.initialCheck === "unavailable" || slow) && (
														<div className="flex flex-wrap gap-2">
															{saves.initialCheck === "unavailable" && (
																<Button
																	type="button"
																	variant="outline"
																	size="sm"
																	className="text-xs"
																	onClick={saves.retry}
																>
																	Retry cloud saves
																</Button>
															)}
															{localOwner !== owner ? (
																<Button
																	type="button"
																	variant="outline"
																	size="sm"
																	className="text-xs"
																	onClick={() => setLocalOwner(owner)}
																>
																	Use saves on this device
																</Button>
															) : (
																<p className="text-xs text-muted-foreground">
																	Using this device's saves.
																</p>
															)}
														</div>
													)}
											</div>
										)}
									</div>
								)}
								<section aria-label="The dungeon">
									<div className="grid gap-2 rounded-md border border-border bg-background/50 px-4 py-3">
										<p className="font-serif text-base font-semibold">
											Twenty floors deep
										</p>
										<p className="text-sm leading-normal text-muted-foreground">
											Each floor is 40 × 40 tiles. The Ember Warden waits on the
											last one, and the way home is longer than the way down.
										</p>
									</div>
									<p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
										Want a different size, floor count or seed? Settings starts
										custom adventures, which aren't ranked.
									</p>
								</section>

								<AppearanceChoice />
								<DeveloperGeneration
									disabled={disabled}
									onChange={setDisabled}
								/>

								<Flourish className="w-full" />

								<DifficultyChoice
									value={configuration.difficulty ?? 1}
									onChange={(difficulty) =>
										setConfiguration((current) => ({
											...current,
											difficulty,
										}))
									}
								/>
							</div>
						</div>
					</Dialog.Popup>
				</Dialog.Portal>
			</Dialog.Root>
		</div>
	);
};

export default AdventureOpening;
