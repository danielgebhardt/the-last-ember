// Cloud save slots in Firestore: saves/{uid}/slots/{save|autosave}. Security rules
// (firestore.rules) let only that player read or write them, and only by advancing the
// revision one step. Uses the lite client: the game keeps its own browser copy, so
// Firestore's offline cache would only add download size.
import type { FirebaseApp } from "firebase/app";
import {
	Bytes,
	connectFirestoreEmulator,
	doc,
	getDoc,
	getFirestore,
	runTransaction,
} from "firebase/firestore/lite";
import {
	CLOUD_SAVE_LIMIT,
	type CloudCopy,
	type CloudStore,
	compressSave,
	decompressSave,
	type SaveSlot,
} from "../saves/CloudStore";

type SlotDocument = Readonly<{
	revision: number;
	device: string;
	savedAt: string;
	summary: string;
	data: Bytes;
}>;

const connected = new WeakSet<FirebaseApp>();

export const createCloudStore = (
	app: FirebaseApp,
	uid: string,
	emulatorHost?: string,
): CloudStore => {
	const db = getFirestore(app);
	if (emulatorHost && !connected.has(app)) {
		const [host, port] = emulatorHost.split(":");
		connectFirestoreEmulator(db, host, Number(port));
		connected.add(app);
	}
	const slot = (name: SaveSlot) => doc(db, "saves", uid, "slots", name);
	const read = async (data: SlotDocument | undefined) =>
		data
			? {
					revision: data.revision,
					device: data.device,
					savedAt: data.savedAt,
					summary: data.summary,
					text: await decompressSave(data.data.toUint8Array()),
				}
			: null;
	// Revision check and write in one transaction, so two devices can't both win.
	const swap = async (
		name: SaveSlot,
		expected: number,
		next: SlotDocument | null,
	) => {
		const outcome = await runTransaction(db, async (transaction) => {
			const current = await transaction.get(slot(name));
			const data = current.data() as SlotDocument | undefined;
			if ((data?.revision ?? 0) !== expected)
				return { ok: false as const, data };
			if (next) transaction.set(slot(name), next);
			else if (data) transaction.delete(slot(name));
			return { ok: true as const };
		});
		return outcome.ok
			? { ok: true as const, revision: next?.revision ?? 0 }
			: { ok: false as const, current: await read(outcome.data) };
	};

	return {
		get: async (name) =>
			read((await getDoc(slot(name))).data() as SlotDocument | undefined),
		put: async (name, copy: Omit<CloudCopy, "revision">, expected) => {
			const data = await compressSave(copy.text);
			if (data.byteLength >= CLOUD_SAVE_LIMIT)
				throw new Error("This adventure is too large to keep in the cloud.");
			return swap(name, expected, {
				revision: expected + 1,
				device: copy.device,
				savedAt: copy.savedAt,
				summary: copy.summary,
				data: Bytes.fromUint8Array(data),
			});
		},
		remove: (name, expected) => swap(name, expected, null),
	};
};
