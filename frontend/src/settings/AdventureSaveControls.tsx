import { Dialog } from "@base-ui/react/dialog";
import { FolderOpen, History, Save } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { type SaveDocument, saveSummary } from "../domain/saves/SaveFormat";
import { useSaves } from "../saves/SavesProvider";
import SlotSyncStatus from "../saves/SlotSyncStatus";

const AdventureSaveControls = ({
	createSnapshot,
	onRestore,
}: {
	createSnapshot?: () => SaveDocument;
	onRestore: (document: SaveDocument) => void;
}) => {
	const saves = useSaves();
	const [slot, setSlot] = useState(() => saves.read("save"));
	const [autosave, setAutosave] = useState(() => saves.read("autosave"));
	// Signing in or out, or a cloud copy arriving, changes what the slots hold.
	// biome-ignore lint/correctness/useExhaustiveDependencies: owner and version mark changes.
	useEffect(() => {
		setSlot(saves.read("save"));
		setAutosave(saves.read("autosave"));
	}, [saves.owner, saves.version]);
	const signedIn = saves.owner !== null;
	const [feedback, setFeedback] = useState("");
	const [pending, setPending] = useState<{
		kind: "save" | "load";
		document: SaveDocument;
	} | null>(null);
	const cancelRef = useRef<HTMLButtonElement>(null);
	const initiatorRef = useRef<HTMLButtonElement | null>(null);
	const restoring = useRef(false);

	const saved = slot.ok ? slot.value : null;
	const requestSave = (button: HTMLButtonElement) => {
		if (!createSnapshot) return;
		restoring.current = false;
		initiatorRef.current = button;
		setSlot(saves.read("save"));
		try {
			setPending({ kind: "save", document: createSnapshot() });
			setFeedback("");
		} catch {
			setFeedback("Could not prepare this adventure for saving.");
		}
	};
	const requestLoad = (button: HTMLButtonElement) => {
		restoring.current = false;
		initiatorRef.current = button;
		const latest = saves.read("save");
		setSlot(latest);
		if (!latest.ok) {
			setFeedback(latest.error);
			return;
		}
		if (!latest.value) {
			setFeedback("No local adventure has been saved yet.");
			return;
		}
		setPending({ kind: "load", document: latest.value });
		setFeedback("");
	};
	const requestAutosaveLoad = (button: HTMLButtonElement) => {
		restoring.current = false;
		initiatorRef.current = button;
		const latest = saves.read("autosave");
		setAutosave(latest);
		if (!latest.ok || !latest.value) {
			setFeedback(latest.ok ? "There is no autosave right now." : latest.error);
			return;
		}
		setPending({ kind: "load", document: latest.value });
		setFeedback("");
	};
	const autosaved = autosave.ok ? autosave.value : null;
	const confirm = () => {
		if (!pending) return;
		if (pending.kind === "load") {
			// The enclosing sheet owns focus when loading closes both dialogs.
			restoring.current = true;
			onRestore(pending.document);
		} else {
			const result = saves.write("save", pending.document);
			if (result.ok) {
				setSlot(result);
				setFeedback(
					signedIn
						? "Adventure saved. Its cloud status is shown above."
						: "Adventure saved in this browser.",
				);
			} else setFeedback(result.error);
		}
		setPending(null);
	};
	return (
		<section aria-label="Adventure saves" className="grid gap-4">
			<section
				aria-label={signedIn ? "Account save" : "Browser save"}
				className="grid gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4"
			>
				<h3 className="flex items-center gap-2 font-medium">
					<FolderOpen aria-hidden="true" className="size-4 text-primary" />
					{signedIn ? "Account save" : "Browser save"}
				</h3>
				<p className="text-xs leading-relaxed text-muted-foreground">
					{signedIn
						? createSnapshot
							? "One save, kept in your account on every device you sign in on. Saving replaces it; loading replaces your current adventure."
							: "Resume the adventure saved in your account."
						: createSnapshot
							? "One save on this device. Saving replaces this slot; loading replaces your current adventure."
							: "Resume the adventure saved in this browser."}
				</p>
				<div className="rounded-lg border bg-background/70 p-3 text-xs leading-relaxed">
					{saved ? (
						<>
							<p className="font-medium">{saveSummary(saved)}</p>
							<time
								dateTime={saved.savedAt}
								className="mt-1 block text-muted-foreground"
							>
								{new Date(saved.savedAt).toLocaleString()}
							</time>
						</>
					) : (
						<p>{slot.ok ? "No saved adventure yet." : slot.error}</p>
					)}
				</div>
				<SlotSyncStatus slot="save" />
				<div className={createSnapshot ? "grid grid-cols-2 gap-2" : "grid"}>
					{createSnapshot && (
						<Button onClick={(event) => requestSave(event.currentTarget)}>
							<Save aria-hidden="true" />
							Save adventure
						</Button>
					)}
					<Button
						variant={createSnapshot ? "outline" : "default"}
						disabled={!saved}
						onClick={(event) => requestLoad(event.currentTarget)}
					>
						<FolderOpen aria-hidden="true" />
						Load adventure
					</Button>
				</div>
			</section>
			<section
				aria-label="Autosave"
				className="grid gap-3 rounded-xl border bg-muted/15 p-4"
			>
				<h3 className="flex items-center gap-2 font-medium">
					<History aria-hidden="true" className="size-4 text-primary" />
					Autosave
				</h3>
				<p className="text-xs leading-relaxed text-muted-foreground">
					Saved automatically on each floor change, town visit and town
					purchase, and every 100 turns. Separate from your{" "}
					{signedIn ? "account" : "browser"} save, and cleared when an adventure
					ends.
				</p>
				<div className="rounded-lg border bg-background/70 p-3 text-xs leading-relaxed">
					{autosaved ? (
						<>
							<p className="font-medium">{saveSummary(autosaved)}</p>
							<time
								dateTime={autosaved.savedAt}
								className="mt-1 block text-muted-foreground"
							>
								{new Date(autosaved.savedAt).toLocaleString()}
							</time>
						</>
					) : (
						<p>{autosave.ok ? "No autosave yet." : autosave.error}</p>
					)}
				</div>
				<SlotSyncStatus slot="autosave" />
				<Button
					variant="outline"
					disabled={!autosaved}
					onClick={(event) => requestAutosaveLoad(event.currentTarget)}
				>
					<FolderOpen aria-hidden="true" />
					Load autosave
				</Button>
			</section>
			{feedback && (
				<p
					role="status"
					aria-label="Save feedback"
					className="rounded-lg border bg-muted/30 p-3 text-xs leading-relaxed"
				>
					{feedback}
				</p>
			)}
			<Dialog.Root
				open={pending !== null}
				onOpenChange={(open) => {
					if (!open) setPending(null);
				}}
			>
				<Dialog.Portal>
					<Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs" />
					<Dialog.Popup
						initialFocus={cancelRef}
						finalFocus={() =>
							restoring.current ? false : initiatorRef.current
						}
						className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-popover p-5 text-popover-foreground shadow-xl"
					>
						<Dialog.Title className="text-lg font-semibold">
							{pending?.kind === "load"
								? "Load saved adventure?"
								: "Save this adventure?"}
						</Dialog.Title>
						<Dialog.Description className="mt-2 text-sm text-muted-foreground">
							{pending?.kind === "load"
								? createSnapshot
									? "Your current progress will be replaced by this saved adventure."
									: "Resume this saved adventure from where you left off."
								: saved
									? "Your previous saved adventure will be replaced."
									: slot.ok
										? signedIn
											? "Store this adventure in your account's save slot."
											: "Store this adventure in your browser's single save slot."
										: "The existing slot cannot be read. Saving will replace it."}
						</Dialog.Description>
						{pending && (
							<p className="mt-3 rounded-md border bg-muted/20 p-3 text-sm">
								{saveSummary(pending.document)}
							</p>
						)}
						{pending?.kind === "save" && saved && (
							<p className="mt-2 text-xs text-muted-foreground">
								Replacing: {saveSummary(saved)}
							</p>
						)}
						<div className="mt-5 flex justify-end gap-2">
							<Button
								ref={cancelRef}
								variant="outline"
								onClick={() => setPending(null)}
							>
								Cancel
							</Button>
							<Button onClick={confirm}>
								{pending?.kind === "load" ? "Confirm load" : "Confirm save"}
							</Button>
						</div>
					</Dialog.Popup>
				</Dialog.Portal>
			</Dialog.Root>
		</section>
	);
};

export default AdventureSaveControls;
