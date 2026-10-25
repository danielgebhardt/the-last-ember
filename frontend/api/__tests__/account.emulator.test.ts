// @vitest-environment node
// Runs only inside the Firebase Auth emulator: `pnpm test:emulator`.
import { initializeApp } from "firebase/app";
import {
	connectAuthEmulator,
	createUserWithEmailAndPassword,
	getAuth,
	signInWithEmailAndPassword,
	signOut,
} from "firebase/auth";
import { describe, expect, it } from "vitest";
import { handleAccount } from "../account.ts";

const host = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const projectId = process.env.FIREBASE_PROJECT_ID ?? "demo-wardens-flame";

describe.skipIf(!host)("Account sign-in against the Auth emulator", () => {
	it("signs up, signs out and in again, and the function knows the user by token", async () => {
		const auth = getAuth(
			initializeApp(
				{
					apiKey: "demo-key",
					authDomain: `${projectId}.firebaseapp.com`,
					projectId,
				},
				`emulator-${Date.now()}`,
			),
		);
		connectAuthEmulator(auth, `http://${host}`, { disableWarnings: true });
		const email = `player-${Date.now()}@example.com`;
		const created = await createUserWithEmailAndPassword(
			auth,
			email,
			"ember-flame",
		);
		await signOut(auth);
		expect(auth.currentUser).toBeNull();
		const signedIn = await signInWithEmailAndPassword(
			auth,
			email,
			"ember-flame",
		);
		expect(signedIn.user.uid).toBe(created.user.uid);
		const token = await signedIn.user.getIdToken();
		const response = await handleAccount(
			new Request("http://localhost/api/account", {
				headers: { authorization: `Bearer ${token}` },
			}),
		);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			uid: created.user.uid,
			email,
		});
		const refused = await handleAccount(
			new Request("http://localhost/api/account", {
				headers: { authorization: "Bearer not-a-token" },
			}),
		);
		expect(refused.status).toBe(401);
	});
});
