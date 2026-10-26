import { Dialog } from "@base-ui/react/dialog";
import { BadgeCheck, Trash2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "../components/ui/button";
import { EmberMenuHeader } from "../components/ui/EmberMenu";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { DeveloperStatisticsLink } from "../developer/DeveloperStatisticsRoute";
import { slotKey } from "../persistence/LocalAdventureSave";
import { SAVE_SLOTS, type SaveSlot } from "../saves/CloudStore";
import { useStatistics } from "../statistics/StatisticsProvider";
import { useAccountProfile } from "./AccountProfileProvider";
import { useAccount } from "./AccountProvider";
import { displayNameError } from "./DisplayName";
import PrivacyNote from "./PrivacyNote";
export default function AccountDetails() {
	const account = useAccount();
	const profile = useAccountProfile();
	const statistics = useStatistics();
	const [name, setName] = useState("");
	const [saved, setSaved] = useState(false);
	const [open, setOpen] = useState(false);
	const [keep, setKeep] = useState(true);
	const [replace, setReplace] = useState(false);
	const [localError, setLocalError] = useState<string | null>(null);
	const cancel = useRef<HTMLButtonElement>(null);
	const id = useId();
	useEffect(() => {
		setName(profile.displayName ?? "");
	}, [profile.displayName]);
	const [copies, setCopies] = useState<
		{ slot: SaveSlot; text: string; conflict: boolean }[]
	>([]);
	const begin = () => {
		try {
			setCopies(
				SAVE_SLOTS.flatMap((slot) => {
					const text = localStorage.getItem(
						slotKey(slot, account.user?.uid ?? null),
					);
					return text
						? [
								{
									slot,
									text,
									conflict: localStorage.getItem(slotKey(slot, null)) !== null,
								},
							]
						: [];
				}),
			);
			setLocalError(null);
		} catch {
			setCopies([]);
			setLocalError(
				"Browser saves couldn't be read. They will be left untouched.",
			);
		}
		setKeep(true);
		setReplace(false);
		setOpen(true);
	};
	const remove = async () => {
		setLocalError(null);
		try {
			if (keep)
				for (const copy of copies)
					localStorage.setItem(slotKey(copy.slot, null), copy.text);
		} catch {
			setLocalError(
				"Couldn't keep the guest copies. Free browser storage or uncheck that option; your account has not been deleted.",
			);
			return;
		}
		statistics.forget();
		if (await profile.remove()) {
			setOpen(false);
			await account.signOut();
		}
	};
	if (account.status !== "signed-in") return <PrivacyNote />;
	const invalid = name.trim() ? displayNameError(name) : null;
	const conflict = copies.some((copy) => copy.conflict);
	return (
		<div className="grid gap-4">
			<DeveloperStatisticsLink />
			<form
				className="grid gap-2"
				onSubmit={async (event) => {
					event.preventDefault();
					setSaved(await profile.saveName(name));
				}}
			>
				<Label htmlFor={`${id}-name`}>Rankings display name</Label>
				<div className="flex gap-2">
					<Input
						id={`${id}-name`}
						autoComplete="nickname"
						disabled={profile.busy}
						maxLength={48}
						value={name}
						onChange={(event) => {
							setName(event.target.value);
							setSaved(false);
						}}
						aria-describedby={`${id}-name-help`}
					/>
					<Button
						disabled={
							profile.busy || !profile.ready || !!displayNameError(name)
						}
						type="submit"
						variant="outline"
					>
						Save name
					</Button>
				</div>
				<p id={`${id}-name-help`} className="text-xs text-muted-foreground">
					3–24 characters. Letters, numbers, spaces, hyphens and underscores.
					Names can be shared; your email stays private.
				</p>
				{invalid && <p className="text-xs text-destructive">{invalid}</p>}
				{saved && (
					<p
						role="status"
						className="flex items-center gap-1 text-xs text-primary"
					>
						<BadgeCheck className="size-4" />
						Display name saved
					</p>
				)}
			</form>
			{profile.error && (
				<div>
					<p role="alert" className="text-sm text-destructive">
						{profile.error}
					</p>
					<Button variant="outline" onClick={profile.reload}>
						Retry account
					</Button>
				</div>
			)}
			<div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
				<PrivacyNote />
				<Button
					type="button"
					variant="ghost"
					className="text-destructive"
					disabled={profile.busy}
					onClick={begin}
				>
					<Trash2 aria-hidden="true" />
					Delete account
				</Button>
			</div>
			<Dialog.Root
				open={open}
				onOpenChange={(next) => {
					if (!profile.busy) setOpen(next);
				}}
			>
				<Dialog.Portal>
					<Dialog.Backdrop className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs" />
					<Dialog.Popup
						initialFocus={cancel}
						className="ember-menu-frame fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border bg-popover p-5 text-popover-foreground shadow-xl"
					>
						<EmberMenuHeader
							icon={<Trash2 />}
							heading={
								<Dialog.Title className="ember-menu-title">
									Delete your account?
								</Dialog.Title>
							}
							subtitle={
								<Dialog.Description className="ember-menu-description">
									Your sign-in, cloud saves, display name, statistics and
									Rankings will be permanently removed.
								</Dialog.Description>
							}
						/>
						<div className="grid gap-4 text-sm">
							<p>
								Your browser copies stay on this device. This cannot be undone.
							</p>
							<Label className="flex items-start gap-2">
								<input
									type="checkbox"
									checked={keep}
									onChange={(event) => setKeep(event.target.checked)}
									className="mt-1 accent-primary"
								/>
								Keep this account’s Save and Autosave as guest saves
							</Label>
							{keep && conflict && (
								<Label className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
									<input
										type="checkbox"
										checked={replace}
										onChange={(event) => setReplace(event.target.checked)}
										className="mt-1 accent-primary"
									/>
									Replace existing guest{" "}
									{copies
										.filter((copy) => copy.conflict)
										.map((copy) => (copy.slot === "save" ? "Save" : "Autosave"))
										.join(" and ")}{" "}
									on this device
								</Label>
							)}
							{(localError || profile.error) && (
								<p role="alert" className="text-destructive">
									{localError ?? profile.error}
								</p>
							)}
							<div className="flex justify-end gap-2">
								<Button
									ref={cancel}
									type="button"
									variant="outline"
									disabled={profile.busy}
									onClick={() => setOpen(false)}
								>
									Cancel
								</Button>
								<Button
									type="button"
									variant="destructive"
									disabled={profile.busy || (keep && conflict && !replace)}
									onClick={() => void remove()}
								>
									{profile.busy ? "Deleting…" : "Delete permanently"}
								</Button>
							</div>
						</div>
					</Dialog.Popup>
				</Dialog.Portal>
			</Dialog.Root>
		</div>
	);
}
