// @vitest-environment node
import { expect, it } from "vitest";
import {
	advanceTimedEffects,
	applyTimedEffect,
} from "../domain/game/TimedEffects";
import { quietCorridor } from "./CorridorTravelTestHelpers";

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
