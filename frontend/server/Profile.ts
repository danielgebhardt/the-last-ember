import {
	errorCode,
	json,
	type TokenVerifier,
	verifiedUser,
} from "../api/account.ts";
import {
	displayNameError,
	normalizeDisplayName,
} from "../src/accounts/DisplayName.ts";
import { activeAccount, database, deleteAccountData } from "./AccountData.ts";

export type ProfileActions = {
	read: (uid: string) => Promise<string | null>;
	name: (uid: string, name: string) => Promise<void>;
	remove: (uid: string) => Promise<void>;
};
export const profileActions: ProfileActions = {
	read: (uid) =>
		database().runTransaction(async (tx) => {
			const profile = await activeAccount(tx, uid);
			if (!profile.exists)
				tx.create(profile.ref, { displayName: null, active: true });
			return profile.data()?.displayName ?? null;
		}),
	name: (uid, displayName) =>
		database().runTransaction(async (tx) => {
			const profile = await activeAccount(tx, uid);
			tx.set(profile.ref, { displayName, active: true });
		}),
	remove: deleteAccountData,
};
export const handleProfile = async (
	request: Request,
	verify?: TokenVerifier,
	actions = profileActions,
): Promise<Response> => {
	if (!["GET", "PUT", "DELETE"].includes(request.method))
		return json(405, { error: "Use GET, PUT or DELETE." });
	const user = await verifiedUser(request, verify);
	if (user instanceof Response) return user;
	try {
		if (request.method === "DELETE") {
			await actions.remove(user.uid);
			return json(200, { ok: true });
		}
		if (request.method === "PUT") {
			let body: unknown;
			const text = await request.text();
			if (text.length > 2000)
				return json(400, { error: "The display name is too long." });
			try {
				body = JSON.parse(text);
			} catch {
				return json(400, { error: "Enter a display name." });
			}
			const name =
				typeof body === "object" &&
				body !== null &&
				"displayName" in body &&
				typeof body.displayName === "string"
					? normalizeDisplayName(body.displayName)
					: "";
			const error = displayNameError(name);
			if (error) return json(400, { error });
			await actions.name(user.uid, name);
			return json(200, { displayName: name });
		}
		return json(200, { displayName: await actions.read(user.uid) });
	} catch (error) {
		if (errorCode(error) === "account-deleted")
			return json(410, {
				error: "This account is being deleted. Retry deletion or sign out.",
			});
		return json(503, {
			error:
				"Your account could not be updated. Check your connection and try again.",
		});
	}
};
export const GET = (request: Request) => handleProfile(request);
export const PUT = GET;
export const DELETE = GET;
