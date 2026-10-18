// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import versionOneFile from "./fixtures/adventure-v1.json?raw";

// Captured before this refactor. Do not regenerate it from today's writer:
// an old file must stay loadable when the live state model grows.
const loadVersionOne = () => {
	const parsed = parseSave(versionOneFile);
	if (!parsed.ok) throw new Error(parsed.error);
	return { document: parsed.value, adventure: restoreSave(parsed.value) };
};

describe("Version-1 save compatibility", () => {
	it("loads a captured old file and writes the same migrated played data", () => {
		const { document, adventure } = loadVersionOne();
		expect(document).toMatchObject({
			version: 27,
			state: { turn: 3, run: { seed: 123, activeFloor: 1 } },
		});
		const written = createSaveDocument(
			adventure.state,
			adventure.exploration,
			adventure.configuration,
			adventure.fog,
			new Date(document.savedAt),
		);
		expect(parseSave(serializeSave(written))).toEqual({
			ok: true,
			value: document,
		});
	});
	it("keeps carried gear from an old save even though new bags are empty", () => {
		const { adventure } = loadVersionOne();
		expect(adventure.state.bag.items).toEqual([
			{ id: "starting:bag:1", kind: "iron-sword" },
			{ id: "starting:bag:2", kind: "wooden-shield" },
		]);
	});
	it("does not implicitly add new top-level game state to the current format", () => {
		const { document, adventure } = loadVersionOne();
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
		const { adventure } = loadVersionOne();
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
		const { document } = loadVersionOne();
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
