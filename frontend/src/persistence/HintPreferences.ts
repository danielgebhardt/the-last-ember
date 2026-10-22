import { HINT_IDS, type HintId } from "../domain/hints/Hints";

export const HINTS_KEY = "larn:hints";
export type HintPreferences = Readonly<{
	enabled: boolean;
	seen: readonly HintId[];
}>;
type HintStorage = Pick<Storage, "getItem" | "setItem">;
const browserStorage = () => window.localStorage;
const DEFAULT_PREFERENCES: HintPreferences = { enabled: true, seen: [] };

// A per-browser convenience, never part of a save: unavailable or corrupt storage
// reads as the defaults, so a hint may simply show again.
export const readHintPreferences = (
	storage: () => HintStorage = browserStorage,
): HintPreferences => {
	try {
		const value: unknown = JSON.parse(storage().getItem(HINTS_KEY) ?? "null");
		if (typeof value !== "object" || value === null) return DEFAULT_PREFERENCES;
		const record = value as Record<string, unknown>;
		return {
			enabled: record.enabled !== false,
			seen: Array.isArray(record.seen)
				? HINT_IDS.filter((id) => (record.seen as unknown[]).includes(id))
				: [],
		};
	} catch {
		return DEFAULT_PREFERENCES;
	}
};

export const writeHintPreferences = (
	preferences: HintPreferences,
	storage: () => HintStorage = browserStorage,
): void => {
	try {
		storage().setItem(HINTS_KEY, JSON.stringify(preferences));
	} catch {
		// Hints still work for this visit; they just aren't remembered.
	}
};
