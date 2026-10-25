import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { rememberedUser, useAccount } from "../accounts/AccountProvider";
import type { SaveDocument, SaveResult } from "../domain/saves/SaveFormat";
import {
	readLocalSave,
	slotKey,
	writeLocalSave,
} from "../persistence/LocalAdventureSave";
import { SAVE_SLOTS, type SaveSlot } from "./CloudStore";
import { CloudSync, markChanged, type SlotSync } from "./CloudSync";

// A guest adventure in this browser when someone signs in, and what their account
// already holds, so they can choose which to keep.
export type GuestOffer = Readonly<{
	guest: SaveDocument;
	account: SaveDocument | null;
}>;

export type Saves = Readonly<{
	// Whose browser slots these are: the signed-in player's ID, or null for guest play.
	owner: string | null;
	// Goes up whenever a browser slot may have changed outside the game (a cloud copy
	// arrived), so screens showing a slot read it again.
	version: number;
	read: (slot: SaveSlot) => SaveResult<SaveDocument | null>;
	write: (slot: SaveSlot, document: SaveDocument) => SaveResult<SaveDocument>;
	clear: (slot: SaveSlot) => void;
	// The slot's cloud state, or null when nobody is signed in (or sync hasn't started).
	sync: (slot: SaveSlot) => SlotSync | null;
	resolve: (slot: SaveSlot, keep: "browser" | "cloud") => Promise<void>;
	guestOffer: GuestOffer | null;
	// "move": the guest adventure replaces the account's; otherwise the guest slots stay.
	settleGuest: (move: boolean) => void;
	// Uploads waiting changes, then signs out.
	signOut: () => Promise<void>;
}>;

const storage = () => window.localStorage;
const DEVICE_KEY = "larn:device";
const deviceId = () => {
	try {
		let id = storage().getItem(DEVICE_KEY);
		if (!id) {
			id = crypto.randomUUID();
			storage().setItem(DEVICE_KEY, id);
		}
		return id;
	} catch {
		return "unknown";
	}
};
const removeSlot = (slot: SaveSlot, owner: string | null) => {
	try {
		storage().removeItem(slotKey(slot, owner));
	} catch {
		// Unavailable storage has nothing to clear.
	}
};
const documentOf = (result: SaveResult<SaveDocument | null>) =>
	result.ok ? result.value : null;
const newest = (owner: string | null) =>
	SAVE_SLOTS.map((slot) =>
		documentOf(readLocalSave(storage, slotKey(slot, owner))),
	)
		.filter((document): document is SaveDocument => document !== null)
		.sort((a, b) => b.savedAt.localeCompare(a.savedAt))[0] ?? null;
// Waiting uploads get a few seconds before sign-out goes ahead regardless.
const FLUSH_LIMIT_MS = 5000;

const localOnly = (
	owner: string | null,
	signOut: () => Promise<void>,
): Saves => ({
	owner,
	version: 0,
	read: (slot) => readLocalSave(storage, slotKey(slot, owner)),
	write: (slot, document) =>
		writeLocalSave(document, storage, slotKey(slot, owner)),
	clear: (slot) => removeSlot(slot, owner),
	sync: () => null,
	resolve: async () => {},
	guestOffer: null,
	settleGuest: () => {},
	signOut,
});

const SavesContext = createContext<Saves | null>(null);

export const SavesProvider = ({ children }: { children: ReactNode }) => {
	const account = useAccount();
	const signedIn =
		account.status === "signed-in" ? account.user?.uid : undefined;
	// While a remembered session is checked, its slots are already this player's.
	const owner =
		signedIn ?? (account.status === "loading" ? rememberedUser() : null);
	const [version, setVersion] = useState(0);
	const [guestOffer, setGuestOffer] = useState<GuestOffer | null>(null);
	const engine = useRef<CloudSync | null>(null);
	const previousStatus = useRef(account.status);
	const refresh = () => setVersion((value) => value + 1);

	// biome-ignore lint/correctness/useExhaustiveDependencies: restart only for a new player.
	useEffect(() => {
		const justSignedIn = previousStatus.current === "signed-out";
		previousStatus.current = account.status;
		if (!signedIn) return;
		let sync: CloudSync | null = null;
		let stopped = false;
		const hidden = () => {
			if (document.visibilityState === "hidden") void sync?.flush();
		};
		const online = () => void sync?.pull();
		account.cloudStore().then(
			(store) => {
				if (stopped || !store) return;
				sync = new CloudSync({
					uid: signedIn,
					store,
					device: deviceId(),
					storage,
					onChange: refresh,
					online: () => navigator.onLine,
				});
				engine.current = sync;
				refresh();
				void sync.pull().then(() => {
					if (stopped || !justSignedIn) return;
					const guest = newest(null);
					if (guest) setGuestOffer({ guest, account: newest(signedIn) });
				});
			},
			() => {},
		);
		document.addEventListener("visibilitychange", hidden);
		window.addEventListener("online", online);
		return () => {
			stopped = true;
			sync?.dispose();
			engine.current = null;
			setGuestOffer(null);
			document.removeEventListener("visibilitychange", hidden);
			window.removeEventListener("online", online);
		};
	}, [signedIn]);

	useEffect(() => {
		if (!signedIn) previousStatus.current = account.status;
	}, [account.status, signedIn]);

	const changed = (slot: SaveSlot) => {
		if (!owner) return;
		if (engine.current) engine.current.changed(slot);
		else markChanged(storage(), owner, slot);
	};
	const base = localOnly(owner, async () => {});
	const saves: Saves = {
		...base,
		version,
		write: (slot, document) => {
			const result = base.write(slot, document);
			if (result.ok) changed(slot);
			return result;
		},
		clear: (slot) => {
			base.clear(slot);
			changed(slot);
		},
		sync: (slot) => engine.current?.state(slot) ?? null,
		resolve: async (slot, keep) => {
			await engine.current?.resolve(slot, keep);
			refresh();
		},
		guestOffer,
		settleGuest: (move) => {
			setGuestOffer(null);
			if (!move || !signedIn) return;
			for (const slot of SAVE_SLOTS) {
				const text = (() => {
					try {
						return storage().getItem(slotKey(slot, null));
					} catch {
						return null;
					}
				})();
				if (text === null) continue;
				try {
					storage().setItem(slotKey(slot, signedIn), text);
				} catch {
					continue;
				}
				removeSlot(slot, null);
				changed(slot);
				// The guest adventure was chosen over the account's, so it wins any conflict.
				if (engine.current?.state(slot).state === "conflict")
					void engine.current.resolve(slot, "browser");
			}
			refresh();
		},
		signOut: async () => {
			const sync = engine.current;
			if (sync)
				await Promise.race([
					sync.flush(),
					new Promise((resolve) => setTimeout(resolve, FLUSH_LIMIT_MS)),
				]);
			await account.signOut();
		},
	};
	return (
		<SavesContext.Provider value={saves}>{children}</SavesContext.Provider>
	);
};

// Outside a provider (some tests render parts of the app alone), saves are the guest's
// browser slots with no cloud.
export const useSaves = (): Saves => {
	const account = useAccount();
	return useContext(SavesContext) ?? localOnly(null, account.signOut);
};
