import { migrateLegacyTownLocation } from "../town/LegacyTownLocation";
import { isConsistentSave } from "./SaveConsistency";
import type { SaveDocument, SaveResult } from "./SaveFormat";
import {
	migratePlayedSave,
	migrateSaveV1,
	migrateSaveV2,
} from "./SaveMigration";
import { hasSupportedSaveVersion, isSaveSourceDocument } from "./SaveSource";

const inconsistent = {
	ok: false,
	error: "This save contains inconsistent adventure data.",
} as const;
export const validateSaveDocument = (
	data: unknown,
): SaveResult<SaveDocument> => {
	if (
		typeof data === "object" &&
		data !== null &&
		!Array.isArray(data) &&
		!hasSupportedSaveVersion(data)
	)
		return {
			ok: false,
			error: "This save uses an unsupported format version.",
		};
	// Town layout identity versions its coordinates independently of the save
	// schema. Only valid legacy town positions are normalized; all remaining
	// source-version and consistency checks still run below.
	if (
		typeof data === "object" &&
		data !== null &&
		"version" in data &&
		typeof data.version === "number" &&
		data.version >= 23 &&
		data.version <= 26 &&
		"state" in data &&
		typeof data.state === "object" &&
		data.state !== null &&
		"town" in data.state
	) {
		const town = migrateLegacyTownLocation(data.state.town);
		if (town) data = { ...data, state: { ...data.state, town } };
	}
	if (!isSaveSourceDocument(data))
		return {
			ok: false,
			error: "This save contains invalid or missing adventure data.",
		};
	// Source-version rules must pass before migration can normalize old fields.
	if (!isConsistentSave(data)) return inconsistent;
	if (data.version === 26) return { ok: true, value: data };
	const grown =
		data.version === 1 || data.version === 2
			? migrateSaveV2(data.version === 1 ? migrateSaveV1(data) : data)
			: data;
	const current = migratePlayedSave(grown);
	return isConsistentSave(current)
		? { ok: true, value: current }
		: inconsistent;
};
