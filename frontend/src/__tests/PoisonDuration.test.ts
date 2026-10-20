// @vitest-environment node
import { expect, it } from "vitest";
import {
	advanceTimedEffects,
	applyTimedEffect,
} from "../domain/game/TimedEffects";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
} from "../domain/saves/SaveFormat";
import { quietCorridor } from "./CorridorTravelTestHelpers";
import { savedAdventure } from "./SaveTestHelpers";

it("monster poison lasts six active phases, pauses off-floor and refreshes without stacking", () => {
	const base = quietCorridor();
	const monster = {
		id: "1:1",
		floorNumber: 1,
		kind: "orc" as const,
		coordinate: { row: 2, col: 18 },
		health: 40,
		intent: { type: "idle" as const },
	};
	let state = applyTimedEffect(
		{ ...base, monsters: [monster] },
		monster,
		"poisoned",
	);
	expect(state.effects[0].remaining).toBe(6);
	const paused = advanceTimedEffects({
		...state,
		run: { ...state.run, activeFloor: 2 },
	});
	expect(paused.effects).toEqual(state.effects);
	expect(paused.monsters).toEqual(state.monsters);
	state = advanceTimedEffects(state);
	state = applyTimedEffect(state, state.monsters[0], "poisoned");
	expect(state.effects).toHaveLength(1);
	expect(state.effects[0].remaining).toBe(6);
	for (let phase = 0; phase < 6; phase++) state = advanceTimedEffects(state);
	expect(state.effects).toEqual([]);
	expect(state.monsters[0].health).toBe(12);
});
it("saves six remaining poison phases while retaining shorter already-active timers", () => {
	const initial = restoreSave(savedAdventure());
	for (const remaining of [2, 3, 6]) {
		const state = {
			...initial.state,
			monsters: [],
			afflictions: [{ kind: "poisoned" as const, remaining, source: "test" }],
		};
		const document = createSaveDocument(
			state,
			initial.exploration,
			initial.configuration,
			initial.fog,
		);
		const parsed = parseSave(JSON.stringify(document));
		expect(parsed.ok).toBe(true);
		if (!parsed.ok) throw new Error(parsed.error);
		expect(restoreSave(parsed.value).state.afflictions[0].remaining).toBe(
			remaining,
		);
		expect(
			parseSave(
				JSON.stringify({
					...document,
					state: {
						...document.state,
						afflictions: [{ ...document.state.afflictions[0], remaining: 7 }],
					},
				}),
			).ok,
		).toBe(false);
	}
});
