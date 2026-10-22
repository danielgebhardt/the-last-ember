// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	createReviewEncounter,
	reviewPressure,
	runReviewFight,
} from "../../scripts/evasion-review";
import { updateExploration } from "../domain/dungeon/Exploration";
import {
	DEFAULT_FOG_CONFIGURATION,
	DEFAULT_RUN_CONFIGURATION,
} from "../domain/dungeon/RunConfiguration";
import { deriveAttributes } from "../domain/game/Attributes";
import { deriveCombatStats } from "../domain/game/CombatStats";
import { deriveAccuracy } from "../domain/game/MeleeRules";
import {
	type PlayerAction,
	resolvePlayerAction,
} from "../domain/game/PlayerActions";
import { resolveMonsterPhase } from "../domain/monsters/MonsterTurns";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";

describe("Run-three evasion balance evidence", () => {
	it.each([
		[2, 32, 45, 19, 11, 44],
		[3, 34, 50, 21, 11, 48],
	])(
		"reproduces recorded checkpoint %i",
		(checkpoint, dexterity, evasion, attack, armor, health) => {
			const state = createReviewEncounter(checkpoint, 1172903873);
			expect(
				deriveAttributes(state.progression, [], state.equipment).dexterity,
			).toBe(dexterity);
			expect(
				deriveAccuracy(state.progression, [], state.equipment).evadeChance,
			).toBe(evasion);
			expect(
				deriveCombatStats(state.equipment, state.progression),
			).toMatchObject({ attack, armor });
			expect(state.player.maxHealth).toBe(health);
		},
	);
	it("gives the same evasion on every dungeon floor", () => {
		const state = createReviewEncounter(2, 123);
		for (let activeFloor = 1; activeFloor <= 20; activeFloor++) {
			const moved = { ...state, run: { ...state.run, activeFloor } };
			expect(
				deriveAccuracy(moved.progression, moved.effects, moved.equipment)
					.evadeChance,
			).toBe(45);
		}
	});
	it("measures all twenty hit faces and all damage outcomes without death censoring", () => {
		const state = createReviewEncounter(2, 123);
		const legacy = reviewPressure(state, "iron-champion", 123, 200, false);
		const applied = reviewPressure(state, "iron-champion", 123, 200, true);
		expect(legacy.expectedDamagePerAttempt).toBe(4);
		expect(applied.expectedDamagePerAttempt).toBeCloseTo(8.8);
		expect(legacy.evadeChance).toBe(75);
		expect(applied.evadeChance).toBe(45);
		expect(applied.hits).toBeGreaterThanOrEqual(legacy.hits);
		expect(applied.damage).toBeGreaterThanOrEqual(legacy.damage);
		expect(reviewPressure(state, "iron-champion", 123, 200, false)).toEqual(
			legacy,
		);
	});
	it.each([0, 1])(
		"never lightens early/mid pressure below the legacy curve at checkpoint %i",
		(checkpoint) => {
			const state = createReviewEncounter(checkpoint, 123);
			const legacy = reviewPressure(state, "goblin", 123, 200, false);
			const applied = reviewPressure(state, "goblin", 123, 200, true);
			expect(applied.evadeChance).toBeLessThanOrEqual(legacy.evadeChance);
			expect(applied.hits).toBeGreaterThanOrEqual(legacy.hits);
		},
	);
	it.each(["legacy", "applied"] as const)(
		"retains charge sidesteps and control under the %s experiment",
		(curve) => {
			for (const policy of ["sidestep", "web", "sleep", "fear"] as const) {
				const result = runReviewFight(1172903873, policy, curve === "applied");
				expect(result.damageTaken, policy).toBe(0);
				expect(result.state.player.health).toBe(44);
				expect(result.state.monsters[0].intent.type).not.toBe(
					"preparing-charge",
				);
			}
		},
	);
	it("applies the active curve's exact hit boundary to actual charges", () => {
		for (const [applied, expectedHits] of [
			[false, 5],
			[true, 11],
		] as const) {
			let hits = 0;
			for (let face = 1; face <= 20; face++) {
				const result = runReviewFight(123, "charge", applied, () => ({
					d20: () => face,
					damage: (min) => min,
				}));
				hits += Number(result.damageTaken > 0);
			}
			expect(hits).toBe(expectedHits);
		}
	});
	it("uses cold weakness and measures actual Drain Life healing and mana costs", () => {
		const cold = runReviewFight(1172903873, "cold", false);
		const arcane = runReviewFight(1172903873, "arcane", false);
		expect(cold.monsterDamage).toBeGreaterThan(arcane.monsterDamage);
		expect(cold.state.effects.some((effect) => effect.kind === "slowed")).toBe(
			true,
		);
		const drain = runReviewFight(1172903873, "drain", false);
		// This particular stream takes no damage: Drain Life must not overheal.
		expect(drain.healing).toBe(0);
		expect(drain.manaSpent).toBe(6);
	});
	it("reconstructs the reported six bumps, seven retaliations and finishing Drain Life", () => {
		let state = { ...createReviewEncounter(2, 1172903873), mana: 22 };
		const actions: PlayerAction[] = [
			{ type: "wait" },
			...Array.from({ length: 6 }, () => ({
				type: "move" as const,
				direction: "left" as const,
			})),
			{ type: "cast", spell: "drain-life", targetId: state.monsters[0].id },
		];
		const damages = [18, 19, 18, 20, 20, 19];
		for (const action of actions)
			state = resolvePlayerAction(state, action, (context) => ({
				d20: () =>
					context.targetId === "player" && context.turn !== 6981 ? 1 : 20,
				damage: () =>
					context.attackerId === "player"
						? damages[context.turn - 6976]
						: context.targetId === "player"
							? 28 // Armor 11 reduces this raw hit to the recorded 17.
							: 15,
			})).state;
		expect(state.turn).toBe(6982);
		expect(state.player.health).toBe(39);
		expect(state.mana).toBe(16);
		expect(state.monsters).toHaveLength(0);
		expect(
			state.activityHistory.entries.map(({ event }) => event),
		).toContainEqual({
			type: "spell-healed",
			spell: "drain-life",
			recovered: 12,
			turn: 6982,
		});
	});
	it.each(["melee", "shot", "heavy", "charge"])(
		"uses the shared 45% evasion gate for %s",
		(attack) => {
			let landed = 0;
			const before = createReviewEncounter(
				2,
				123,
				attack === "shot"
					? "goblin-archer"
					: attack === "heavy"
						? "dungeon-brute"
						: "iron-champion",
			);
			const monster = before.monsters[0];
			if (attack === "shot") monster.coordinate = { row: 8, col: 7 };
			if (attack === "heavy")
				monster.intent = {
					type: "preparing-attack",
					target: before.run.playerCoordinate,
				};
			if (attack === "charge") {
				monster.coordinate = { row: 8, col: 7 };
				monster.intent = {
					type: "preparing-charge",
					target: before.run.playerCoordinate,
				};
			}
			for (let face = 1; face <= 20; face++) {
				const after = resolveMonsterPhase(before, () => ({
					d20: () => face,
					damage: (min) => min,
				}));
				landed += Number(after.player.health < before.player.health);
			}
			expect(landed).toBe(11);
		},
	);
	it.each([false, true])(
		"resumes wounded and prepared state identically (charge prepared: %s)",
		(prepared) => {
			const initial = createReviewEncounter(2, 123);
			initial.player = { ...initial.player, health: 27 };
			initial.monsters = [
				{
					...initial.monsters[0],
					health: 62,
					...(prepared
						? {
								coordinate: { row: 8, col: 7 },
								intent: {
									type: "preparing-charge" as const,
									target: initial.run.playerCoordinate,
								},
							}
						: {}),
				},
			];
			const exploration = updateExploration(
				initial.run,
				DEFAULT_FOG_CONFIGURATION.radius,
			);
			const parsed = parseSave(
				serializeSave(
					createSaveDocument(
						initial,
						exploration,
						DEFAULT_RUN_CONFIGURATION,
						DEFAULT_FOG_CONFIGURATION,
					),
				),
			);
			if (!parsed.ok) throw new Error(parsed.error);
			const resumed = restoreSave(parsed.value).state;
			expect(resumed.player).toEqual(initial.player);
			expect(resumed.monsters).toMatchObject(initial.monsters);
			expect(
				deriveAccuracy(resumed.progression, resumed.effects, resumed.equipment)
					.evadeChance,
			).toBe(45);
			// Saved wounds/preparation remain, but a 13 now lands under the approved curve.
			expect(
				resolvePlayerAction(resumed, { type: "wait" }, () => ({
					d20: () => 13,
					damage: (min) => min,
				})).state.player.health,
			).toBe(12);
			expect(resolvePlayerAction(resumed, { type: "wait" })).toEqual(
				resolvePlayerAction(initial, { type: "wait" }),
			);
		},
	);
});
