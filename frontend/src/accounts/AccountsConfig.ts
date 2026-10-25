// The Firebase web app this build signs in with, from Vite environment settings. Without
// them the build simply has no accounts, and everything else plays as before.
export type FirebaseWebConfig = Readonly<{
	apiKey: string;
	authDomain: string;
	projectId: string;
	appId: string;
}>;
type Environment = Readonly<Record<string, string | boolean | undefined>>;

export const firebaseWebConfig = (
	env: Environment = import.meta.env,
): FirebaseWebConfig | undefined => {
	const value = (key: string) =>
		typeof env[key] === "string" && env[key] ? (env[key] as string) : undefined;
	const apiKey = value("VITE_FIREBASE_API_KEY");
	const authDomain = value("VITE_FIREBASE_AUTH_DOMAIN");
	const projectId = value("VITE_FIREBASE_PROJECT_ID");
	const appId = value("VITE_FIREBASE_APP_ID");
	return apiKey && authDomain && projectId && appId
		? { apiKey, authDomain, projectId, appId }
		: undefined;
};
// Development and tests only: sign in against the local Auth emulator, e.g. 127.0.0.1:9099.
export const authEmulatorHost = (
	env: Environment = import.meta.env,
): string | undefined =>
	typeof env.VITE_FIREBASE_AUTH_EMULATOR_HOST === "string" &&
	env.VITE_FIREBASE_AUTH_EMULATOR_HOST
		? env.VITE_FIREBASE_AUTH_EMULATOR_HOST
		: undefined;
// Development and tests only: keep cloud saves in the local Firestore emulator, e.g.
// 127.0.0.1:8080.
export const firestoreEmulatorHost = (
	env: Environment = import.meta.env,
): string | undefined =>
	typeof env.VITE_FIRESTORE_EMULATOR_HOST === "string" &&
	env.VITE_FIRESTORE_EMULATOR_HOST
		? env.VITE_FIRESTORE_EMULATOR_HOST
		: undefined;
