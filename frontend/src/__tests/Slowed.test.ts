// @vitest-environment node
import { expect, it } from "vitest";
import { formatActivityEvent } from "../components/game/ActivityMessages";
import {
	advancePlayerAfflictions,
	applyPlayerAffliction,
	removePlayerAfflictions,
} from "../domain/game/Afflictions";
import { createGameState, type GameState } from "../domain/game/GameState";
import { accuracyThresholds, deriveAccuracy } from "../domain/game/MeleeRules";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import { savedAdventure } from "./SaveTestHelpers";

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

it("lasts ten phases including the one it lands, then expires once and restores evasion", () => {
	const initial = quiet();
	const slowed = applyPlayerAffliction(initial, "slowed", "test web");
	expect(slowed.afflictions).toEqual([
		{ kind: "slowed", remaining: 10, source: "test web" },
	]);
	expect(evade(initial)).toBe(20);
	expect(evade(slowed)).toBe(10);
	let state = slowed;
	for (let phase = 1; phase <= 9; phase++) {
		state = advancePlayerAfflictions(state);
		expect(state.afflictions?.[0]?.remaining).toBe(10 - phase);
	}
	state = advancePlayerAfflictions(state);
	expect(state.afflictions).toEqual([]);
	expect(evade(state)).toBe(20);
	expect(changes(state)).toEqual(["applied", "expired"]);
	expect(advancePlayerAfflictions(state)).toBe(state);
});

it("refreshes duration without deepening the penalty, and clamps at the evasion floor", () => {
	let state = applyPlayerAffliction(quiet(), "slowed", "first");
	for (let phase = 0; phase < 6; phase++)
		state = advancePlayerAfflictions(state);
	const refreshed = applyPlayerAffliction(state, "slowed", "second");
	expect(refreshed.afflictions).toEqual([
		{ kind: "slowed", remaining: 10, source: "second" },
	]);
	expect(evade(refreshed)).toBe(10);
	expect(changes(refreshed)).toEqual(["applied", "refreshed"]);
	// Unchanged at full duration: no repeated log entry.
	expect(applyPlayerAffliction(refreshed, "slowed", "third")).toBe(refreshed);
	// Two threshold steps after Dexterity, never below the existing 5% minimum.
	expect(accuracyThresholds(0, 2).monsterHitThreshold).toBe(3);
	expect(accuracyThresholds(-5, 2).monsterHitThreshold).toBe(2);
	expect(accuracyThresholds(5, 2).monsterHitThreshold).toBe(8);
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
	expect(slowed.afflictions?.[0]?.remaining).toBe(9);
});

it("describes application, cure and expiry in Activity", () => {
	const event = (change: "applied" | "cured" | "expired") =>
		formatActivityEvent({
			type: "affliction-changed",
			condition: "slowed",
			change,
			source: "giant spider",
			turn: 3,
		});
	expect(event("applied")).toBe(
		"Turn 3 — Slowed applied (giant spider). Evasion −10 for 10 phases. Use a Cleansing potion or sanctuary treatment.",
	);
	expect(event("cured")).toBe(
		"Turn 3 — Slowed cured (giant spider). Evasion restored.",
	);
	expect(event("expired")).toBe("Turn 3 — Slowed wears off. Evasion restored.");
});

it("saves the actual remaining phases and rejects lifetimes that disagree with the kind", () => {
	const original = restoreSave(savedAdventure());
	const save = (afflictions: GameState["afflictions"]) =>
		parseSave(
			serializeSave(
				createSaveDocument(
					{
						...original.state,
						monsters: [],
						afflictions,
						player: {
							health: 8,
							maxHealth: afflictions?.some((a) => a.kind === "disease")
								? 8
								: 10,
						},
					},
					original.exploration,
					original.configuration,
					original.fog,
				),
			),
		);
	const slowed = [{ kind: "slowed" as const, remaining: 7, source: "web" }];
	const parsed = save(slowed);
	if (!parsed.ok) throw new Error(parsed.error);
	const resumed = restoreSave(parsed.value).state;
	expect(resumed.afflictions).toEqual(slowed);
	expect(
		resolvePlayerAction(resumed, { type: "wait" }).state.afflictions,
	).toEqual([{ ...slowed[0], remaining: 6 }]);
	expect(save([{ ...slowed[0], remaining: 11 }]).ok).toBe(false);
	expect(save([{ ...slowed[0], remaining: null }]).ok).toBe(false);
	expect(save([{ kind: "disease", remaining: 3, source: "rat" }]).ok).toBe(
		false,
	);
});
