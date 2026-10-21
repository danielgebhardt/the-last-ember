// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { parseSave, serializeSave } from "../domain/saves/SaveFormat";
import {
	LOCAL_SAVE_KEY,
	readLocalSave,
	writeLocalSave,
} from "../persistence/LocalAdventureSave";
import capturedSaveFile from "./fixtures/adventure-v31.json?raw";
import { savedAdventure } from "./SaveTestHelpers";

const memoryStorage = () => {
	const entries = new Map<string, string>();
	return {
		getItem: (key: string) => entries.get(key) ?? null,
		setItem: (key: string, value: string) => {
			entries.set(key, value);
		},
	};
};
describe("One local adventure save slot", () => {
	it("reads a captured current slot without rewriting the original until Save", () => {
		const storage = memoryStorage();
		storage.setItem(LOCAL_SAVE_KEY, capturedSaveFile);
		const set = vi.spyOn(storage, "setItem");
		const loaded = readLocalSave(() => storage);
		expect(loaded).toEqual(parseSave(capturedSaveFile));
		if (!loaded.ok || !loaded.value)
			throw new Error("Captured current slot must load");
		expect(loaded.value.version).toBe(31);
		expect(set).not.toHaveBeenCalled();
		expect(storage.getItem(LOCAL_SAVE_KEY)).toBe(capturedSaveFile);

		writeLocalSave(loaded.value, () => storage);
		expect(storage.getItem(LOCAL_SAVE_KEY)).toBe(serializeSave(loaded.value));
	});

	it("rejects malformed intent without replacing a valid local save", () => {
		const storage = memoryStorage();
		const previous = savedAdventure();
		writeLocalSave(previous, () => storage);
		const set = vi.spyOn(storage, "setItem");
		const invalid = structuredClone(previous);
		Reflect.deleteProperty(invalid.state.monsters[0], "intent");

		expect(writeLocalSave(invalid, () => storage).ok).toBe(false);
		expect(set).not.toHaveBeenCalled();
		expect(readLocalSave(() => storage)).toEqual({ ok: true, value: previous });
	});

	it("distinguishes an empty slot and replaces it with one validated snapshot", () => {
		const storage = memoryStorage();
		expect(readLocalSave(() => storage)).toEqual({ ok: true, value: null });
		const first = savedAdventure();
		expect(writeLocalSave(first, () => storage)).toEqual({
			ok: true,
			value: first,
		});
		const second = { ...first, savedAt: "2026-10-12T00:00:00.000Z" };
		writeLocalSave(second, () => storage);
		expect(readLocalSave(() => storage)).toEqual({ ok: true, value: second });
		expect(storage.getItem(LOCAL_SAVE_KEY)).toBe(serializeSave(second));
	});
	it("retains the existing slot when storage rejects a replacement", () => {
		const storage = memoryStorage();
		const previous = savedAdventure();
		writeLocalSave(previous, () => storage);
		vi.spyOn(storage, "setItem").mockImplementation(() => {
			throw new Error("Quota exceeded");
		});
		expect(
			writeLocalSave(
				{ ...previous, savedAt: "2026-10-12T00:00:00.000Z" },
				() => storage,
			).ok,
		).toBe(false);
		expect(readLocalSave(() => storage)).toEqual({ ok: true, value: previous });
	});
	it("rejects an invalid replacement without writing or erasing the previous slot", () => {
		const storage = memoryStorage();
		const previous = savedAdventure();
		writeLocalSave(previous, () => storage);
		const set = vi.spyOn(storage, "setItem");
		expect(
			writeLocalSave({ ...previous, version: 99 as 31 }, () => storage).ok,
		).toBe(false);
		expect(set).not.toHaveBeenCalled();
		expect(readLocalSave(() => storage)).toEqual({ ok: true, value: previous });
	});
	it("reports corrupt storage without treating it as an empty slot", () => {
		const storage = memoryStorage();
		storage.setItem(LOCAL_SAVE_KEY, "broken json");
		expect(readLocalSave(() => storage).ok).toBe(false);
		expect(storage.getItem(LOCAL_SAVE_KEY)).toBe("broken json");
	});
	it("reports unavailable access, including a throwing localStorage getter", () => {
		const unavailable = () => {
			throw new Error("Blocked");
		};
		expect(readLocalSave(unavailable)).toMatchObject({
			ok: false,
			error: expect.stringContaining("unavailable"),
		});
		expect(writeLocalSave(savedAdventure(), unavailable).ok).toBe(false);
	});
});
