import type { RunRecord } from "../domain/game/RunRecap";

export const RUN_HISTORY_KEY = "larn:run-history";
export const RUN_HISTORY_LIMIT = 20;
type HistoryStorage = Pick<Storage, "getItem" | "setItem">;
const browserStorage = () => window.localStorage;

// A per-browser convenience: unavailable or corrupt storage reads as empty, and
// malformed entries are dropped rather than failing the whole list.
const isRecord = (value: unknown): value is RunRecord => {
	if (typeof value !== "object" || value === null) return false;
	const record = value as Record<string, unknown>;
	return (
		typeof record.id === "string" &&
		typeof record.finishedAt === "string" &&
		(record.outcome === "won" || record.outcome === "died") &&
		[
			"seed",
			"rows",
			"cols",
			"floors",
			"difficulty",
			"deepestFloor",
			"turns",
			"level",
			"experience",
			"monstersDefeated",
			"gold",
		].every((key) => Number.isFinite(record[key])) &&
		(record.cause === undefined || typeof record.cause === "string") &&
		typeof record.recap === "object" &&
		record.recap !== null &&
		["afflictions", "gear", "discoveries"].every((key) =>
			Array.isArray((record.recap as Record<string, unknown>)[key]),
		)
	);
};

export const readRunHistory = (
	storage: () => HistoryStorage = browserStorage,
): readonly RunRecord[] => {
	try {
		const parsed: unknown = JSON.parse(
			storage().getItem(RUN_HISTORY_KEY) ?? "[]",
		);
		return Array.isArray(parsed)
			? parsed.filter(isRecord).slice(0, RUN_HISTORY_LIMIT)
			: [];
	} catch {
		return [];
	}
};

// Newest first; the same ending is never recorded twice.
export const addRunToHistory = (
	record: RunRecord,
	storage: () => HistoryStorage = browserStorage,
): readonly RunRecord[] => {
	const current = readRunHistory(storage);
	if (current.some((entry) => entry.id === record.id)) return current;
	const next = [record, ...current].slice(0, RUN_HISTORY_LIMIT);
	try {
		storage().setItem(RUN_HISTORY_KEY, JSON.stringify(next));
	} catch {
		return current;
	}
	return next;
};
