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

const hit = () => ({ d20: () => 20, damage: (min: number) => min });
const encounter = () => ({
	...createGameState(createCorridorEncounter()),
	knownSpells: ["magic-missile"] as const,
	monsters: [
		{
			id: "1:1",
			kind: "troll" as const,
			floorNumber: 1,
			coordinate: { row: 1, col: 5 },
			health: 12,
			intent: { type: "idle" as const },
			lastDamagedTurn: null,
		},
	],
});
it("trolls recover two health per active phase, capped at their maximum", () => {
	const initial = encounter();
	const first = resolvePlayerAction(initial, { type: "wait" }, hit).state;
	expect(first.monsters[0].health).toBe(14);
	expect(
		first.activityHistory.entries.some(
			(entry) => entry.event.type === "monster-regenerated",
		),
	).toBe(true);
	const nearFull = {
		...initial,
		monsters: [{ ...initial.monsters[0], health: 21 }],
	};
	expect(
		resolvePlayerAction(nearFull, { type: "wait" }, hit).state.monsters[0]
			.health,
	).toBe(22);
});
it("damage prevents recovery this phase and the next, giving sustained attacks practical counterplay", () => {
	const initial = encounter();
	const hitState = resolvePlayerAction(
		initial,
		{ type: "cast", spell: "magic-missile", targetId: "1:1" },
		hit,
	).state;
	expect(hitState.monsters[0].health).toBe(9);
	const held = resolvePlayerAction(hitState, { type: "wait" }, hit).state;
	expect(held.monsters[0].health).toBe(9);
	const recovered = resolvePlayerAction(held, { type: "wait" }, hit).state;
	expect(recovered.monsters[0].health).toBe(11);
});
it("inactive and defeated trolls never recover", () => {
	const initial = encounter();
	const inactive = {
		...initial,
		run: {
			...initial.run,
			activeFloor: 2,
			playerCoordinate: { row: 1, col: 1 },
		},
	};
	expect(
		resolvePlayerAction(inactive, { type: "wait" }, hit).state.monsters[0]
			.health,
	).toBe(12);
	const weak = {
		...initial,
		monsters: [{ ...initial.monsters[0], health: 3 }],
	};
	expect(
		resolvePlayerAction(
			weak,
			{ type: "cast", spell: "magic-missile", targetId: "1:1" },
			hit,
		).state.monsters,
	).toEqual([]);
});

it("saved injury timing pauses recovery after loading without replaying damage", () => {
	const original = restoreSave(savedAdventure());
	const initial = {
		...original.state,
		monsters: [
			{
				...original.state.monsters[0],
				kind: "troll" as const,
				health: 12,
				lastDamagedTurn: original.state.turn,
			},
		],
	};
	const parsed = parseSave(
		serializeSave(
			createSaveDocument(
				initial,
				original.exploration,
				original.configuration,
				original.fog,
			),
		),
	);
	if (!parsed.ok) throw new Error(parsed.error);
	const resumed = restoreSave(parsed.value).state;
	expect(resumed.monsters[0].lastDamagedTurn).toBe(initial.turn);
	expect(
		resolvePlayerAction(resumed, { type: "wait" }, hit).state.monsters[0]
			.health,
	).toBe(12);
});

it("rejects future injury timestamps", () => {
	const saved = savedAdventure();
	const invalid = {
		...saved,
		state: {
			...saved.state,
			monsters: saved.state.monsters.map((actor) => ({
				...actor,
				lastDamagedTurn: saved.state.turn + 1,
			})),
		},
	};
	expect(parseSave(JSON.stringify(invalid)).ok).toBe(false);
});
