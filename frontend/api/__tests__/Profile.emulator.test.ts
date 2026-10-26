// @vitest-environment node
import { deleteApp, initializeApp } from "firebase/app";
import {
	connectAuthEmulator,
	createUserWithEmailAndPassword,
	getAuth,
} from "firebase/auth";
import {
	Bytes,
	connectFirestoreEmulator,
	doc,
	getFirestore,
	setDoc,
} from "firebase/firestore/lite";
import { describe, expect, it } from "vitest";
import {
	authAdmin,
	database,
	deleteAccountData,
} from "../../server/AccountData.ts";
import { writeStatistics } from "../../server/Statistics.ts";
import { savedAdventure } from "../../src/__tests/SaveTestHelpers.ts";
import { summarizeRun } from "../../src/domain/saves/RunStatistics.ts";

const projectId = process.env.FIREBASE_PROJECT_ID ?? "demo-wardens-flame";
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const host = process.env.FIRESTORE_EMULATOR_HOST;
describe.skipIf(!authHost || !host)("Account deletion in the emulators", () => {
	it("removes all owned cloud data and Auth, preserves other accounts, and blocks stale tokens", async () => {
		if (!projectId.startsWith("demo-"))
			throw new Error("Demo project required");
		const profileBundle = new URL("../../server/profile.mjs", import.meta.url)
			.href;
		const statsBundle = new URL("../../server/statistics.mjs", import.meta.url)
			.href;
		const { GET, PUT, DELETE } = await import(/* @vite-ignore */ profileBundle);
		const { POST } = await import(/* @vite-ignore */ statsBundle);
		const app = initializeApp(
			{ apiKey: "demo", projectId },
			`delete-${Date.now()}`,
		);
		try {
			const auth = getAuth(app);
			connectAuthEmulator(auth, `http://${authHost}`, {
				disableWarnings: true,
			});
			const { user } = await createUserWithEmailAndPassword(
				auth,
				`delete-${Date.now()}@example.com`,
				"ember-flame",
			);
			const token = await user.getIdToken();
			const request = (method: string, body?: unknown) =>
				new Request("http://localhost/api/profile", {
					method,
					headers: { authorization: `Bearer ${token}` },
					...(body === undefined ? {} : { body: JSON.stringify(body) }),
				});
			expect((await GET(request("GET"))).status).toBe(200);
			expect(
				(await PUT(request("PUT", { displayName: "Ember Walker" }))).status,
			).toBe(200);
			expect(
				(await database().doc(`profiles/${user.uid}`).get()).data(),
			).toMatchObject({ active: true, displayName: "Ember Walker" });
			const batch = database().batch();
			const ids = Array.from({ length: 205 }, () => crypto.randomUUID());
			for (const id of ids)
				batch.create(database().doc(`statistics/${user.uid}_${id}`), {
					seed: 123,
				});
			const run = crypto.randomUUID();
			batch.create(database().doc(`rankings/${user.uid}_${run}`), {
				outcome: "won",
			});
			batch.set(database().doc(`saves/${user.uid}/slots/save`), {
				data: "private",
			});
			batch.set(database().doc(`saves/${user.uid}/slots/autosave`), {
				data: "private",
			});
			// A UID that shares the prefix must not lose its records.
			const other = `${user.uid}_other_${run}`;
			batch.create(database().doc(`statistics/${other}`), { seed: 456 });
			await batch.commit();
			expect((await DELETE(request("DELETE"))).status).toBe(200);
			await expect(authAdmin().getUser(user.uid)).rejects.toMatchObject({
				code: "auth/user-not-found",
			});
			expect((await database().doc(`profiles/${user.uid}`).get()).exists).toBe(
				false,
			);
			expect(
				(await database().collection(`saves/${user.uid}/slots`).get()).empty,
			).toBe(true);
			expect(
				(await database().doc(`rankings/${user.uid}_${run}`).get()).exists,
			).toBe(false);
			expect(
				(
					await database()
						.doc(`statistics/${user.uid}_${ids.at(-1)}`)
						.get()
				).exists,
			).toBe(false);
			expect((await database().doc(`statistics/${other}`).get()).exists).toBe(
				true,
			);
			const db = getFirestore(app);
			const [hostname, port] = (host ?? "").split(":");
			connectFirestoreEmulator(db, hostname, Number(port));
			await expect(
				setDoc(doc(db, `saves/${user.uid}/slots/save`), {
					revision: 1,
					device: "test",
					savedAt: "now",
					summary: "stale",
					data: Bytes.fromUint8Array(new Uint8Array([1])),
				}),
			).rejects.toMatchObject({ code: "permission-denied" });
			expect(
				(await PUT(request("PUT", { displayName: "Resurrected" }))).status,
			).toBe(401);
			const finished = savedAdventure();
			finished.state.runId = crypto.randomUUID();
			finished.state.player.health = 0;
			expect(
				(
					await POST(
						new Request("http://localhost/api/statistics", {
							method: "POST",
							headers: { authorization: `Bearer ${token}` },
							body: JSON.stringify(finished),
						}),
					)
				).status,
			).toBe(401);
			expect((await DELETE(request("DELETE"))).status).toBe(401);
			await deleteAccountData(user.uid);
			await expect(
				writeStatistics(
					`${user.uid}_${finished.state.runId}`,
					summarizeRun(finished, null),
				),
			).rejects.toMatchObject({ code: "account-deleted" });
			await database().doc(`statistics/${other}`).delete();
		} finally {
			await deleteApp(app);
		}
	});
});
