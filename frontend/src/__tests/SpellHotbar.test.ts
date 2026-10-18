// @vitest-environment node

import { expect, it } from "vitest";
import { createGameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import { savedAdventure } from "./SaveTestHelpers";

it("assigns known spells without turns and moves an existing assignment instead of duplicating it", () => {
	const state = {
		...createGameState(createCorridorEncounter()),
		knownSpells: ["magic-missile", "heal", "ember-bolt"] as const,
	};
	const assigned = resolvePlayerAction(state, {
		type: "assign-spell",
		slot: 1,
		spell: "ember-bolt",
	});
	expect(assigned.turnAdvanced).toBe(false);
	expect(assigned.state.turn).toBe(state.turn);
	expect(assigned.state.spellHotbar).toEqual([
		"ember-bolt",
		"heal",
		null,
		null,
		null,
		null,
	]);
	const moved = resolvePlayerAction(assigned.state, {
		type: "assign-spell",
		slot: 4,
		spell: "ember-bolt",
	});
	expect(moved.state.spellHotbar).toEqual([
		null,
		"heal",
		null,
		"ember-bolt",
		null,
		null,
	]);
	expect(
		resolvePlayerAction(moved.state, {
			type: "assign-spell",
			slot: 4,
			spell: null,
		}).state.spellHotbar,
	).toEqual([null, "heal", null, null, null, null]);
	expect(state.spellHotbar).toEqual([
		"magic-missile",
		"heal",
		null,
		null,
		null,
		null,
	]);
});
it("rejects an unlearned spell without changing state or spending a turn", () => {
	const state = createGameState(createCorridorEncounter());
	const result = resolvePlayerAction(state, {
		type: "assign-spell",
		slot: 3,
		spell: "ember-bolt",
	});
	expect(result.state).toBe(state);
	expect(result.turnAdvanced).toBe(false);
	expect(result.error).toMatch(/learned/i);
});
it("round trips custom assignments", () => {
	const saved = savedAdventure();
	const restored = restoreSave(saved);
	const assigned = resolvePlayerAction(restored.state, {
		type: "assign-spell",
		slot: 4,
		spell: "heal",
	}).state;
	const parsed = parseSave(
		serializeSave(
			createSaveDocument(
				assigned,
				restored.exploration,
				restored.configuration,
				restored.fog,
			),
		),
	);
	expect(parsed.ok).toBe(true);
	if (!parsed.ok) throw new Error(parsed.error);
	expect(restoreSave(parsed.value).state.spellHotbar).toEqual([
		"magic-missile",
		null,
		null,
		"heal",
		null,
		null,
	]);
});

it.each([
	["wrong length", ["heal"]],
	["duplicate assignment", ["heal", "heal", null, null, null, null]],
	["unknown spell", ["unknown", null, null, null, null, null]],
	["unlearned spell", ["ember-bolt", null, null, null, null, null]],
])("rejects saved shortcuts with %s", (_, slots) => {
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
