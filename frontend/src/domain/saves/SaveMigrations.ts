import type { SaveResult } from "./SaveFormat";

// Saves from this version onward keep loading after format changes. Older saves were
// retired before cloud saves (#424) and again when arena doorways widened for 2×2
// minibosses (#454); they stay unsupported.
export const OLDEST_SUPPORTED_SAVE_VERSION = 34;

export type SaveJson = Record<string, unknown>;
// Upgrades a parsed document from one version to the next. It receives its own deep
// copy, so it may edit in place; the runner stamps the new version afterwards.
export type SaveMigration = (document: SaveJson) => SaveJson;

// Keyed by the version each step upgrades from: { 34: v34 → v35, 35: v35 → v36, … }.
// Every breaking format change adds its step here, with a frozen fixture and a test.
export const SAVE_MIGRATIONS: Readonly<Record<number, SaveMigration>> = {};

const UNSUPPORTED = "This save uses an unsupported format version.";
const isJsonObject = (data: unknown): data is SaveJson =>
	typeof data === "object" && data !== null && !Array.isArray(data);

// Brings a supported older document up to the current version without touching the
// input. Anything that isn't a versioned object passes through for validation to
// reject; versions outside the supported range are refused here.
export const migrateSave = (
	data: unknown,
	currentVersion: number,
	migrations: Readonly<Record<number, SaveMigration>> = SAVE_MIGRATIONS,
	oldestVersion = OLDEST_SUPPORTED_SAVE_VERSION,
): SaveResult<unknown> => {
	if (!isJsonObject(data) || data.version === currentVersion)
		return { ok: true, value: data };
	const version = data.version;
	if (
		typeof version !== "number" ||
		!Number.isInteger(version) ||
		version < oldestVersion ||
		version > currentVersion
	)
		return { ok: false, error: UNSUPPORTED };
	let document = structuredClone(data);
	for (let from = version; from < currentVersion; from++) {
		const step = migrations[from];
		if (!step) return { ok: false, error: UNSUPPORTED };
		document = { ...step(document), version: from + 1 };
	}
	return { ok: true, value: document };
};
