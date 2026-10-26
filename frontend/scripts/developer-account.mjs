import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const args = process.argv.slice(2);
const remove = args.includes("--remove");
const identifier = args.filter((arg) => arg !== "--remove");
if (identifier.length !== 2 || !["--uid", "--email"].includes(identifier[0]))
	throw Error("Use --uid UID or --email EMAIL, optionally --remove.");
const file = process.env.FIREBASE_SERVICE_ACCOUNT_FILE;
if (!file)
	throw Error(
		"Set FIREBASE_SERVICE_ACCOUNT_FILE to a service-account JSON path outside the repository.",
	);
const app = initializeApp({
	credential: cert(JSON.parse(readFileSync(file, "utf8"))),
});
const auth = getAuth(app);
const user = await (identifier[0] === "--uid"
	? auth.getUser(identifier[1])
	: auth.getUserByEmail(identifier[1]));
const claims = { ...user.customClaims };
if (remove) delete claims.developer;
else claims.developer = true;
await auth.setCustomUserClaims(user.uid, claims);
console.log(
	`${remove ? "Removed" : "Granted"} developer access for ${user.uid}. Sign out and back in to refresh the ID token.`,
);
process.exit(0);
