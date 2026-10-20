// @vitest-environment node

import { describe, expect, it } from "vitest";
import { createGameState, type GameState } from "../domain/game/GameState.ts";
import {
	MONSTER_DEFINITIONS,
	type Monster,
} from "../domain/monsters/Monster.ts";
import { resolvePlayerActionWithHits as resolvePlayerAction } from "./ControlledCombatTestHelpers";
import { createTestDungeonFloor } from "./testhelpers.ts";

const encounter = (): GameState => ({
	...createGameState({
		seed: 0, // A non-dropping seed keeps these scenarios focused on combat.
		activeFloor: 1,
		playerCoordinate: { row: 1, col: 1 },
		floors: [
			createTestDungeonFloor({
				floorNumber: 1,
				rows: 4,
				cols: 5,
				room: { startRow: 1, endRow: 2, startCol: 1, endCol: 3 },
			}),
		],
	}),
	turn: 7,
	floorItems: [], // Loot arrival messages are covered separately.
	monsters: [
		{
			intent: { type: "idle" as const },
			id: "1:1",
			kind: "goblin",
			floorNumber: 1,
			coordinate: { row: 1, col: 2 },
			health: 4,
		},
	],
});
const attack = (game: GameState) =>
	resolvePlayerAction(game, { type: "move", direction: "right" });

describe("Bump combat", () => {
	it("hits first, retaliates once, and records both events on one turn without moving", () => {
		const game = encounter();
		const before = structuredClone(game);
		const result = attack(game);
		expect(result.turnAdvanced).toBe(true);
		expect(result.state.turn).toBe(8);
		expect(result.state.run).toBe(game.run);
		expect(result.state.monsters[0].health).toBe(2);
		expect(result.state.player).toEqual({ health: 9, maxHealth: 10 });
		expect(
			result.state.activityHistory.entries.map((entry) => entry.event),
		).toEqual([
			{ type: "player-hit", turn: 8, monster: "goblin", damage: 2 },
			{ type: "monster-hit", turn: 8, monster: "goblin", damage: 1 },
		]);
		expect(game).toEqual(before);
	});

	it("kills on the second attack without retaliation, then allows entry to the empty tile", () => {
		const injured = attack(encounter()).state;
		const killed = attack(injured).state;
		expect(killed.turn).toBe(9);
		expect(killed.player.health).toBe(9);
		expect(killed.monsters).toEqual([]);
		expect(killed.run).toBe(injured.run);
		expect(
			killed.activityHistory.entries.slice(-4).map((entry) => entry.event),
		).toEqual([
			{ type: "player-hit", turn: 9, monster: "goblin", damage: 2 },
			{ type: "monster-died", turn: 9, monster: "goblin" },
			{ type: "gold-collected", turn: 9, amount: 8 },
			{ type: "experience-gained", turn: 9, amount: 5 },
		]);
		const walked = attack(killed).state;
		expect(walked.run.playerCoordinate).toEqual({ row: 1, col: 2 });
		expect(walked.turn).toBe(10);
		expect(walked.activityHistory).toBe(killed.activityHistory);
	});

	it("does not provoke the goblin on a blocked step", () => {
		const game = encounter();
		const result = resolvePlayerAction(game, { type: "move", direction: "up" });
		expect(result.state.player).toBe(game.player);
		expect(result.state.monsters).toBe(game.monsters);
		expect(result.state.activityHistory).toBe(game.activityHistory);
		expect(result.state.turn).toBe(7);
	});

	it("lets the adjacent goblin strike once as the player steps away", () => {
		const game = encounter();
		const result = resolvePlayerAction(game, {
			type: "move",
			direction: "down",
		});
		expect(result.state.run.playerCoordinate).toEqual({ row: 2, col: 1 });
		expect(result.state.player).toEqual({ health: 9, maxHealth: 10 });
		expect(result.state.monsters[0].coordinate).toEqual({ row: 1, col: 2 });
		expect(
			result.state.activityHistory.entries.map((entry) => entry.event),
		).toEqual([
			{ type: "monster-withdrawal-hit", turn: 8, monster: "goblin", damage: 1 },
		]);
		expect(result.state.turn).toBe(8);
	});

	it("does not attack a goblin at the same coordinate on a different floor", () => {
		const game = encounter();
		game.monsters = [{ ...game.monsters[0], floorNumber: 2 }];
		const result = attack(game).state;
		expect(result.run.playerCoordinate).toEqual({ row: 1, col: 2 });
		expect(result.player).toBe(game.player);
		expect(result.monsters).toBe(game.monsters);
		expect(result.activityHistory).toBe(game.activityHistory);
	});

	it("preserves other actors when updating or removing the attacked goblin", () => {
		const game = encounter();
		const other: Monster = { ...game.monsters[0], id: "2:1", floorNumber: 2 };
		game.monsters = [...game.monsters, other];
		const injured = attack(game).state;
		expect(injured.monsters[1]).toBe(other);
		expect(attack(injured).state.monsters).toEqual([other]);
	});
});

describe("Player death", () => {
	it("records the fatal retaliation before death and retains the attack position", () => {
		const game = encounter();
		game.player = { health: 1, maxHealth: 10 };
		const result = attack(game);
		expect(result.turnAdvanced).toBe(true);
		expect(result.state.turn).toBe(8);
		expect(result.state.player.health).toBe(0);
		expect(result.state.run).toBe(game.run);
		expect(result.state.monsters[0].health).toBe(2);
		expect(
			result.state.activityHistory.entries.map((entry) => entry.event),
		).toEqual([
			{ type: "player-hit", turn: 8, monster: "goblin", damage: 2 },
			{ type: "monster-hit", turn: 8, monster: "goblin", damage: 1 },
			{ type: "player-died", turn: 8 },
		]);
		expect(game.player.health).toBe(1);
	});

	it.each(["up", "down", "left", "right"] as const)(
		"ignores a %s action after death without changing any state",
		(direction) => {
			const game = encounter();
			game.player = { health: 1, maxHealth: 10 };
			const dead = attack(game).state;
			const result = resolvePlayerAction(dead, { type: "move", direction });
			expect(result.turnAdvanced).toBe(false);
			expect(result.state).toBe(dead);
		},
	);

	it("clamps overkill retaliation to zero", () => {
		const game = encounter();
		game.player = { health: 1, maxHealth: 10 };
		const definition = MONSTER_DEFINITIONS.goblin;
		const originalDamage = definition.attackDamage;
		// Exercise overkill without changing the actual goblin balance.
		definition.attackDamage = 3;
		try {
			const result = attack(game).state;
			expect(result.player.health).toBe(0);
			expect(
				result.activityHistory.entries.map((entry) => entry.event.type),
			).toEqual(["player-hit", "monster-hit", "player-died"]);
		} finally {
			definition.attackDamage = originalDamage;
		}
	});

	it("allows a player at one health to survive an overkill killing blow", () => {
		const game = encounter();
		game.player = { health: 1, maxHealth: 10 };
		game.monsters = [{ ...game.monsters[0], health: 1 }];
		const result = attack(game).state;
		expect(result.player.health).toBe(1);
		expect(result.monsters).toEqual([]);
		expect(
			result.activityHistory.entries.map((entry) => entry.event.type),
		).toEqual([
			"player-hit",
			"monster-died",
			"gold-collected",
			"experience-gained",
		]);
	});
});
