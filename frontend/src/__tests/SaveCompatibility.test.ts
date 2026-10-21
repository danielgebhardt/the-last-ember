// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import capturedFile from "./fixtures/adventure-v32.json?raw";

// Captured current-format baseline. Keep this file independent of writer changes.
const loadCaptured = () => {
	const parsed = parseSave(capturedFile);
	if (!parsed.ok) throw new Error(parsed.error);
	return { document: parsed.value, adventure: restoreSave(parsed.value) };
};

describe("Current save baseline", () => {
	it("does not implicitly add new top-level game state to the current format", () => {
		const { document, adventure } = loadCaptured();
		const extendedState = { ...adventure.state, uiSelectedItem: "bag:sword" };
		const written = createSaveDocument(
			extendedState,
			adventure.exploration,
			adventure.configuration,
			adventure.fog,
			new Date(document.savedAt),
		);
		expect(written.state).not.toHaveProperty("uiSelectedItem");
	});
	it("does not implicitly add new monster state to the current format", () => {
		const { adventure } = loadCaptured();
		const extendedState = {
			...adventure.state,
			monsters: adventure.state.monsters.map((monster) => ({
				...monster,
				debugLabel: "selected",
			})),
		};
		const written = createSaveDocument(
			extendedState,
			adventure.exploration,
			adventure.configuration,
			adventure.fog,
		);
		expect(written.state.monsters.length).toBeGreaterThan(0);
		expect(written.state.monsters[0]).not.toHaveProperty("debugLabel");
	});
	it("distinguishes unsupported versions, missing fields and inconsistent resources", () => {
		const { document } = loadCaptured();
		expect(parseSave(JSON.stringify({ ...document, version: 999 }))).toEqual({
			ok: false,
			error: "This save uses an unsupported format version.",
		});
		const missingMana = structuredClone(document);
		Reflect.deleteProperty(missingMana.state, "mana");
		expect(parseSave(serializeSave(missingMana))).toEqual({
			ok: false,
			error: "This save contains invalid or missing adventure data.",
		});
		const excessMana = { ...document, state: { ...document.state, mana: 999 } };
		expect(parseSave(serializeSave(excessMana))).toEqual({
			ok: false,
			error: "This save contains inconsistent adventure data.",
		});
	});
});
