import { type TokenVerifier, verifiedUser } from "../api/account.ts";
import { authAdmin } from "./AccountData.ts";

export const verifiedDeveloper = async (
	request: Request,
	verify?: TokenVerifier,
	currentRole = async (uid: string) => {
		const user = await authAdmin().getUser(uid);
		return !user.disabled && user.customClaims?.developer === true;
	},
) => {
	const user = await verifiedUser(request, verify);
	if (user instanceof Response) return user;
	if (user.developer === true) {
		try {
			if (await currentRole(user.uid)) return user;
		} catch {
			/* Deleted/revoked accounts cannot retain developer access. */
		}
	}
	return Response.json(
		{ error: "A developer account is required." },
		{ status: 403, headers: { "cache-control": "no-store" } },
	);
};
