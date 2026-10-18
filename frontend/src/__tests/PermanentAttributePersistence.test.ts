// @vitest-environment node
import { expect, it } from "vitest";
import { deriveAttributes } from "../domain/game/Attributes";
import { createGameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { gainExperience } from "../domain/game/Progression";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
} from "../domain/saves/SaveFormat";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import { savedAdventure } from "./SaveTestHelpers";

it("saves a consumed permanent point and continues deterministically without spending the bottle twice", () => {
	const initial = restoreSave(savedAdventure());
	const state = {
		...initial.state,
		monsters: [],
		objects: [],
		bag: { items: [{ id: "point", kind: "strength-potion" as const }] },
	};
	const drank = resolvePlayerAction(state, {
		type: "consume",
		itemId: "point",
	}).state;
	const snapshot = createSaveDocument(
		drank,
		initial.exploration,
		initial.configuration,
		initial.fog,
	);
	const parsed = parseSave(JSON.stringify(snapshot));
	if (!parsed.ok) throw new Error(parsed.error);
	const restored = restoreSave(parsed.value).state;
	expect(restored.progression.permanentAttributes?.strength).toBe(1);
	expect(resolvePlayerAction(restored, { type: "wait" }).state).toEqual(
		resolvePlayerAction(drank, { type: "wait" }).state,
	);
	const repeated = resolvePlayerAction(restored, {
		type: "consume",
		itemId: "point",
	});
	expect(repeated.error).toBeTruthy();
	expect(repeated.state).toBe(restored);
});
it("keeps gains through level growth, gear removal, temporary expiry and floor travel; fresh adventures start at zero", () => {
	const fresh = createGameState(createCorridorEncounter());
	const state = {
		...fresh,
		monsters: [],
		objects: [],
		floorItems: [],
		bag: { items: [{ id: "point", kind: "intelligence-potion" as const }] },
		effects: [
			{
				actorId: "player",
				floorNumber: null,
				kind: "enlightened" as const,
				remaining: 2,
			},
		],
	};
	const drank = resolvePlayerAction(state, {
		type: "consume",
		itemId: "point",
	}).state;
	expect(
		deriveAttributes(drank.progression, drank.effects, drank.equipment)
			.intelligence,
	).toBe(13);
	const expired = resolvePlayerAction(drank, { type: "wait" }).state;
	expect(
		deriveAttributes(expired.progression, expired.effects, expired.equipment)
			.intelligence,
	).toBe(11);
	expect(deriveAttributes(expired.progression, [], {}).intelligence).toBe(11);
	const leveled = gainExperience(expired.progression, expired.player, 30);
	expect(leveled.progression.permanentAttributes?.intelligence).toBe(1);
	expect(deriveAttributes(leveled.progression).intelligence).toBe(13);
	let moved = expired;
	for (let step = 0; step < 11; step++)
		moved = resolvePlayerAction(moved, {
			type: "move",
			direction: "right",
		}).state;
	expect(moved.run.activeFloor).toBe(2);
	expect(moved.progression.permanentAttributes?.intelligence).toBe(1);
	expect(createGameState(fresh.run).progression.permanentAttributes).toEqual({
		strength: 0,
		dexterity: 0,
		intelligence: 0,
	});
});
it("rejects malformed or smuggled permanent contributions", () => {
	const document = savedAdventure();
	for (const gains of [
		null,
		{},
		{ strength: -1, dexterity: 0, intelligence: 0 },
		{ strength: 1.5, dexterity: 0, intelligence: 0 },
		{ strength: Number.MAX_SAFE_INTEGER, dexterity: 0, intelligence: 0 },
		{ strength: 1, dexterity: 0, intelligence: 0, charisma: 1 },
	]) {
		expect(
			parseSave(
				JSON.stringify({
					...document,
					state: {
						...document.state,
						progression: {
							...document.state.progression,
							permanentAttributes: gains,
						},
					},
				}),
			).ok,
		).toBe(false);
	}
	expect(parseSave(JSON.stringify({ ...document, version: 25 })).ok).toBe(
		false,
	);
});
