// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { createGameState, type GameState } from "../domain/game/GameState";
import { damageMonster } from "../domain/game/MonsterDamage";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import {
	followWarden,
	isWarden,
	WARDEN_SPAWN_ID,
	wardenStats,
} from "../domain/monsters/EmberWarden";
import type { Monster } from "../domain/monsters/Monster";
import { actorMaximumHealth } from "../domain/monsters/MonsterStats";
import { parseSave, serializeSave } from "../domain/saves/SaveFormat";
import { bruteEncounter } from "./BruteTestHelpers";
import { resolveMonsterPhaseWithHits as phase } from "./ControlledCombatTestHelpers";
import { tacticalSnapshot } from "./TacticalReplayTestHelpers";
import { COMPACT_TEST_CONFIGURATION as config } from "./TestRunConfiguration";

const adventure = (seed = 123, difficulty: 1 | 1.25 = 1) =>
	createGameState(
		connectDungeonFloors(generateDungeonRun(seed, 5, config)),
		difficulty,
	);
const wardenOf = (state: GameState) => {
	const warden = state.monsters.find(isWarden);
	if (!warden) throw new Error("Expected an Ember Warden");
	return warden;
};
const saves = (state: GameState) =>
	parseSave(serializeSave(tacticalSnapshot(state))).ok;
// An awake Warden in the open floor-4 room with the player at 4,4.
const arena = (at: { row: number; col: number }, awake = true): GameState => {
	const state = bruteEncounter();
	const warden: Monster = {
		id: `4:${WARDEN_SPAWN_ID}`,
		kind: "ember-warden",
		floorNumber: 4,
		coordinate: at,
		health: wardenStats(5).maxHealth,
		intent: { type: "idle" },
		lastDamagedTurn: null,
		warden: { ...wardenStats(5), ...(awake ? { awake: true as const } : {}) },
	};
	return { ...state, monsters: [warden] };
};

describe("Ember Warden", () => {
	it("guards the ember on the final floor, dormant, with depth stats", () => {
		const state = adventure();
		const warden = wardenOf(state);
		const ember = state.floorItems.find((i) => i.item.kind === "cure");
		expect(warden).toMatchObject({
			id: `5:${WARDEN_SPAWN_ID}`,
			floorNumber: 5,
			warden: wardenStats(5),
		});
		expect(warden.warden?.awake).toBeUndefined();
		expect(ember?.floorNumber).toBe(5);
		expect(state.monsters.filter(isWarden)).toHaveLength(1);
		expect(saves(state)).toBe(true);
		expect(adventure()).toEqual(state);
	});

	it("scales from 80/12 at 5 floors to 160/26 at 20, then by difficulty", () => {
		expect(wardenStats(5)).toMatchObject({ maxHealth: 80, attackDamage: 12 });
		expect(wardenStats(20)).toMatchObject({ maxHealth: 160, attackDamage: 26 });
		const harder = wardenOf(adventure(123, 1.25));
		expect(harder.health).toBe(100);
		expect(actorMaximumHealth(harder, 1.25)).toBe(100);
	});

	it("sleeps until it sees you; waking is its whole action", () => {
		const unseen = arena({ row: 4, col: 6 }, false);
		const woke = phase({ ...unseen, turn: 1 });
		const after = wardenOf(woke);
		expect(after.warden?.awake).toBe(true);
		expect(after.intent.type).toBe("idle");
		expect(woke.player.health).toBe(unseen.player.health);
		expect(woke.activityHistory.entries.at(-1)?.event.type).toBe("warden-woke");
	});

	it("breathes fire with a countdown, then waits at least 4 phases to breathe again", () => {
		let state = arena({ row: 4, col: 8 });
		state = phase({ ...state, turn: 1 });
		expect(wardenOf(state).intent.type).toBe("preparing-area");
		let turn = 1;
		while (wardenOf(state).intent.type === "preparing-area")
			state = phase({ ...state, turn: ++turn });
		const breathed = wardenOf(state).telegraphTurn?.breath;
		expect(breathed).toBe(turn);
		for (let next = turn + 1; next <= turn + 4; next++) {
			state = phase({ ...state, turn: next });
			expect(wardenOf(state).intent.type).not.toBe("preparing-area");
		}
	});

	it("taking the ember enrages it and it follows you up with its health", () => {
		const start = adventure();
		const ember = start.floorItems.find((i) => i.item.kind === "cure");
		if (!ember) throw new Error("Expected the ember");
		const atEmber = {
			...start,
			run: { ...start.run, activeFloor: 5, playerCoordinate: ember.coordinate },
		};
		const taken = resolvePlayerAction(atEmber, {
			type: "pickup",
			itemId: "quest:cure",
		}).state;
		expect(wardenOf(taken).warden).toMatchObject({
			awake: true,
			enraged: true,
		});
		const hurt = {
			...taken,
			monsters: taken.monsters.map((m) =>
				isWarden(m) ? { ...m, health: 40 } : m,
			),
		};
		const up = hurt.run.floors[4].upStair;
		if (!up) throw new Error("Expected an up stair");
		const climbed = followWarden(
			{
				...hurt,
				run: {
					...hurt.run,
					activeFloor: 4,
					playerCoordinate: up.arrivalCoordinate,
				},
			},
			5,
		);
		const followed = wardenOf(climbed);
		expect(followed).toMatchObject({
			id: `4:${WARDEN_SPAWN_ID}`,
			floorNumber: 4,
			health: 40,
		});
		const { row, col } = up.arrivalCoordinate;
		expect(
			Math.abs(followed.coordinate.row - row) +
				Math.abs(followed.coordinate.col - col),
		).toBeGreaterThanOrEqual(3);
		expect(climbed.activityHistory.entries.at(-1)?.event).toMatchObject({
			type: "warden-followed",
			floorNumber: 4,
		});
		expect(saves(climbed)).toBe(true);
	});

	it("falls for a large XP reward and a +2 weapon or armor piece", () => {
		const state = arena({ row: 4, col: 5 });
		const killed = damageMonster(state, wardenOf(state), 999, {
			type: "player-hit",
		});
		expect(killed.progression.experience - state.progression.experience).toBe(
			72,
		);
		const drop = killed.floorItems.find(
			(i) => i.item.id === `monster:4:${WARDEN_SPAWN_ID}:loot`,
		);
		expect(drop?.item.enchantment).toBe(2);
	});

	it("saves reject a second Warden, wrong stats, or one off the final floor unless enraged", () => {
		const state = adventure();
		const document = tacticalSnapshot(state);
		const warden = document.state.monsters.find(
			(m) => m.kind === "ember-warden",
		);
		if (!warden?.warden) throw new Error("Expected a saved Warden");
		const withWarden = (changed: object) =>
			parseSave(
				serializeSave({
					...document,
					state: {
						...document.state,
						monsters: document.state.monsters.map((m) =>
							m === warden ? { ...m, ...changed } : m,
						),
					},
				} as typeof document),
			).ok;
		expect(withWarden({})).toBe(true);
		expect(withWarden({ warden: { ...warden.warden, attackDamage: 99 } })).toBe(
			false,
		);
		expect(withWarden({ floorNumber: 4, id: `4:${WARDEN_SPAWN_ID}` })).toBe(
			false,
		);
		expect(
			parseSave(
				serializeSave({
					...document,
					state: {
						...document.state,
						monsters: [
							...document.state.monsters,
							{ ...warden, id: "5:1000006", coordinate: { row: 0, col: 0 } },
						],
					},
				} as typeof document),
			).ok,
		).toBe(false);
	});
});
