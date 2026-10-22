import { isConsistentSave } from "./SaveConsistency";
import {
	SAVE_FORMAT_VERSION,
	type SaveDocument,
	type SaveResult,
} from "./SaveFormat";
import { migrateSave } from "./SaveMigrations";
import { isSaveDocument } from "./SaveShape";

// Supported older versions are migrated first; the result must then pass every
// current-format check, exactly like a save written by this version.
export const validateSaveDocument = (
	input: unknown,
): SaveResult<SaveDocument> => {
	const migrated = migrateSave(input, SAVE_FORMAT_VERSION);
	if (!migrated.ok) return migrated;
	const data = migrated.value;
	if (
		typeof data === "object" &&
		data !== null &&
		!Array.isArray(data) &&
		(!("version" in data) || data.version !== SAVE_FORMAT_VERSION)
	)
		return {
			ok: false,
			error: "This save uses an unsupported format version.",
		};
	if (!isSaveDocument(data))
		return {
			ok: false,
			error: "This save contains invalid or missing adventure data.",
		};
	if (!isConsistentSave(data))
		return {
			ok: false,
			error: "This save contains inconsistent adventure data.",
		};
	return { ok: true, value: data };
};
