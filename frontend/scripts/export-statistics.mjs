// Key stays outside the repository. This script never accepts a key on the command
// line, prints credentials, or writes finished saves or player identity to the CSV.
import { readFile } from "node:fs/promises";
import { cert, deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { statisticsCsv } from "./statistics-csv.mjs";

if (process.argv.slice(2).some((arg) => arg !== "--all"))
	throw new Error("Usage: stats:export [--all]");
const path = process.env.FIREBASE_SERVICE_ACCOUNT_FILE;
if (!path)
	throw new Error(
		"Set FIREBASE_SERVICE_ACCOUNT_FILE to a service-account JSON path outside the repository.",
	);
const key = JSON.parse(await readFile(path, "utf8"));
const app = initializeApp({ credential: cert(key) });
try {
	const collection = getFirestore(app).collection("statistics");
	const all = process.argv.includes("--all");
	const snapshot = await (all
		? collection
		: collection.where("standard", "==", true)
	).get();
	process.stdout.write(
		statisticsCsv(
			snapshot.docs.map((document) => document.data()),
			all,
		),
	);
} finally {
	await deleteApp(app);
}
