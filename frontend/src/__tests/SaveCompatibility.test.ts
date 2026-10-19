// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import version27File from "./fixtures/adventure-v27.json?raw";

// Captured v27 baseline. Keep this file independent of future writer changes.
const loadVersion27 = () => {
	const parsed = parseSave(version27File);
	if (!parsed.ok) throw new Error(parsed.error);
	return { document: parsed.value, adventure: restoreSave(parsed.value) };
};

describe("Version-27 save baseline", () => {
	it("does not implicitly add new top-level game state to the current format", () => {
		const { document, adventure } = loadVersion27();
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
		const { adventure } = loadVersion27();
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
		const { document } = loadVersion27();
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

it("retains existing v27 enchanted equipment without offering retired stock for purchase", () => {
	const { document } = loadVersion27();
	const id = "town-gear:armor:leather-armor:1:1";
	const item = { id, kind: "leather-armor", enchantment: 1 };
	const previous = {
		...document,
		state: {
			...document.state,
			townEquipmentStock: document.state.townEquipmentStock.filter(
				(i) => i.id !== id,
			),
			bag: { items: [...document.state.bag.items, item] },
		},
	};
	expect(parseSave(JSON.stringify(previous)).ok).toBe(true);
});
