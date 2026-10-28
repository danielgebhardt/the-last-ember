import {
	errorCode,
	json,
	type TokenVerifier,
	verifiedUser,
} from "../api/account.ts";
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
		} catch (error) {
			// Deleted accounts cannot retain developer access; any other failure is
			// an outage, not a verdict on the role.
			if (errorCode(error) !== "auth/user-not-found")
				return json(503, {
					error: "Developer access could not be checked. Try again shortly.",
				});
		}
	}
	return json(403, { error: "A developer account is required." });
};
