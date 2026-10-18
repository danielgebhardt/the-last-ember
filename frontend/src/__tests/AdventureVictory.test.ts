// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createGameState, type GameState } from "../domain/game/GameState";
import { resolvePlayerActionWithHits as resolvePlayerAction } from "./ControlledCombatTestHelpers";
import {
	createTestDungeonFloor,
	createThreeFloorTraversalRun,
} from "./testhelpers";

const nearEntrance = (): GameState => {
	const run = createThreeFloorTraversalRun();
	run.floors[0] = createTestDungeonFloor({
		floorNumber: 1,
		rows: 5,
		cols: 5,
		room: { startRow: 1, endRow: 2, startCol: 1, endCol: 3 },
	});
	const state = createGameState({
		...run,
		playerCoordinate: { row: 1, col: 1 },
	});
	return {
		...state,
		run: { ...state.run, playerCoordinate: { row: 1, col: 2 } },
		floorItems: [],
		monsters: [
			{
				intent: { type: "idle" as const },
				id: "1:1",
				kind: "goblin",
				floorNumber: 1,
				coordinate: { row: 2, col: 1 },
				health: 4,
			},
		],
		player: { health: 7, maxHealth: 10 },
		monstersDefeated: 4,
	};
};
describe("Returning through the entrance", () => {
	it("wins on one final movement turn before adjacent monsters retaliate", () => {
		const before = nearEntrance();
		before.quest = { ...before.quest, cureRecovered: true };
		const result = resolvePlayerAction(before, {
			type: "move",
			direction: "left",
		});
		expect(result.turnAdvanced).toBe(true);
		expect(result.state.quest.victory).toEqual({
			seed: 123,
			gold: before.gold,
			floors: 3,
			turns: 1,
			monstersDefeated: 4,
			health: 7,
			level: 1,
			experience: 0,
		});
		expect(result.state.player).toBe(before.player);
		expect(
			result.state.activityHistory.entries.map((x) => x.event.type),
		).toEqual(["quest-completed"]);
		expect(before.quest.victory).toBeNull();
	});
	it("reminds an unprepared player and still runs the normal monster turn", () => {
		const result = resolvePlayerAction(nearEntrance(), {
			type: "move",
			direction: "left",
		}).state;
		expect(result.quest.victory).toBeNull();
		expect(result.turn).toBe(1);
		expect(result.player.health).toBe(6);
		expect(result.activityHistory.entries.map((x) => x.event.type)).toEqual([
			"entrance-reminder",
			"monster-hit",
		]);
	});
	it("does not win merely by waiting on the entrance or starting there", () => {
		const state = nearEntrance();
		state.run = { ...state.run, playerCoordinate: state.quest.entrance };
		state.quest = { ...state.quest, cureRecovered: true };
		expect(state.quest.victory).toBeNull();
		expect(
			resolvePlayerAction(state, { type: "wait" }).state.quest.victory,
		).toBeNull();
	});
	it("freezes all actions after delivery, including otherwise-free assignments", () => {
		const before = nearEntrance();
		before.quest = { ...before.quest, cureRecovered: true };
		const won = resolvePlayerAction(before, {
			type: "move",
			direction: "left",
		}).state;
		for (const action of [
			{ type: "wait" },
			{ type: "move", direction: "right" },
			{ type: "assign-hotbar", slot: 1, itemId: "missing" },
			{ type: "pickup", itemId: "missing" },
		] as const)
			expect(resolvePlayerAction(won, action)).toEqual({
				state: won,
				turnAdvanced: false,
			});
	});
	it("cannot deliver after death", () => {
		const before = nearEntrance();
		before.quest = { ...before.quest, cureRecovered: true };
		before.player = { health: 0, maxHealth: 10 };
		expect(
			resolvePlayerAction(before, { type: "move", direction: "left" }).state,
		).toBe(before);
		expect(before.quest.victory).toBeNull();
	});
});
