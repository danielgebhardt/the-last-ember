import { cert, getApps, initializeApp } from "firebase-admin/app";

// Token verification can initialize a credential-free app first. Writes use a named
// app so they always receive the service-account credential, regardless of call order.
export const statisticsAdmin = () => {
	const name = "statistics";
	const existing = getApps().find((app) => app.name === name);
	if (existing) return existing;
	const projectId =
		process.env.FIREBASE_PROJECT_ID ?? process.env.VITE_FIREBASE_PROJECT_ID;
	if (process.env.FIRESTORE_EMULATOR_HOST) {
		if (!projectId?.startsWith("demo-"))
			throw new Error("Statistics tests require a demo project");
		return initializeApp({ projectId }, name);
	}
	const key = process.env.FIREBASE_SERVICE_ACCOUNT;
	if (!key) throw new Error("FIREBASE_SERVICE_ACCOUNT is not set");
	return initializeApp({ credential: cert(JSON.parse(key)), projectId }, name);
};
