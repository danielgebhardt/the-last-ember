import { Cloud, CloudAlert, CloudOff, CloudUpload } from "lucide-react";
import type { ReactNode } from "react";
import { saveSummary } from "../domain/saves/SaveFormat";
import type { SaveSlot } from "./CloudStore";
import type { SlotSync } from "./CloudSync";
import { isNewer, SaveChoice } from "./SaveChoiceDialog";
import { useSaves } from "./SavesProvider";

const time = (iso: string) =>
	new Date(iso).toLocaleString(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	});

// Where a slot's cloud copy stands, under its summary in Save/Load. Nothing shows for
// guest play.
const SlotSyncStatus = ({ slot }: { slot: SaveSlot }) => {
	const saves = useSaves();
	const sync = saves.sync(slot);
	if (!sync) return null;
	return (
		<>
			<div
				role="status"
				aria-label={`${slot === "save" ? "Save" : "Autosave"} cloud status`}
				className="grid gap-2 text-xs leading-relaxed"
			>
				<SyncLine sync={sync} />
			</div>
			{/* Outside the live region, so updates don't read both copies aloud. */}
			{sync.state === "conflict" && <SlotConflict slot={slot} />}
		</>
	);
};

// Both copies as the choice itself, in place of the slot's usual summary.
const SlotConflict = ({ slot }: { slot: SaveSlot }) => {
	const saves = useSaves();
	const sync = saves.sync(slot);
	if (sync?.state !== "conflict") return null;
	const local = saves.read(slot);
	const here = local.ok ? local.value : null;
	return (
		<div className="grid gap-2">
			<SaveChoice
				label="This device"
				summary={here ? saveSummary(here) : undefined}
				savedAt={here?.savedAt}
				newer={isNewer(here?.savedAt, sync.cloud?.savedAt)}
				action="Keep this device's"
				onChoose={() => saves.resolve(slot, "browser")}
			/>
			<SaveChoice
				label="Other device"
				summary={sync.cloud?.summary}
				savedAt={sync.cloud?.savedAt}
				newer={isNewer(sync.cloud?.savedAt, here?.savedAt)}
				action={sync.cloud ? "Use the other device's" : "Remove it here too"}
				onChoose={() => saves.resolve(slot, "cloud")}
			/>
		</div>
	);
};

const SyncLine = ({ sync }: { sync: SlotSync }) => {
	const line = (
		icon: ReactNode,
		text: ReactNode,
		tone = "text-muted-foreground",
	) => (
		<p className={`flex items-start gap-1.5 ${tone}`}>
			{icon}
			<span>{text}</span>
		</p>
	);
	const icon = "mt-0.5 size-3.5 shrink-0";
	switch (sync.state) {
		case "checking":
			return line(
				<Cloud aria-hidden="true" className={icon} />,
				"Checking your account…",
			);
		case "pending":
		case "uploading":
			return line(
				<CloudUpload aria-hidden="true" className={icon} />,
				sync.state === "pending"
					? "Waiting to upload to your account…"
					: "Uploading to your account…",
			);
		case "synced":
			return line(
				<Cloud aria-hidden="true" className={`${icon} text-primary`} />,
				sync.at
					? `In your account · synced ${time(sync.at)}`
					: "In your account",
			);
		case "offline":
		case "error":
			return line(
				<CloudOff aria-hidden="true" className={icon} />,
				sync.message,
				"text-amber-800 dark:text-amber-300",
			);
		case "conflict":
			return line(
				<CloudAlert aria-hidden="true" className={icon} />,
				"Changed here and on another device. Choose the one to keep; the other is replaced.",
				"text-amber-800 dark:text-amber-300",
			);
	}
};

export default SlotSyncStatus;
