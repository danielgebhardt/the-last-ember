// @vitest-environment node
import { expect, it } from "vitest";
import { afflictedMeleeAttack } from "../domain/game/AfflictionDefinitions";
import { applyPlayerAffliction } from "../domain/game/Afflictions";
import { createGameState, type GameState } from "../domain/game/GameState";
import { accuracyThresholds, deriveAccuracy } from "../domain/game/MeleeRules";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { createBag } from "../domain/items/Bag";
import { lootWeights } from "../domain/items/LootWeights";
import {
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import { savedAdventure } from "./SaveTestHelpers";
import { tacticalSnapshot } from "./TacticalReplayTestHelpers";

const adventure = (): GameState => ({
	...restoreSave(savedAdventure()).state,
	monsters: [],
	bag: createBag([{ id: "review:remove-curse", kind: "remove-curse-scroll" }]),
});
const hit = (state: GameState) =>
	deriveAccuracy(
		state.progression,
		state.effects,
		state.equipment,
		state.afflictions,
	).playerHitChance;

it("lowers melee to-hit by 10 points and damage by 1 until cured, without stacking", () => {
	const initial = adventure();
	const cursed = applyPlayerAffliction(initial, "curse", "test hex");
	expect(cursed.afflictions).toEqual([
		{ kind: "curse", remaining: null, source: "test hex" },
	]);
	expect(hit(cursed)).toBe(hit(initial) - 10);
	expect(applyPlayerAffliction(cursed, "curse", "again")).toBe(cursed);
	expect(afflictedMeleeAttack(3, cursed.afflictions)).toBe(2);
	expect(afflictedMeleeAttack(1, cursed.afflictions)).toBe(1);
	// Two d20 steps on the player's threshold, inside the usual clamp.
	expect(accuracyThresholds(0, 0, 2).playerHitThreshold).toBe(6);
	expect(accuracyThresholds(-30, 0, 2).playerHitThreshold).toBe(20);
	// Evasion and expiry are untouched: it lingers through many phases.
	expect(
		deriveAccuracy(
			cursed.progression,
			cursed.effects,
			cursed.equipment,
			cursed.afflictions,
		).evadeChance,
	).toBe(
		deriveAccuracy(initial.progression, initial.effects, initial.equipment)
			.evadeChance,
	);
	let waited = cursed;
	for (let turn = 0; turn < 40; turn++)
		waited = resolvePlayerAction(waited, { type: "wait" }).state;
	expect(waited.afflictions?.map((a) => a.kind)).toEqual(["curse"]);
});

it("a cursed hit deals one less damage", () => {
	const encounter: GameState = {
		...createGameState(createCorridorEncounter()),
		monsters: [
			{
				id: "1:1",
				kind: "zombie",
				floorNumber: 1,
				coordinate: { row: 1, col: 2 },
				health: 12,
				intent: { type: "idle" },
			},
		],
	};
	const rolls = () => ({ d20: () => 20, damage: (min: number) => min });
	const attack = (state: GameState) =>
		resolvePlayerAction(state, { type: "move", direction: "right" }, rolls)
			.state.monsters[0].health;
	const normal = 12 - attack(encounter);
	const cursed = 12 - attack(applyPlayerAffliction(encounter, "curse", "hex"));
	expect(cursed).toBe(Math.max(1, normal - 1));
});

it("joins loot on floors 6–14, and saves Curse", () => {
	expect(
		lootWeights(8, "found").find((e) => e.value === "remove-curse-scroll")
			?.weight,
	).toBe(0.25);
	for (const floor of [5, 15])
		expect(
			lootWeights(floor, "found").some(
				(e) => e.value === "remove-curse-scroll",
			),
		).toBe(false);

	const cursed = applyPlayerAffliction(
		{ ...restoreSave(savedAdventure()).state, monsters: [] },
		"curse",
		"hex",
	);
	const save = parseSave(serializeSave(tacticalSnapshot(cursed)));
	if (!save.ok) throw new Error(save.error);
	expect(restoreSave(save.value).state.afflictions).toEqual(cursed.afflictions);
});
