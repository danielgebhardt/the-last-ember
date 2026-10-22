// @vitest-environment node
import { expect, it } from "vitest";
import {
	advancePlayerAfflictions,
	applyPlayerAffliction,
	removePlayerAfflictions,
} from "../domain/game/Afflictions";
import { createGameState, type GameState } from "../domain/game/GameState";
import { accuracyThresholds, deriveAccuracy } from "../domain/game/MeleeRules";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";

const quiet = (): GameState => ({
	...createGameState(createCorridorEncounter()),
	monsters: [],
});
const evade = (state: GameState) =>
	deriveAccuracy(
		state.progression,
		state.effects,
		state.equipment,
		state.afflictions,
	).evadeChance;
const changes = (state: GameState) =>
	state.activityHistory.entries.flatMap(({ event }) =>
		event.type === "affliction-changed" ? [event.change] : [],
	);

it("refreshes duration without deepening the penalty, and clamps at the evasion floor", () => {
	let state = applyPlayerAffliction(quiet(), "slowed", "first");
	for (let phase = 0; phase < 6; phase++)
		state = advancePlayerAfflictions(state);
	const refreshed = applyPlayerAffliction(state, "slowed", "second");
	expect(refreshed.afflictions).toEqual([
		{ kind: "slowed", remaining: 30, source: "second" },
	]);
	expect(evade(refreshed)).toBe(10);
	expect(changes(refreshed)).toEqual(["applied", "refreshed"]);
	// Unchanged at full duration: no repeated log entry.
	expect(applyPlayerAffliction(refreshed, "slowed", "third")).toBe(refreshed);
	// Two threshold steps after Dexterity, never below the existing 5% minimum.
	expect(accuracyThresholds(0, 2).monsterHitThreshold).toBe(3);
	expect(accuracyThresholds(-5, 2).monsterHitThreshold).toBe(2);
	// A +5 Dexterity modifier is two evasion steps, which Slowed cancels.
	expect(accuracyThresholds(5, 2).monsterHitThreshold).toBe(5);
});

it("coexists with Disease and poison, and only its own cure removes it", () => {
	const both = applyPlayerAffliction(
		applyPlayerAffliction(
			{
				...quiet(),
				effects: [],
				afflictions: [
					{ kind: "poisoned" as const, remaining: 4, source: "test" },
				],
			},
			"disease",
			"rat",
		),
		"slowed",
		"web",
	);
	expect(both.afflictions.map((a) => a.kind)).toEqual([
		"disease",
		"poisoned",
		"slowed",
	]);
	expect(both.player.maxHealth).toBe(8);
	expect(evade(both)).toBe(10);
	const cured = removePlayerAfflictions(both, ["slowed"], "test");
	expect(cured.afflictions.map((a) => a.kind)).toEqual(["disease", "poisoned"]);
	expect(cured.player).toEqual(both.player);
	expect(evade(cured)).toBe(20);
});

it("lets an otherwise-evaded monster roll land while Slowed", () => {
	const encounter: GameState = {
		...createGameState(createCorridorEncounter()),
		monsters: [
			{
				id: "1:1",
				kind: "goblin",
				floorNumber: 1,
				coordinate: { row: 1, col: 2 },
				health: 4,
				intent: { type: "idle" },
			},
		],
	};
	// The d20 of 4 misses the base threshold of 5, but meets the slowed threshold of 3.
	const rolls = () => ({ d20: () => 4, damage: (min: number) => min });
	const healthy = resolvePlayerAction(encounter, { type: "wait" }, rolls).state;
	const slowed = resolvePlayerAction(
		applyPlayerAffliction(encounter, "slowed", "test"),
		{ type: "wait" },
		rolls,
	).state;
	expect(healthy.player.health).toBe(10);
	expect(slowed.player.health).toBe(9);
	expect(slowed.afflictions?.[0]?.remaining).toBe(29);
});
