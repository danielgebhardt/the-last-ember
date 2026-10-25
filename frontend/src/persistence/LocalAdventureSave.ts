import {
	parseSave,
	type SaveDocument,
	type SaveResult,
	serializeSave,
} from "../domain/saves/SaveFormat";

export const LOCAL_SAVE_KEY = "larn:adventure-save";
type SaveStorage = Pick<Storage, "getItem" | "setItem">;
type StorageProvider = () => SaveStorage;
const browserStorage: StorageProvider = () => window.localStorage;

export const readLocalSave = (
	storage: StorageProvider = browserStorage,
	key = LOCAL_SAVE_KEY,
): SaveResult<SaveDocument | null> => {
	try {
		const text = storage().getItem(key);
		return text === null ? { ok: true, value: null } : parseSave(text);
	} catch {
		return {
			ok: false,
			error:
				"Browser storage is unavailable, so adventures can't be saved or loaded here.",
		};
	}
};

export const writeLocalSave = (
	document: SaveDocument,
	storage: StorageProvider = browserStorage,
	key = LOCAL_SAVE_KEY,
): SaveResult<SaveDocument> => {
	try {
		const text = serializeSave(document);
		const checked = parseSave(text);
		if (!checked.ok) return checked;
		// One atomic setItem: never remove the previous slot before writing its replacement.
		storage().setItem(key, text);
		return checked;
	} catch {
		return {
			ok: false,
			error:
				"Could not save in this browser. Storage may be full or unavailable. Your previous save was not replaced.",
		};
	}
};

// A separate slot the game writes on its own; it never touches the manual save.
export const AUTOSAVE_KEY = "larn:adventure-autosave";
export const readAutosave = (storage: StorageProvider = browserStorage) =>
	readLocalSave(storage, AUTOSAVE_KEY);
export const writeAutosave = (
	document: SaveDocument,
	storage: StorageProvider = browserStorage,
) => writeLocalSave(document, storage, AUTOSAVE_KEY);
// A finished run's autosave is removed, so it can't undo a death.
export const clearAutosave = (
	storage: () => Pick<Storage, "removeItem"> = () => window.localStorage,
): void => {
	try {
		storage().removeItem(AUTOSAVE_KEY);
	} catch {
		// Unavailable storage has nothing to clear.
	}
};
