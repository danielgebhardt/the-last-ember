import { createProgression } from "../domain/game/Progression";
// @vitest-environment node

import { afterEach, describe, expect, it } from "vitest";
import {
	deriveCombatStats,
	resolveIncomingDamage,
} from "../domain/game/CombatStats";
import { createGameState } from "../domain/game/GameState";
import {
	createEquipment,
	createStartingEquipment,
} from "../domain/items/Equipment";
import { MONSTER_DEFINITIONS } from "../domain/monsters/Monster";
import { resolvePlayerActionWithHits as resolvePlayerAction } from "./ControlledCombatTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";

const originalGoblinDamage = MONSTER_DEFINITIONS.goblin.attackDamage;
afterEach(() => {
	MONSTER_DEFINITIONS.goblin.attackDamage = originalGoblinDamage;
});
const encounter = () => ({
	...createGameState({ ...createCorridorEncounter(), seed: 0 }),
	monsters: [
		{
			intent: { type: "idle" as const },
			id: "1:1",
			kind: "goblin" as const,
			floorNumber: 1,
			coordinate: { row: 1, col: 2 },
			health: 4,
		},
	],
});
const attack = (game: ReturnType<typeof encounter>) =>
	resolvePlayerAction(game, { type: "move", direction: "right" }).state;

describe("Equipment combat values", () => {
	it("falls back to base attack and zero armor with empty hands", () => {
		expect(deriveCombatStats(createEquipment(), createProgression())).toEqual({
			magicResistance: 5,
			magicResistanceIntelligenceBonus: 0,
			magicResistanceEquipmentBonus: 0,
			baseAttack: 1,
			weaponBonus: 0,
			perkAttack: 0,
			strengthBonus: 0,
			attack: 1,
			armor: 0,
		});
	});
	it("adds the starting weapon and shield contributions once", () => {
		expect(
			deriveCombatStats(createStartingEquipment(), createProgression()),
		).toEqual({
			magicResistance: 5,
			magicResistanceIntelligenceBonus: 0,
			magicResistanceEquipmentBonus: 0,
			baseAttack: 1,
			weaponBonus: 1,
			perkAttack: 0,
			strengthBonus: 0,
			attack: 2,
			armor: 1,
		});
	});
	it("calculates each equipped slot independently", () => {
		const gear = createStartingEquipment();
		expect(
			deriveCombatStats(createEquipment(gear.mainHand), createProgression())
				.attack,
		).toBe(2);
		expect(
			deriveCombatStats(createEquipment(gear.mainHand), createProgression())
				.armor,
		).toBe(0);
		expect(
			deriveCombatStats(
				createEquipment(null, gear.offHand),
				createProgression(),
			).attack,
		).toBe(1);
		expect(
			deriveCombatStats(
				createEquipment(null, gear.offHand),
				createProgression(),
			).armor,
		).toBe(1);
	});
	it.each([
		{ incoming: 4, armor: 1, expected: 3 },
		{ incoming: 1, armor: 1, expected: 1 },
		{ incoming: 2, armor: 10, expected: 1 },
	])(
		"resolves $incoming incoming damage against $armor armor as $expected",
		({ incoming, armor, expected }) => {
			expect(resolveIncomingDamage(incoming, armor)).toBe(expected);
		},
	);
});

describe("Equipment in the action cycle", () => {
	it("uses base damage when no weapon is equipped", () => {
		const result = attack({ ...encounter(), equipment: createEquipment() });
		expect(result.monsters[0].health).toBe(3);
		expect(result.activityHistory.entries[0].event).toMatchObject({
			type: "player-hit",
			damage: 1,
		});
	});
	it("reduces stronger retaliation before logging it, with player first and one monster phase", () => {
		MONSTER_DEFINITIONS.goblin.attackDamage = 4;
		const game = encounter();
		const before = structuredClone(game);
		const result = attack(game);
		expect(result.monsters[0].health).toBe(2);
		expect(result.player.health).toBe(7);
		expect(result.run).toBe(game.run);
		expect(result.turn).toBe(1);
		expect(result.activityHistory.entries.map((entry) => entry.event)).toEqual([
			{ type: "player-hit", turn: 1, monster: "goblin", damage: 2 },
			{ type: "monster-hit", turn: 1, monster: "goblin", damage: 3 },
		]);
		expect(game).toEqual(before);
	});
	it("applies armor to monster attacks during a wait as well as bump retaliation", () => {
		MONSTER_DEFINITIONS.goblin.attackDamage = 4;
		const result = resolvePlayerAction(encounter(), { type: "wait" }).state;
		expect(result.player.health).toBe(7);
		expect(result.activityHistory.entries[0].event).toMatchObject({
			type: "monster-hit",
			damage: 3,
		});
	});
	it("keeps goblin damage at one even with the starting shield", () => {
		expect(attack(encounter()).player.health).toBe(9);
	});
	it("logs resolved hit damage on overkill and omits retaliation from a killed monster", () => {
		const game = encounter();
		const result = attack({
			...game,
			monsters: [{ ...game.monsters[0], health: 1 }],
		});
		expect(result.monsters).toEqual([]);
		expect(result.player.health).toBe(10);
		expect(result.activityHistory.entries.map((entry) => entry.event)).toEqual([
			{ type: "player-hit", turn: 1, monster: "goblin", damage: 2 },
			{ type: "monster-died", turn: 1, monster: "goblin" },
			{ type: "gold-collected", turn: 1, amount: 8 },
			{ type: "experience-gained", turn: 1, amount: 5 },
		]);
	});
	it("clamps fatal damage at zero, logs the armored hit before death, then rejects further actions", () => {
		MONSTER_DEFINITIONS.goblin.attackDamage = 4;
		const game = { ...encounter(), player: { health: 2, maxHealth: 10 } };
		const dead = attack(game);
		expect(dead.player.health).toBe(0);
		expect(
			dead.activityHistory.entries.slice(-2).map((entry) => entry.event),
		).toEqual([
			{ type: "monster-hit", turn: 1, monster: "goblin", damage: 3 },
			{ type: "player-died", turn: 1 },
		]);
		expect(resolvePlayerAction(dead, { type: "wait" })).toEqual({
			state: dead,
			turnAdvanced: false,
		});
	});
});
