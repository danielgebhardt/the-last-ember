// @vitest-environment node
import { describe, expect, it } from "vitest";
import { deriveAttributes } from "../domain/game/Attributes";
import { createGameState, type GameState } from "../domain/game/GameState";
import {
	accuracyThresholds,
	attackProfile,
	deriveAccuracy,
	resolveMeleeAttack,
} from "../domain/game/MeleeRules";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { experienceThreshold } from "../domain/game/Progression";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";

describe("Earned Dexterity and melee accuracy", () => {
	it.each([
		// +5 points per 4 Dexterity: half the earlier early-level growth.
		[10, 20],
		[14, 25],
		[17, 25],
		[18, 30],
		[20, 30],
		[22, 35],
		[26, 40],
		[30, 45],
		[34, 50],
		[38, 55],
		[60, 80],
	])(
		"gives Dexterity %i the approved %i percent evasion without changing player accuracy",
		(dexterity, evasion) => {
			const modifier = Math.floor((dexterity - 10) / 2);
			const thresholds = accuracyThresholds(modifier);
			expect((thresholds.monsterHitThreshold - 1) * 5).toBe(evasion);
			expect((21 - thresholds.playerHitThreshold) * 5).toBe(
				Math.min(95, 85 + modifier * 5),
			);
		},
	);
	it("combines a ring and temporary Dexterity across an evasion step, then expires it", () => {
		const initial = createGameState(createCorridorEncounter());
		let state: GameState = {
			...initial,
			// Earned 18 + ring 2 = 20; the spell's +2 reaches the next step at 22.
			progression: { experience: experienceThreshold(8) },
			monsters: [],
			knownSpells: ["dexterity"],
			equipment: {
				...initial.equipment,
				leftRing: { id: "dex-ring", kind: "ring-dexterity" as const },
			},
		};
		expect(
			deriveAccuracy(state.progression, [], state.equipment).evadeChance,
		).toBe(30);
		state = resolvePlayerAction(state, {
			type: "cast",
			spell: "dexterity",
		}).state;
		expect(
			deriveAttributes(state.progression, state.effects, state.equipment)
				.dexterity,
		).toBe(22);
		expect(
			deriveAccuracy(state.progression, state.effects, state.equipment)
				.evadeChance,
		).toBe(35);
		for (let turn = 0; turn < 19; turn++)
			state = resolvePlayerAction(state, { type: "wait" }).state;
		expect(state.effects).toEqual([]);
		expect(
			deriveAccuracy(state.progression, state.effects, state.equipment)
				.evadeChance,
		).toBe(30);
	});
	it.each([
		[0, 10, 0],
		[10, 12, 1],
		[30, 12, 1],
		[60, 14, 2],
		[100, 14, 2],
		[1000, 20, 5],
	])(
		"derives earned Dexterity from %i XP",
		(experience, dexterity, dexterityModifier) => {
			expect(deriveAttributes({ experience })).toMatchObject({
				dexterity,
				dexterityModifier,
			});
		},
	);
	it.each([
		[0, 85, 20],
		[10, 90, 20],
		[60, 95, 25],
		[1000, 95, 30],
	])(
		"shows real accuracy and evasion for %i XP",
		(experience, playerHitChance, evadeChance) => {
			expect(deriveAccuracy({ experience })).toMatchObject({
				playerHitChance,
				evadeChance,
			});
		},
	);
	it.each([
		[0, 4, 5],
		[10, 3, 5],
		[60, 2, 6],
	])(
		"resolves exact hit/miss boundaries for %i XP",
		(experience, playerThreshold, monsterThreshold) => {
			const accuracy = deriveAccuracy({ experience });
			for (const [actual, expected] of [
				[accuracy.playerHitThreshold, playerThreshold],
				[accuracy.monsterHitThreshold, monsterThreshold],
			]) {
				const profile = attackProfile(3, actual);
				expect(
					resolveMeleeAttack(profile, {
						d20: () => expected - 1,
						damage: () => {
							throw new Error("Miss should not roll damage");
						},
					}),
				).toEqual({ hit: false, damage: 0 });
				expect(
					resolveMeleeAttack(
						profile,
						{ d20: () => expected, damage: () => 3 },
						1,
					),
				).toEqual({ hit: true, damage: 2 });
			}
		},
	);
	it("caps chances at five and ninety-five percent, including future larger modifiers", () => {
		expect(accuracyThresholds(100)).toEqual({
			playerHitThreshold: 2,
			monsterHitThreshold: 20,
		});
		expect(accuracyThresholds(-100)).toEqual({
			playerHitThreshold: 20,
			monsterHitThreshold: 2,
		});
		expect(() => accuracyThresholds(1.5)).toThrow(RangeError);
	});
	it("applies newly earned evasion before the surviving monster phase", () => {
		const initial = createGameState(createCorridorEncounter());
		const before = {
			...initial,
			run: { ...initial.run, playerCoordinate: { row: 1, col: 2 } },
			// One goblin kill reaches level 4, whose Dexterity 14 is the first evasion step.
			progression: { experience: experienceThreshold(4) - 5 },
			player: { health: 6, maxHealth: 10 },
			monsters: [
				{
					intent: { type: "idle" as const },
					id: "1:1",
					kind: "goblin" as const,
					floorNumber: 1,
					coordinate: { row: 1, col: 3 },
					health: 1,
				},
				{
					intent: { type: "idle" as const },
					id: "1:2",
					kind: "orc" as const,
					floorNumber: 1,
					coordinate: { row: 1, col: 1 },
					health: 7,
				},
			],
		};
		const outcome = resolvePlayerAction(
			before,
			{ type: "move", direction: "right" },
			(context) => ({
				d20: () => (context.attackerId === "player" ? 20 : 5),
				damage: (min, max) => Math.floor((min + max) / 2),
			}),
		).state;
		expect(outcome.player).toEqual({ health: 8, maxHealth: 12 });
		expect(
			outcome.activityHistory.entries.map((entry) => entry.event),
		).toContainEqual({
			type: "attribute-gained",
			attribute: "Dexterity",
			value: 14,
			turn: 1,
		});
		expect(outcome.activityHistory.entries.at(-1)?.event).toMatchObject({
			type: "monster-missed",
			monster: "orc",
		});
	});
});

it.each([
	[1, 20, 20],
	[5, 25, 30],
	[9, 30, 35],
	[15, 35, 40],
	[19, 40, 45],
])(
	"at level %i, earned Dexterity alone gives %i percent evasion, and Evasive %i",
	(level, evasion, evasive) => {
		const progression = { experience: experienceThreshold(level) };
		expect(deriveAccuracy(progression).evadeChance).toBe(evasion);
		if (level >= 3)
			expect(
				deriveAccuracy({
					...progression,
					perks: [{ level: 3, perk: "evasive" }],
				}).evadeChance,
			).toBe(evasive);
	},
);
