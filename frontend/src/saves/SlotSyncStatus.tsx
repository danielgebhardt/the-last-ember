import { Cloud, CloudAlert, CloudOff, CloudUpload } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { SaveSlot } from "./CloudStore";
import type { SlotSync } from "./CloudSync";
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
		<div
			role="status"
			aria-label={`${slot === "save" ? "Save" : "Autosave"} cloud status`}
			className="grid gap-2 text-xs leading-relaxed"
		>
			<SyncLine sync={sync} />
			{sync.state === "conflict" && (
				<div className="flex flex-wrap gap-2">
					<Button
						size="sm"
						variant="outline"
						onClick={() => saves.resolve(slot, "browser")}
					>
						Keep this device's
					</Button>
					<Button
						size="sm"
						variant="outline"
						onClick={() => saves.resolve(slot, "cloud")}
					>
						Use the other device's
					</Button>
				</div>
			)}
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
				sync.cloud
					? `Changed on another device too: ${sync.cloud.summary}, saved ${time(sync.cloud.savedAt)}. Which one do you want to keep?`
					: "Removed on another device, but changed here. Which one do you want to keep?",
				"text-amber-800 dark:text-amber-300",
			);
	}
};

export default SlotSyncStatus;
