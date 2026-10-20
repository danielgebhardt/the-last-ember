// @vitest-environment node
import { expect, it } from "vitest";
import { applyPlayerAffliction } from "../domain/game/Afflictions";
import { createGameState, type GameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { createBag } from "../domain/items/Bag";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";

const drained = (): GameState => ({
	...createGameState(createCorridorEncounter()),
	monsters: [],
	mana: 0,
});
const wait = (state: GameState, turns: number) => {
	let next = state;
	for (let turn = 0; turn < turns; turn++)
		next = resolvePlayerAction(next, { type: "wait" }).state;
	return next;
};

it("blocks exactly the three recovery ticks in its 90 phases, then recovery resumes", () => {
	const healthy = wait(drained(), 90);
	expect(healthy.mana).toBe(3);

	const burned = applyPlayerAffliction(drained(), "mana-burn", "test leech");
	expect(burned.afflictions).toEqual([
		{ kind: "mana-burn", remaining: 90, source: "test leech" },
	]);
	const lastPhase = wait(burned, 89);
	expect(lastPhase.mana).toBe(0);
	expect(lastPhase.afflictions?.[0]?.remaining).toBe(1);
	// Turn 90 is a recovery tick and the burn's final phase: still blocked, then it expires.
	const expired = wait(lastPhase, 1);
	expect(expired.turn).toBe(90);
	expect(expired.mana).toBe(0);
	expect(expired.afflictions).toEqual([]);
	// No stored burst: the next ordinary tick restores a single point.
	expect(wait(expired, 29).mana).toBe(0);
	expect(wait(expired, 30).mana).toBe(1);
});

it("refreshes duration only, and leaves mana potions working", () => {
	let state = applyPlayerAffliction(drained(), "mana-burn", "first");
	state = wait(state, 40);
	const refreshed = applyPlayerAffliction(state, "mana-burn", "second");
	expect(refreshed.afflictions).toEqual([
		{ kind: "mana-burn", remaining: 90, source: "second" },
	]);
	expect(applyPlayerAffliction(refreshed, "mana-burn", "third")).toBe(
		refreshed,
	);
	const potion = resolvePlayerAction(
		{
			...refreshed,
			bag: createBag([{ id: "review:mana", kind: "mana-potion" }]),
		},
		{ type: "consume", itemId: "review:mana" },
	).state;
	expect(potion.mana).toBeGreaterThan(0);
	expect(potion.afflictions?.[0]?.kind).toBe("mana-burn");
});
