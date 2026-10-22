// @vitest-environment node
import { describe, expect, it } from "vitest";
import { deriveCombatStats } from "../domain/game/CombatStats";
import { createGameState, type GameState } from "../domain/game/GameState";
import { attackProfile, deriveAccuracy } from "../domain/game/MeleeRules";
import { createEquipment } from "../domain/items/Equipment";
import {
	maximumMonsterHealth,
	monsterDamageRange,
} from "../domain/monsters/MonsterStats";
import {
	resolveMonsterPhaseWithHits,
	resolvePlayerActionWithHits,
} from "./ControlledCombatTestHelpers";
import { createTestDungeonFloor } from "./testhelpers";

const encounter = (floorNumber = 8, lateGame = false): GameState => {
	const run = {
		seed: 123,
		activeFloor: floorNumber,
		playerCoordinate: { row: 3, col: 4 },
		floors: Array.from({ length: 20 }, (_, i) =>
			createTestDungeonFloor({
				floorNumber: i + 1,
				rows: 10,
				cols: 10,
				room: { startRow: 1, endRow: 8, startCol: 1, endCol: 8 },
			}),
		),
	};
	return {
		...createGameState(run),
		objects: [],
		floorItems: [],
		turn: 1,
		progression: { experience: lateGame ? 3420 : 1000 },
		player: { health: lateGame ? 46 : 30, maxHealth: lateGame ? 46 : 30 },
		mana: lateGame ? 34 : 20,
		knownSpells: ["magic-missile", "frost-bolt", "web", "sleep", "fear"],
		equipment: lateGame
			? createEquipment(
					{ id: "weapon", kind: "star-forged-blade" },
					{ id: "shield", kind: "tower-shield" },
					{ id: "chest", kind: "dragon-mail" },
					{ id: "head", kind: "runic-helmet" },
					{ id: "ring", kind: "relic-band" },
					{ id: "int", kind: "ring-intelligence" },
				)
			: createEquipment(
					{ id: "weapon", kind: "battle-axe", enchantment: 1 },
					{ id: "shield", kind: "wooden-shield", enchantment: 1 },
					{ id: "chest", kind: "plate-armor" },
					{ id: "head", kind: "iron-helmet" },
				),
		monsters: [
			{
				id: `${floorNumber}:20001`,
				kind: "iron-champion",
				floorNumber,
				coordinate: { row: 3, col: 3 },
				health: maximumMonsterHealth("iron-champion", 1, floorNumber),
				intent: { type: "idle" },
			},
		],
	};
};
const atChargeDistance = (state: GameState): GameState => ({
	...state,
	run: { ...state.run, playerCoordinate: { row: 3, col: 6 } },
});

describe("Depth-appropriate champion pressure", () => {
	it.each([
		[8, 1, 72, 17, 19],
		[14, 1, 108, 23, 25],
		[20, 1, 144, 29, 31],
		[8, 0.75, 54, 13, 14],
		[20, 0.75, 108, 22, 23],
		[8, 1.25, 90, 21, 24],
		[20, 1.25, 180, 36, 39],
	] as const)(
		"reports floor %i at difficulty %s",
		(floor, difficulty, health, minDamage, maxDamage) => {
			expect(maximumMonsterHealth("iron-champion", difficulty, floor)).toBe(
				health,
			);
			expect(monsterDamageRange("iron-champion", difficulty, floor)).toEqual({
				minDamage,
				maxDamage,
			});
		},
	);
	it("makes three landed bumps dangerous for the recorded level-11 loadout", () => {
		let state = encounter();
		const combat = deriveCombatStats(state.equipment, state.progression);
		expect(attackProfile(combat.attack, 4)).toMatchObject({
			minDamage: 10,
			maxDamage: 12,
		});
		expect(combat.armor).toBe(7);
		expect(
			deriveAccuracy(state.progression, [], state.equipment).evadeChance,
		).toBe(30);
		for (let i = 0; i < 3; i++)
			state = resolvePlayerActionWithHits(state, {
				type: "move",
				direction: "left",
			}).state;
		expect(state.player.health).toBe(0);
		expect(state.monsters[0].health).toBe(39);
	});
	it("keeps the floor-20 champion alive beyond two hits and dangerous through late-game armor", () => {
		let state = encounter(20, true);
		expect(deriveCombatStats(state.equipment, state.progression).armor).toBe(
			11,
		);
		expect(
			deriveAccuracy(state.progression, [], state.equipment).evadeChance,
		).toBe(45);
		for (let i = 0; i < 2; i++)
			state = resolvePlayerActionWithHits(state, {
				type: "move",
				direction: "left",
			}).state;
		expect(state.monsters[0].health).toBe(106);
		expect(state.player.health).toBe(8);
	});
	it("uses the same floor-scaled damage for a landed charge, then gives a recovery phase", () => {
		const before = atChargeDistance(encounter(20, true));
		const prepared = resolveMonsterPhaseWithHits(before);
		expect(prepared.player.health).toBe(46);
		expect(prepared.monsters[0].intent).toMatchObject({
			type: "preparing-charge",
			target: { row: 3, col: 6 },
		});
		const hit = resolveMonsterPhaseWithHits({ ...prepared, turn: 2 });
		expect(hit.player.health).toBe(27);
		expect(hit.monsters[0].intent.type).toBe("recovering-charge");
		expect(resolveMonsterPhaseWithHits({ ...hit, turn: 3 }).player.health).toBe(
			27,
		);
	});
	it("still lets a sidestep dodge the fixed charge for free of damage", () => {
		const prepared = resolveMonsterPhaseWithHits(
			atChargeDistance(encounter(20, true)),
		);
		const result = resolvePlayerActionWithHits(prepared, {
			type: "move",
			direction: "down",
		});
		expect(result.turnAdvanced).toBe(true);
		expect(result.state.player.health).toBe(46);
		expect(result.state.monsters[0].intent.type).toBe("recovering-charge");
	});
	it.each(["web", "sleep", "fear"] as const)(
		"retains %s counterplay after charge preparation",
		(spell) => {
			const prepared = resolveMonsterPhaseWithHits(
				atChargeDistance(encounter()),
			);
			const result = resolvePlayerActionWithHits(prepared, {
				type: "cast",
				spell,
				targetId: prepared.monsters[0].id,
			});
			expect(result.turnAdvanced).toBe(true);
			expect(result.state.player.health).toBe(30);
			expect(result.state.monsters[0].intent.type).not.toBe("preparing-charge");
		},
	);
	it("rewards cold spell counterplay while retaining arcane resistance", () => {
		const before = atChargeDistance(encounter());
		const cold = resolvePlayerActionWithHits(before, {
			type: "cast",
			spell: "frost-bolt",
			targetId: before.monsters[0].id,
		});
		const arcane = resolvePlayerActionWithHits(before, {
			type: "cast",
			spell: "magic-missile",
			targetId: before.monsters[0].id,
		});
		expect(cold.state.monsters[0].health).toBe(56);
		expect(arcane.state.monsters[0].health).toBe(68);
		expect(cold.state.player.health).toBe(30);
		expect(cold.state.effects).toContainEqual(
			expect.objectContaining({
				kind: "slowed",
				actorId: before.monsters[0].id,
			}),
		);
	});
});
