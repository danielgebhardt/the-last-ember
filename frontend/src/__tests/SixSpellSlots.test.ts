// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
	assignSpell,
	createSpellHotbar,
	type SpellSlot,
} from "../domain/game/SpellHotbar";
import { parseSave } from "../domain/saves/SaveFormat";
import { savedAdventure } from "./SaveTestHelpers";

describe("Six spell shortcuts", () => {
	it("provides six slots and moves, replaces and clears the sixth assignment", () => {
		const known = ["magic-missile", "heal", "ember-bolt"] as const;
		const initial = createSpellHotbar(known);
		expect(initial).toEqual([
			"magic-missile",
			"heal",
			"ember-bolt",
			null,
			null,
			null,
		]);
		const moved = assignSpell(initial, known, {
			type: "assign-spell",
			slot: 6 as SpellSlot,
			spell: "heal",
		});
		expect(moved).toEqual([
			"magic-missile",
			null,
			"ember-bolt",
			null,
			null,
			"heal",
		]);
		if (!Array.isArray(moved)) throw new Error("Sixth assignment failed");
		const replaced = assignSpell(moved, known, {
			type: "assign-spell",
			slot: 6 as SpellSlot,
			spell: "ember-bolt",
		});
		expect(replaced).toEqual([
			"magic-missile",
			null,
			null,
			null,
			null,
			"ember-bolt",
		]);
		if (!Array.isArray(replaced)) throw new Error("Sixth replacement failed");
		expect(
			assignSpell(replaced, known, {
				type: "assign-spell",
				slot: 6 as SpellSlot,
				spell: null,
			}),
		).toEqual(["magic-missile", null, null, null, null, null]);
	});
	it.each([
		["four slots", ["magic-missile", "heal", null, null]],
		["duplicate in sixth", ["heal", null, null, null, null, "heal"]],
		[
			"unlearned in fifth",
			["magic-missile", "heal", null, null, "ember-bolt", null],
		],
	])("rejects malformed current saves: %s", (_, slots) => {
		const document = savedAdventure();
		expect(
			parseSave(
				JSON.stringify({
					...document,
					state: { ...document.state, spellHotbar: slots },
				}),
			).ok,
		).toBe(false);
	});
});
