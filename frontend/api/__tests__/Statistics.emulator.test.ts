// @vitest-environment node
import { deleteApp, initializeApp } from "firebase/app";
import {
	connectAuthEmulator,
	createUserWithEmailAndPassword,
	getAuth,
} from "firebase/auth";
import {
	collection,
	connectFirestoreEmulator,
	deleteDoc,
	doc,
	getDoc,
	getDocs,
	getFirestore,
	setDoc,
	updateDoc,
} from "firebase/firestore/lite";
import { getFirestore as adminFirestore } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";
import { statisticsAdmin } from "../../server/Admin.ts";
import { savedAdventure } from "../../src/__tests/SaveTestHelpers.ts";

const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
const projectId = process.env.FIREBASE_PROJECT_ID ?? "demo-wardens-flame";

describe.skipIf(!authHost || !firestoreHost)(
	"Statistics rules and trusted admin write in the emulators",
	() => {
		it("creates one summary through the function and refuses every browser read/write", async () => {
			// Load the deployed JavaScript bundle in Node, rather than letting Vitest
			// resolve the source graph on the function's behalf.
			const bundle = new URL("../../server/statistics.mjs", import.meta.url)
				.href;
			const { POST } = (await import(/* @vite-ignore */ bundle)) as {
				POST: (request: Request) => Promise<Response>;
			};
			if (!projectId.startsWith("demo-")) throw new Error("Use a demo project");
			const apps = [
				initializeApp(
					{ apiKey: "demo-key", projectId },
					`statistics-owner-${Date.now()}`,
				),
				initializeApp(
					{ apiKey: "demo-key", projectId },
					`statistics-other-${Date.now()}`,
				),
				initializeApp(
					{ apiKey: "demo-key", projectId },
					`statistics-guest-${Date.now()}`,
				),
			];
			try {
				const users = [];
				for (const [i, app] of apps.entries()) {
					const auth = getAuth(app);
					connectAuthEmulator(auth, `http://${authHost}`, {
						disableWarnings: true,
					});
					if (i < 2)
						users.push(
							(
								await createUserWithEmailAndPassword(
									auth,
									`stats-${i}-${Date.now()}@example.com`,
									"ember-flame",
								)
							).user,
						);
				}
				const document = savedAdventure();
				document.state.runId = crypto.randomUUID();
				document.state.player.health = 0;
				document.state.usage = {
					casts: { protection: 1 },
					consumables: { "healing-potion": 2, "enchantment-scroll": 1 },
					equippedTurns: { "short-sword": 3 },
				};
				const id = `${users[0].uid}_${document.state.runId}`;
				const token = await users[0].getIdToken();
				const request = () =>
					new Request("http://localhost/api/statistics", {
						method: "POST",
						headers: { authorization: `Bearer ${token}` },
						body: JSON.stringify(document),
					});
				expect(
					(
						await POST(
							new Request("http://localhost/api/statistics", {
								method: "POST",
								headers: { authorization: "Bearer bad-token" },
								body: JSON.stringify(document),
							}),
						)
					).status,
				).toBe(401);
				// Both token verification and Admin create are real, with emulator credentials.
				const responses = await Promise.all([POST(request()), POST(request())]);
				expect(responses.map((response) => response.status)).toEqual([
					200, 200,
				]);
				const admin = adminFirestore(statisticsAdmin()).collection(
					"statistics",
				);
				expect((await admin.doc(id).get()).data()).toMatchObject({
					seed: 123,
					outcome: "died",
					turns: 3,
					usage: document.state.usage,
				});
				const before = (await admin.doc(id).get()).data();
				document.state.gold += 10;
				document.state.usage.consumables["healing-potion"] = 3;
				expect((await POST(request())).status).toBe(200);
				expect((await admin.doc(id).get()).data()).toEqual(before);
				for (const app of apps) {
					const db = getFirestore(app);
					const [host, port] = (firestoreHost ?? "").split(":");
					connectFirestoreEmulator(db, host, Number(port));
					const reference = doc(db, "statistics", id);
					for (const operation of [
						() => getDoc(reference),
						() => getDocs(collection(db, "statistics")),
						() =>
							setDoc(doc(db, "statistics", `${id}-forged`), { outcome: "won" }),
						() => setDoc(reference, { outcome: "won" }),
						() => updateDoc(reference, { gold: 999 }),
						() => deleteDoc(reference),
					]) {
						await expect(operation()).rejects.toMatchObject({
							code: "permission-denied",
						});
					}
				}
				await admin.doc(id).delete();
			} finally {
				await Promise.all(apps.map((app) => deleteApp(app)));
			}
		});
	},
);
