import { parseSave, saveSummary } from "../domain/saves/SaveFormat";
import { slotKey } from "../persistence/LocalAdventureSave";
import {
	type CloudCopy,
	type CloudStore,
	type CloudWrite,
	SAVE_SLOTS,
	type SaveSlot,
} from "./CloudStore";

// Keeps a signed-in player's browser slots and cloud slots in step. The browser copy is
// the working copy: play never waits for the cloud, and nothing is overwritten without
// the player's say when both sides changed.

export type SlotSync = Readonly<
	| { state: "checking" | "uploading" | "pending" }
	| { state: "synced"; at?: string }
	| { state: "offline" | "error"; message: string }
	// Both sides changed since they last agreed; `cloud` is the other device's copy.
	| { state: "conflict"; cloud: CloudCopy | null }
>;

// Per slot: the cloud revision this browser copy was last in step with, and whether the
// browser copy has changed since.
type SyncMeta = { base: number; dirty: boolean };
type Storage = Pick<globalThis.Storage, "getItem" | "setItem" | "removeItem">;

export const UPLOAD_DELAY_MS = 3000;
export const RETRY_DELAY_MS = 60_000;
const OFFLINE =
	"Offline. Your adventure is saved in this browser and will upload when you're back online.";
const FAILED =
	"Couldn't reach your cloud saves. Your adventure is saved in this browser; we'll try again shortly.";
const UNREADABLE =
	"The cloud copy couldn't be read, so this browser's copy was kept.";

const metaKey = (uid: string, slot: SaveSlot) =>
	`larn:cloud-sync:${uid}:${slot}`;

// Records a browser change before the sync engine has started (Firestore still loading),
// so the next pull uploads it.
export const markChanged = (storage: Storage, uid: string, slot: SaveSlot) => {
	try {
		const text = storage.getItem(metaKey(uid, slot));
		const value = text ? (JSON.parse(text) as Partial<SyncMeta>) : {};
		const base = Number.isInteger(value.base) ? value.base : 0;
		storage.setItem(metaKey(uid, slot), JSON.stringify({ base, dirty: true }));
	} catch {
		// Without storage there is nothing to record.
	}
};

export type CloudSyncOptions = Readonly<{
	uid: string;
	store: CloudStore;
	device: string;
	storage: () => Storage;
	// Something changed: a slot's sync state, or a browser slot taken from the cloud.
	onChange: () => void;
	online?: () => boolean;
	setTimer?: (run: () => void, ms: number) => unknown;
	clearTimer?: (timer: unknown) => void;
	now?: () => Date;
}>;

export class CloudSync {
	private readonly states = new Map<SaveSlot, SlotSync>();
	private readonly timers = new Map<SaveSlot, unknown>();
	private readonly queues = new Map<SaveSlot, Promise<void>>();
	private disposed = false;

	private readonly options: CloudSyncOptions;

	constructor(options: CloudSyncOptions) {
		this.options = options;
		for (const slot of SAVE_SLOTS) this.states.set(slot, { state: "checking" });
	}

	state(slot: SaveSlot): SlotSync {
		return this.states.get(slot) ?? { state: "checking" };
	}

	// Brings both slots up to date with the cloud: takes newer cloud copies the browser
	// hasn't changed, uploads browser changes, and flags slots where both changed.
	pull(): Promise<void> {
		return Promise.all(
			SAVE_SLOTS.map((slot) => this.queue(slot, () => this.pullSlot(slot))),
		).then(() => {});
	}

	// The browser slot was just written or cleared: upload it shortly.
	changed(slot: SaveSlot) {
		this.writeMeta(slot, { ...this.meta(slot), dirty: true });
		if (this.state(slot).state !== "conflict")
			this.set(slot, { state: "pending" });
		this.schedule(slot, UPLOAD_DELAY_MS);
	}

	// Uploads every waiting change now (the tab is closing, or the player signs out).
	flush(): Promise<void> {
		return Promise.all(
			SAVE_SLOTS.map((slot) => {
				this.cancel(slot);
				return this.queue(slot, () => this.pushSlot(slot));
			}),
		).then(() => {});
	}

	// The player's answer to a conflict: keep this browser's copy (overwriting the cloud),
	// or take the cloud copy into this browser's slot.
	resolve(slot: SaveSlot, keep: "browser" | "cloud"): Promise<void> {
		return this.queue(slot, async () => {
			const sync = this.state(slot);
			if (sync.state !== "conflict") return;
			const cloud = sync.cloud;
			if (keep === "cloud") {
				this.adopt(slot, cloud);
				return;
			}
			this.writeMeta(slot, { base: cloud?.revision ?? 0, dirty: true });
			this.set(slot, { state: "pending" });
			await this.pushSlot(slot);
		});
	}

	dispose() {
		this.disposed = true;
		for (const slot of SAVE_SLOTS) this.cancel(slot);
	}

	private async pullSlot(slot: SaveSlot) {
		let cloud: CloudCopy | null;
		try {
			cloud = await this.options.store.get(slot);
		} catch {
			this.failed(slot);
			return;
		}
		const meta = this.meta(slot);
		const local = this.local(slot);
		const cloudRevision = cloud?.revision ?? 0;
		if (cloudRevision === meta.base) {
			if (meta.dirty) await this.pushSlot(slot);
			else this.set(slot, { state: "synced" });
			return;
		}
		// The cloud moved on (another device wrote or emptied it).
		if (!meta.dirty || local === null) this.adopt(slot, cloud);
		else this.set(slot, { state: "conflict", cloud });
	}

	private async pushSlot(slot: SaveSlot) {
		const meta = this.meta(slot);
		if (!meta.dirty) return;
		if (this.state(slot).state === "conflict") return;
		const text = this.local(slot);
		let result: CloudWrite;
		this.set(slot, { state: "uploading" });
		try {
			if (text === null)
				result = await this.options.store.remove(slot, meta.base);
			else {
				const parsed = parseSave(text);
				if (!parsed.ok) {
					this.set(slot, { state: "error", message: parsed.error });
					return;
				}
				result = await this.options.store.put(
					slot,
					{
						device: this.options.device,
						savedAt: parsed.value.savedAt,
						summary: saveSummary(parsed.value),
						text,
					},
					meta.base,
				);
			}
		} catch {
			this.failed(slot);
			return;
		}
		if (result.ok) {
			// A newer browser write during the upload stays waiting for the next one.
			const changed = this.local(slot) !== text;
			this.writeMeta(slot, { base: result.revision, dirty: changed });
			if (changed) this.changed(slot);
			else this.set(slot, { state: "synced", at: this.now().toISOString() });
		} else if (text === null && result.current === null) {
			this.writeMeta(slot, { base: 0, dirty: false });
			this.set(slot, { state: "synced", at: this.now().toISOString() });
		} else this.set(slot, { state: "conflict", cloud: result.current });
	}

	// Puts the cloud copy (or its absence) in this browser's slot.
	private adopt(slot: SaveSlot, cloud: CloudCopy | null) {
		const key = slotKey(slot, this.options.uid);
		if (cloud) {
			const parsed = parseSave(cloud.text);
			if (!parsed.ok) {
				this.set(slot, { state: "error", message: UNREADABLE });
				return;
			}
		}
		try {
			if (cloud) this.options.storage().setItem(key, cloud.text);
			else this.options.storage().removeItem(key);
		} catch {
			this.set(slot, {
				state: "error",
				message:
					"Browser storage is unavailable, so the cloud copy couldn't be kept here.",
			});
			return;
		}
		this.writeMeta(slot, { base: cloud?.revision ?? 0, dirty: false });
		this.set(slot, { state: "synced", at: this.now().toISOString() });
	}

	private failed(slot: SaveSlot) {
		const online = this.options.online?.() ?? true;
		this.set(slot, {
			state: online ? "error" : "offline",
			message: online ? FAILED : OFFLINE,
		});
		this.schedule(slot, RETRY_DELAY_MS);
	}

	private schedule(slot: SaveSlot, ms: number) {
		if (this.disposed) return;
		this.cancel(slot);
		const setTimer =
			this.options.setTimer ?? ((run, delay) => setTimeout(run, delay));
		this.timers.set(
			slot,
			setTimer(() => {
				this.timers.delete(slot);
				void this.queue(slot, () =>
					this.meta(slot).dirty ? this.pushSlot(slot) : this.pullSlot(slot),
				);
			}, ms),
		);
	}

	private cancel(slot: SaveSlot) {
		const timer = this.timers.get(slot);
		if (timer === undefined) return;
		(this.options.clearTimer ?? ((t) => clearTimeout(t as number)))(timer);
		this.timers.delete(slot);
	}

	// One cloud operation per slot at a time, in order.
	private queue(slot: SaveSlot, run: () => Promise<void>): Promise<void> {
		const next = (this.queues.get(slot) ?? Promise.resolve()).then(() =>
			this.disposed ? undefined : run(),
		);
		this.queues.set(
			slot,
			next.catch(() => {}),
		);
		return next;
	}

	private local(slot: SaveSlot): string | null {
		try {
			return this.options.storage().getItem(slotKey(slot, this.options.uid));
		} catch {
			return null;
		}
	}

	private meta(slot: SaveSlot): SyncMeta {
		try {
			const text = this.options
				.storage()
				.getItem(metaKey(this.options.uid, slot));
			const value = text ? (JSON.parse(text) as Partial<SyncMeta>) : {};
			return {
				base: Number.isInteger(value.base) ? (value.base as number) : 0,
				// A browser slot this device never synced counts as a change to upload.
				dirty:
					typeof value.dirty === "boolean"
						? value.dirty
						: this.local(slot) !== null,
			};
		} catch {
			return { base: 0, dirty: this.local(slot) !== null };
		}
	}

	private writeMeta(slot: SaveSlot, meta: SyncMeta) {
		try {
			this.options
				.storage()
				.setItem(metaKey(this.options.uid, slot), JSON.stringify(meta));
		} catch {
			// Without storage the next pull compares against revision 0 again.
		}
	}

	private set(slot: SaveSlot, sync: SlotSync) {
		if (this.disposed) return;
		this.states.set(slot, sync);
		this.options.onChange();
	}

	private now() {
		return this.options.now?.() ?? new Date();
	}
}
