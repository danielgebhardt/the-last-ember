// @vitest-environment node

import { describe, expect, it } from "vitest";
import { createGameState } from "../domain/game/GameState.ts";
import { createThreeFloorTraversalRun } from "./testhelpers.ts";

describe("New game state", () => {
	it("starts at turn zero without changing the dungeon", () => {
		const run = createThreeFloorTraversalRun();
		const game = createGameState(run);
		expect(game.turn).toBe(0);
		expect(game.gold).toBe(300);
		expect(game.run).toBe(run);
	});

	it("starts a fresh counter when replaying the same dungeon", () => {
		const previous = {
			...createGameState(createThreeFloorTraversalRun()),
			turn: 7,
			gold: 42,
		};
		const restarted = createGameState(previous.run);
		expect(restarted.turn).toBe(0);
		expect(restarted.gold).toBe(300);
		expect(previous.gold).toBe(42);
		expect(previous.turn).toBe(7);
		expect(restarted.run).toBe(previous.run);
	});
});
