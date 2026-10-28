/// <reference types="node" />

// GET /api/account: who a Firebase ID token belongs to.
// The browser proves its identity using an Authorization: Bearer header.
// Statistics, rankings, and account endpoints share this verification logic.
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export type VerifiedUser = Readonly<{
	uid: string;
	email: string | null;
	developer?: true;
}>;
export type TokenVerifier = (token: string) => Promise<VerifiedUser>;

// Every endpoint's responses are private to the caller and never cached.
export const json = (status: number, body: unknown) =>
	new Response(JSON.stringify(body), {
		status,
		headers: {
			"content-type": "application/json",
			"cache-control": "no-store",
		},
	});

// The code a Firebase, Firestore or endpoint error carries, if any.
export const errorCode = (error: unknown) =>
	typeof error === "object" && error !== null && "code" in error
		? error.code
		: undefined;

// Verifying a token needs the Firebase project ID.
// With FIREBASE_AUTH_EMULATOR_HOST set, the Admin SDK accepts
// authentication tokens issued by the local emulator.
const firebaseVerifier: TokenVerifier = async (token) => {
	const projectId =
		process.env.FIREBASE_PROJECT_ID ?? process.env.VITE_FIREBASE_PROJECT_ID;

	if (!projectId) {
		throw new Error("FIREBASE_PROJECT_ID is not set");
	}

	const app = getApps()[0] ?? initializeApp({ projectId });
	const decoded = await getAuth(app).verifyIdToken(token);
	return {
		uid: decoded.uid,
		email: decoded.email ?? null,
		...(decoded.developer === true ? { developer: true as const } : {}),
	};
};

// The signed-in user behind a request, or the response
// explaining why authentication could not be completed.
export const verifiedUser = async (
	request: Request,
	verify: TokenVerifier = firebaseVerifier,
): Promise<VerifiedUser | Response> => {
	const header = request.headers.get("authorization") ?? "";
	const token = /^Bearer\s+(\S+)$/i.exec(header)?.[1];

	if (!token) {
		return json(401, {
			error: "Sign in to continue.",
		});
	}

	try {
		return await verify(token);
	} catch (error) {
		const failure =
			error instanceof Error
				? error
				: new Error("Unknown Firebase verification error");

		const code =
			"code" in failure && typeof failure.code === "string"
				? failure.code
				: undefined;

		// Firebase Auth token errors are authentication failures.
		// Other failures may indicate a server configuration,
		// credentials, or infrastructure problem.
		const authenticationError =
			code === "auth/id-token-expired" ||
			code === "auth/invalid-id-token" ||
			code === "auth/argument-error" ||
			code === "auth/id-token-revoked" ||
			code === "auth/user-not-found" ||
			code === "auth/user-disabled";

		console.error("[Firebase Admin] Token verification failed:", {
			code: code ?? "unknown",
			message: failure.message,
		});

		if (authenticationError) {
			return json(401, {
				error: "Your sign-in has expired or is invalid. Sign in again.",
			});
		}

		return json(503, {
			error: "Authentication service is temporarily unavailable. Try again.",
		});
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
