// @vitest-environment node
import { expect, it } from "vitest";
import { deriveAttributes } from "../domain/game/Attributes";
import { deriveCombatStats } from "../domain/game/CombatStats";
import { createGameState } from "../domain/game/GameState";
import { deriveAccuracy } from "../domain/game/MeleeRules";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import { savedAdventure } from "./SaveTestHelpers";

const lowRolls = () => ({ d20: () => 20, damage: (min: number) => min });
it.each(["protection", "strength", "dexterity"] as const)(
	"applies %s separately from earned stats and expires after twenty committed phases",
	(spell) => {
		const state = {
			...createGameState(createCorridorEncounter()),
			knownSpells: [spell],
			monsters: [],
		};
		let enhanced = resolvePlayerAction(
			state,
			{ type: "cast", spell },
			lowRolls,
		).state;
		expect(enhanced.effects).toHaveLength(1);
		expect(enhanced.progression).toBe(state.progression);
		expect(enhanced.player).toBe(state.player);
		expect(
			deriveAttributes(enhanced.progression, enhanced.effects),
		).toMatchObject({
			strength: spell === "strength" ? 12 : 10,
			dexterity: spell === "dexterity" ? 12 : 10,
		});
		expect(
			deriveCombatStats(
				enhanced.equipment,
				enhanced.progression,
				enhanced.effects,
			),
		).toMatchObject({
			attack: spell === "strength" ? 3 : 2,
			armor: spell === "protection" ? 3 : 1,
		});
		for (let turn = 0; turn < 19; turn++)
			enhanced = resolvePlayerAction(
				enhanced,
				{ type: "wait" },
				lowRolls,
			).state;
		expect(enhanced.effects).toEqual([]);
		expect(
			deriveAttributes(enhanced.progression, enhanced.effects).strength,
		).toBe(10);
	},
);
it("Protection reduces the casting turn's retaliation and refreshing does not stack armor", () => {
	const initial = {
		...createGameState(createCorridorEncounter()),
		knownSpells: ["protection"] as const,
		monsters: [
			{
				id: "1:1",
				kind: "orc" as const,
				floorNumber: 1,
				coordinate: { row: 1, col: 2 },
				health: 7,
				intent: { type: "idle" as const },
			},
		],
	};
	const first = resolvePlayerAction(
		initial,
		{ type: "cast", spell: "protection" },
		lowRolls,
	).state;
	expect(first.player.health).toBe(9);
	const refreshed = resolvePlayerAction(
		first,
		{ type: "cast", spell: "protection" },
		lowRolls,
	).state;
	expect(refreshed.effects).toHaveLength(1);
	expect(
		deriveCombatStats(
			refreshed.equipment,
			refreshed.progression,
			refreshed.effects,
		).armor,
	).toBe(3);
});
it("Dexterity changes actual retaliation accuracy while respecting existing clamps", () => {
	const initial = {
		...createGameState(createCorridorEncounter()),
		// Level 2's Dexterity 12 plus the spell's 2 reaches the first evasion step.
		progression: { experience: 10 },
		knownSpells: ["dexterity"] as const,
		monsters: [
			{
				id: "1:1",
				kind: "orc" as const,
				floorNumber: 1,
				coordinate: { row: 1, col: 2 },
				health: 7,
				intent: { type: "idle" as const },
			},
		],
	};
	const after = resolvePlayerAction(
		initial,
		{ type: "cast", spell: "dexterity" },
		() => ({ d20: () => 5, damage: (min) => min }),
	).state;
	expect(after.player.health).toBe(10);
	expect(deriveAccuracy(after.progression, after.effects)).toMatchObject({
		playerHitChance: 95,
		evadeChance: 25,
	});
});

it("saved enhancements continue with their remaining duration without changing earned stats", () => {
	const saved = savedAdventure();
	const original = restoreSave(saved);
	const initial = {
		...original.state,
		knownSpells: [...original.state.knownSpells, "strength"] as const,
		monsters: [],
	};
	const enhanced = resolvePlayerAction(
		initial,
		{ type: "cast", spell: "strength" },
		lowRolls,
	).state;
	const parsed = parseSave(
		serializeSave(
			createSaveDocument(
				enhanced,
				original.exploration,
				original.configuration,
				original.fog,
			),
		),
	);
	expect(parsed.ok).toBe(true);
	if (!parsed.ok) throw new Error(parsed.error);
	const resumed = restoreSave(parsed.value).state;
	expect(resumed.effects).toEqual(enhanced.effects);
	const next = resolvePlayerAction(resumed, { type: "wait" }, lowRolls).state;
	expect(next.effects[0].remaining).toBe(18);
	expect(next.progression).toEqual(initial.progression);
	expect(deriveAttributes(next.progression, next.effects).strength).toBe(12);
});
