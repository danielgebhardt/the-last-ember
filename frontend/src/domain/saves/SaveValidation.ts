import { isConsistentSave } from "./SaveConsistency";
import {
	SAVE_FORMAT_VERSION,
	type SaveDocument,
	type SaveResult,
} from "./SaveFormat";
import { isSaveDocument } from "./SaveShape";

export const validateSaveDocument = (
	data: unknown,
): SaveResult<SaveDocument> => {
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
