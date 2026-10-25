// GET /api/account: who a Firebase ID token belongs to. The trusted path that later
// functions (statistics, the leaderboard) build on: a browser proves who it is with the
// token in an `Authorization: Bearer` header, and nothing else is believed.
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export type VerifiedUser = Readonly<{ uid: string; email: string | null }>;
export type TokenVerifier = (token: string) => Promise<VerifiedUser>;

const json = (status: number, body: unknown) =>
	new Response(JSON.stringify(body), {
		status,
		headers: {
			"content-type": "application/json",
			"cache-control": "no-store",
		},
	});

// Verifying a token needs only the project ID; Google's public keys do the rest. With
// FIREBASE_AUTH_EMULATOR_HOST set, the Admin SDK accepts the emulator's tokens instead.
const firebaseVerifier: TokenVerifier = async (token) => {
	const projectId =
		process.env.FIREBASE_PROJECT_ID ?? process.env.VITE_FIREBASE_PROJECT_ID;
	if (!projectId) throw new Error("FIREBASE_PROJECT_ID is not set");
	const app = getApps()[0] ?? initializeApp({ projectId });
	const decoded = await getAuth(app).verifyIdToken(token);
	return { uid: decoded.uid, email: decoded.email ?? null };
};

// The signed-in user behind a request, or the response that refuses it.
export const verifiedUser = async (
	request: Request,
	verify: TokenVerifier = firebaseVerifier,
): Promise<VerifiedUser | Response> => {
	const header = request.headers.get("authorization") ?? "";
	const token = /^Bearer\s+(\S+)$/i.exec(header)?.[1];
	if (!token) return json(401, { error: "Sign in to continue." });
	try {
		return await verify(token);
	} catch {
		return json(401, { error: "Your sign-in has expired. Sign in again." });
	}
};

export const handleAccount = async (
	request: Request,
	verify: TokenVerifier = firebaseVerifier,
): Promise<Response> => {
	const user = await verifiedUser(request, verify);
	return user instanceof Response ? user : json(200, user);
};

export function GET(request: Request): Promise<Response> {
	return handleAccount(request);
}
