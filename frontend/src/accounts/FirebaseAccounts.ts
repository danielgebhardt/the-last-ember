// Loaded only on demand (see AccountProvider), so signed-out players never download
// Firebase.
import { initializeApp } from "firebase/app";
import {
	connectAuthEmulator,
	createUserWithEmailAndPassword,
	GoogleAuthProvider,
	getAuth,
	onIdTokenChanged,
	signInWithEmailAndPassword,
	signInWithPopup,
	signOut,
} from "firebase/auth";
import type { CloudStore } from "../saves/CloudStore";
import type { FirebaseWebConfig } from "./AccountsConfig";

export type AccountUser = Readonly<{
	uid: string;
	email: string | null;
	name: string | null;
	// The sign-in provider's profile picture (Google's), if any.
	photo: string | null;
	developer?: true;
}>;
export type AccountsApi = Readonly<{
	// Calls back with the current user at once and on every change; returns an unsubscribe.
	watch: (listener: (user: AccountUser | null) => void) => () => void;
	signInWithGoogle: () => Promise<void>;
	signInWithEmail: (email: string, password: string) => Promise<void>;
	createAccount: (email: string, password: string) => Promise<void>;
	signOut: () => Promise<void>;
	// A fresh ID token for the trusted Vercel functions, or null when signed out.
	idToken: () => Promise<string | null>;
	// The signed-in player's cloud save slots; Firestore loads on first use.
	cloudStore: () => Promise<CloudStore | null>;
}>;

export const createFirebaseAccounts = (
	config: FirebaseWebConfig,
	emulatorHost?: string,
	firestoreHost?: string,
): AccountsApi => {
	const app = initializeApp(config);
	const auth = getAuth(app);
	if (emulatorHost)
		connectAuthEmulator(auth, `http://${emulatorHost}`, {
			disableWarnings: true,
		});
	return {
		watch: (listener) => {
			let visit = 0;
			const stop = onIdTokenChanged(auth, async (user) => {
				const current = ++visit;
				if (!user) {
					listener(null);
					return;
				}
				try {
					const token = await user.getIdTokenResult();
					if (current === visit)
						listener({
							uid: user.uid,
							email: user.email,
							name: user.displayName,
							photo: user.photoURL,
							...(token.claims.developer === true
								? { developer: true as const }
								: {}),
						});
				} catch {
					if (current === visit)
						listener({
							uid: user.uid,
							email: user.email,
							name: user.displayName,
							photo: user.photoURL,
						});
				}
			});
			return () => {
				visit++;
				stop();
			};
		},
		signInWithGoogle: async () => {
			await signInWithPopup(auth, new GoogleAuthProvider());
		},
		signInWithEmail: async (email, password) => {
			await signInWithEmailAndPassword(auth, email, password);
		},
		createAccount: async (email, password) => {
			await createUserWithEmailAndPassword(auth, email, password);
		},
		signOut: () => signOut(auth),
		idToken: async () => (await auth.currentUser?.getIdToken()) ?? null,
		cloudStore: async () => {
			const uid = auth.currentUser?.uid;
			if (!uid) return null;
			const { createCloudStore } = await import("./CloudSaves");
			return createCloudStore(app, uid, firestoreHost);
		},
	};
};
