// @vitest-environment node
// Runs only inside the Firebase emulators: `pnpm test:emulator`.
import { type FirebaseApp, initializeApp } from "firebase/app";
import {
	connectAuthEmulator,
	createUserWithEmailAndPassword,
	getAuth,
} from "firebase/auth";
import {
	Bytes,
	connectFirestoreEmulator,
	doc,
	getDoc,
	getFirestore,
	setDoc,
} from "firebase/firestore/lite";
import { describe, expect, it } from "vitest";
import { profileActions } from "../../server/Profile.ts";
import { createCloudStore } from "../accounts/CloudSaves";
import { serializeSave } from "../domain/saves/SaveFormat";
import { savedAdventure } from "./SaveTestHelpers";

// Set by `firebase emulators:exec`; the app's own types don't include Node's.
const env =
	(globalThis as { process?: { env: Record<string, string | undefined> } })
		.process?.env ?? {};
const authHost = env.FIREBASE_AUTH_EMULATOR_HOST;
const firestoreHost = env.FIRESTORE_EMULATOR_HOST;
const projectId = env.FIREBASE_PROJECT_ID ?? "demo-wardens-flame";

// A separate signed-in player, as if on their own device.
let players = 0;
const player = async () => {
	const app = initializeApp(
		{
			apiKey: "demo-key",
			authDomain: `${projectId}.firebaseapp.com`,
			projectId,
		},
		`cloud-saves-${Date.now()}-${players++}`,
	);
	const auth = getAuth(app);
	connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
	const { user } = await createUserWithEmailAndPassword(
		auth,
		`saver-${Date.now()}-${players}@example.com`,
		"ember-flame",
	);
	await profileActions.read(user.uid);
	return { app, uid: user.uid };
};
const firestore = (app: FirebaseApp) => {
	const db = getFirestore(app);
	const [host, port] = (firestoreHost ?? "").split(":");
	connectFirestoreEmulator(db, host, Number(port));
	return db;
};
const copy = (turn: number) => {
	const document = savedAdventure();
	document.state.turn = turn;
	return {
		device: "laptop",
		savedAt: document.savedAt,
		summary: `Turn ${turn}`,
		text: serializeSave(document),
	};
};

describe.skipIf(!authHost || !firestoreHost)(
	"Cloud saves in the emulator",
	() => {
		it("round-trips a compressed save and refuses stale revisions", async () => {
			const { app, uid } = await player();
			const store = createCloudStore(app, uid, firestoreHost);
			expect(await store.get("save")).toBeNull();
			expect(await store.put("save", copy(10), 0)).toEqual({
				ok: true,
				revision: 1,
			});
			expect(await store.get("save")).toMatchObject({
				revision: 1,
				text: copy(10).text,
			});
			const stale = await store.put("save", copy(11), 0);
			expect(stale).toMatchObject({ ok: false, current: { revision: 1 } });
			expect(await store.put("save", copy(12), 1)).toEqual({
				ok: true,
				revision: 2,
			});
			expect(await store.remove("save", 2)).toEqual({ ok: true, revision: 0 });
			expect(await store.get("save")).toBeNull();
		});

		it("lets nobody else read or write a player's saves", async () => {
			const owner = await player();
			await createCloudStore(owner.app, owner.uid, firestoreHost).put(
				"autosave",
				copy(10),
				0,
			);
			const other = await player();
			const db = firestore(other.app);
			const theirs = doc(db, "saves", owner.uid, "slots", "autosave");
			await expect(getDoc(theirs)).rejects.toMatchObject({
				code: "permission-denied",
			});
			await expect(
				setDoc(theirs, {
					revision: 2,
					device: "thief",
					savedAt: "now",
					summary: "stolen",
					data: Bytes.fromUint8Array(new Uint8Array([1])),
				}),
			).rejects.toMatchObject({ code: "permission-denied" });
			// The owner can't skip revisions or add other fields either.
			const mine = doc(
				firestore(owner.app),
				"saves",
				owner.uid,
				"slots",
				"save",
			);
			await expect(
				setDoc(mine, {
					revision: 5,
					device: "laptop",
					savedAt: "now",
					summary: "s",
					data: Bytes.fromUint8Array(new Uint8Array([1])),
				}),
			).rejects.toMatchObject({ code: "permission-denied" });
		});
	},
);
