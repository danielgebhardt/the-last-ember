// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { activateEscapeFloor } from "../domain/game/Escape";
import { createGameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { maximumMonsterHealth } from "../domain/monsters/MonsterStats";
import { resolveMonsterPhase } from "../domain/monsters/MonsterTurns";
import { COMPACT_TEST_CONFIGURATION } from "./TestRunConfiguration";

const returnedAdventure = () => {
	const state = createGameState(
		connectDungeonFloors(
			generateDungeonRun(123, 5, {
				...COMPACT_TEST_CONFIGURATION,
				rows: 40,
				cols: 40,
			}),
		),
	);
	const arrival = state.run.floors[3].downStair?.coordinate;
	if (!arrival) throw new Error("Expected return arrival");
	return {
		...state,
		run: {
			...state.run,
			activeFloor: 4,
			playerCoordinate: arrival,
		},
		quest: { ...state.quest, cureRecovered: true },
		escape: { startedTurn: 0, activatedFloors: [] },
	};
};
describe("Once-per-floor escape activation", () => {
	it.each([0.75, 1, 1.25] as const)(
		"gives a wounded, empty-mana arrival a response before the new hunters attack at difficulty %s",
		(difficulty) => {
			const initial = returnedAdventure();
			const state = activateEscapeFloor(
				{
					...initial,
					difficulty,
					monsters: [],
					player: { ...initial.player, health: 1 },
					mana: 0,
				},
				5,
			);
			expect(state.monsters).toHaveLength(4);
			for (const monster of state.monsters)
				expect(monster.health).toBe(
					maximumMonsterHealth(monster.kind, difficulty, 4),
				);
			const after = resolveMonsterPhase({ ...state, turn: 1 }, () => ({
				d20: () => 20,
				damage: (_min, max) => max,
			}));
			expect(after.player.health).toBe(1);
			expect(after.run.playerCoordinate).toEqual(initial.run.playerCoordinate);
		},
	);
	it("adds one wave on ascent while retaining survivors and terrain", () => {
		const before = returnedAdventure();
		const after = activateEscapeFloor(before, 5);
		expect(after.escape?.activatedFloors).toEqual([4]);
		expect(after.monsters.length).toBe(before.monsters.length + 4);
		expect(after.monsters.slice(0, before.monsters.length)).toEqual(
			before.monsters,
		);
		expect(after.run).toBe(before.run);
		expect(activateEscapeFloor(after, 5)).toBe(after);
		expect(
			activateEscapeFloor({ ...after, monsters: before.monsters }, 5).monsters,
		).toBe(before.monsters);
	});
	it("does not activate on descent, waiting, before recovery, or after death", () => {
		const state = returnedAdventure();
		expect(activateEscapeFloor(state, 3)).toBe(state);
		expect(activateEscapeFloor(state, 4)).toBe(state);
		const descending = { ...state, escape: null };
		expect(activateEscapeFloor(descending, 5)).toBe(descending);
		const dead = { ...state, player: { ...state.player, health: 0 } };
		expect(activateEscapeFloor(dead, 5)).toBe(dead);
	});
	it("activates through the committed stair movement boundary exactly once", () => {
		const arrived = returnedAdventure();
		const upper = arrived.run.floors[4].upStair?.coordinate;
		if (!upper) throw new Error("Expected bottom-floor up stair");
		const neighbor = [
			{ row: upper.row, col: upper.col + 1, direction: "left" as const },
			{ row: upper.row + 1, col: upper.col, direction: "up" as const },
			{ row: upper.row, col: upper.col - 1, direction: "right" as const },
			{ row: upper.row - 1, col: upper.col, direction: "down" as const },
		].find(
			(point) => arrived.run.floors[4].terrain[point.row]?.[point.col] === ".",
		);
		if (!neighbor) throw new Error("Expected stair approach");
		const before = {
			...arrived,
			objects: [],
			monsters: [],
			run: {
				...arrived.run,
				activeFloor: 5,
				playerCoordinate: { row: neighbor.row, col: neighbor.col },
			},
		};
		const result = resolvePlayerAction(before, {
			type: "move",
			direction: neighbor.direction,
		});
		expect(result.turnAdvanced).toBe(true);
		expect(result.state.turn).toBe(1);
		expect(result.state.run.activeFloor).toBe(4);
		expect(result.state.escape?.activatedFloors).toEqual([4]);
		expect(result.state.monsters.length).toBeGreaterThan(0);
		expect(result.state.player.health).toBe(before.player.health);
	});
});
