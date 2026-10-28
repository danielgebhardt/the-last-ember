import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { type SaveDocument, saveSummary } from "../domain/saves/SaveFormat";
import { SAVE_SLOTS } from "./CloudStore";
import SaveChoiceDialog, {
	isNewer,
	SaveChoice,
	SaveCopy,
} from "./SaveChoiceDialog";
import { useSaves } from "./SavesProvider";

type Props = Readonly<{
	// An adventure is being played (not the opening screen).
	inPlay: boolean;
	onLoad: (document: SaveDocument) => void;
	onLeave: () => void;
}>;

// After signing in with a guest adventure in this browser: keep it in the account, or
// leave it here as the guest's.
export const GuestAdventureDialog = ({ inPlay, onLoad, onLeave }: Props) => {
	const saves = useSaves();
	const offer = saves.guestOffer;
	if (!offer) return null;
	const guest = (
		<SaveCopy
			label="On this device"
			summary={saveSummary(offer.guest)}
			savedAt={offer.guest.savedAt}
		/>
	);
	if (!offer.account)
		return (
			<SaveChoiceDialog
				open
				title="Keep this adventure in your account?"
				description="It will be saved to your account, so you can continue it on any device you sign in on."
				actions={
					<>
						<Button
							variant="outline"
							onClick={() => {
								saves.settleGuest(false);
								if (inPlay) onLeave();
							}}
						>
							Leave it on this device
						</Button>
						<Button onClick={() => saves.settleGuest(true)}>
							Keep it in my account
						</Button>
					</>
				}
			>
				{guest}
			</SaveChoiceDialog>
		);
	const account = offer.account;
	return (
		<SaveChoiceDialog
			open
			wide
			title="Your account already has an adventure"
			description="Choose which one to keep in your account. The other stays on this device for signed-out play."
		>
			<SaveChoice
				label="In your account"
				summary={saveSummary(account)}
				savedAt={account.savedAt}
				newer={isNewer(account.savedAt, offer.guest.savedAt)}
				action={inPlay ? "Play my account's" : "Keep my account's"}
				onChoose={() => {
					saves.settleGuest(false);
					if (inPlay) onLoad(account);
				}}
			/>
			<SaveChoice
				label="On this device"
				summary={saveSummary(offer.guest)}
				savedAt={offer.guest.savedAt}
				newer={isNewer(offer.guest.savedAt, account.savedAt)}
				action="Keep this device's"
				onChoose={() => saves.settleGuest(true)}
			/>
		</SaveChoiceDialog>
	);
};

// A slot changed on this device and another since they last agreed. Asked once per
// conflict; "Decide later" leaves the choice in Save/Load.
export const CloudConflictDialog = ({
	inPlay,
	onLoad,
	onActiveChange,
}: Omit<Props, "onLeave"> & { onActiveChange?: (active: boolean) => void }) => {
	const saves = useSaves();
	const later = useRef<HTMLButtonElement>(null);
	const [dismissed, setDismissed] = useState<readonly string[]>([]);
	const found = SAVE_SLOTS.map((slot) => ({
		slot,
		sync: saves.sync(slot),
	})).find(
		({ slot, sync }) =>
			sync?.state === "conflict" &&
			!dismissed.includes(
				`${saves.owner}:${slot}:${sync.cloud?.revision ?? 0}`,
			),
	);
	const sync = found?.sync;
	const active = !saves.guestOffer && !!found && sync?.state === "conflict";
	useEffect(() => {
		onActiveChange?.(active);
	}, [active, onActiveChange]);
	if (!active || !found || sync?.state !== "conflict") return null;
	const { slot } = found;
	const local = saves.read(slot);
	const here = local.ok ? local.value : null;
	// The autosave follows the adventure in play, so taking the other copy means playing it.
	const loads = inPlay && slot === "autosave";
	return (
		<SaveChoiceDialog
			open
			wide
			initialFocus={later}
			title="Your adventure changed on another device"
			description={`Your ${slot === "save" ? "save" : "autosave"} was updated on this device and on another one. Choose the one to keep; the other is replaced.`}
			actions={
				<Button
					ref={later}
					variant="ghost"
					onClick={() =>
						setDismissed((list) => [
							...list,
							`${saves.owner}:${slot}:${sync.cloud?.revision ?? 0}`,
						])
					}
				>
					Decide later
				</Button>
			}
		>
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
				action={
					!sync.cloud
						? "Remove it here too"
						: loads
							? "Load the other device's"
							: "Use the other device's"
				}
				onChoose={async () => {
					await saves.resolve(slot, "cloud");
					const taken = saves.read(slot);
					if (loads && taken.ok && taken.value) onLoad(taken.value);
				}}
			/>
		</SaveChoiceDialog>
	);
};
