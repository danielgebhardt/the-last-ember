// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import type { Coordinate } from "../domain/dungeon/DungeonTypes";
import { deriveAttributes } from "../domain/game/Attributes";
import { createGameState, type GameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { ITEM_DEFINITIONS } from "../domain/items/Item";
import { isThief } from "../domain/monsters/TreasureThief";
import { resolvePlayerActionWithHits } from "./ControlledCombatTestHelpers";
import { COMPACT_TEST_CONFIGURATION } from "./TestRunConfiguration";
import {
	createTestDungeonFloor,
	createThreeFloorTraversalRun,
	findFloorPath,
} from "./testhelpers";

const walk = (before: GameState, target: Coordinate) => {
	let state = before;
	const path = findFloorPath(
		state.run.floors[state.run.activeFloor - 1].terrain,
		state.run.playerCoordinate,
		target,
	);
	for (const point of path.slice(1)) {
		const previous = state.run.playerCoordinate;
		const direction =
			point.row < previous.row
				? "up"
				: point.row > previous.row
					? "down"
					: point.col < previous.col
						? "left"
						: "right";
		state = resolvePlayerAction(state, { type: "move", direction }).state;
	}
	return state;
};
describe("Complete cure-and-return adventures", () => {
	it("descends, recovers, returns through cleared floors, wins, and resets on replay", () => {
		const run = createThreeFloorTraversalRun();
		const fresh = createGameState(run);
		let state: GameState = { ...fresh, monsters: [] };
		// Each destination is the down stair on the current floor.
		state = walk(state, { row: 1, col: 2 });
		expect(state.run.activeFloor).toBe(2);
		state = walk(state, { row: 1, col: 3 });
		expect(state.run.activeFloor).toBe(3);
		const cure = state.floorItems.find((x) => x.item.kind === "cure");
		if (!cure) throw new Error("Expected one cure.");
		state = walk(state, cure.coordinate);
		state = resolvePlayerAction(state, {
			type: "pickup",
			itemId: cure.item.id,
		}).state;
		expect(state.quest.cureRecovered).toBe(true);
		// Both lower floors have their up stair at (1, 1).
		state = walk(state, { row: 1, col: 1 });
		expect(state.run.activeFloor).toBe(2);
		state = walk(state, { row: 1, col: 1 });
		expect(state.run.activeFloor).toBe(1);
		state = walk(state, state.quest.entrance);
		expect(state.quest.victory).toMatchObject({
			seed: 123,
			floors: 3,
			health: 10,
			monstersDefeated: 0,
		});
		expect(state.quest.victory?.turns).toBe(state.turn);
		expect(state.monsters).toEqual([]);
		expect(state.floorItems.some((x) => x.item.kind === "cure")).toBe(false);
		expect(createGameState(run)).toEqual(fresh);
		expect(fresh.quest.cureRecovered).toBe(false);
	});
	it("carries earned progression through recovery and victory, then resets on replay", () => {
		const run = createThreeFloorTraversalRun();
		run.floors[0] = createTestDungeonFloor({
			floorNumber: 1,
			rows: 4,
			cols: 4,
			room: { startRow: 1, endRow: 2, startCol: 1, endCol: 2 },
			downStair: run.floors[0].downStair,
		});
		const fresh = createGameState(run);
		let state: GameState = {
			...fresh,
			monsters: [
				{
					intent: { type: "idle" as const },
					id: "first-orc",
					kind: "orc",
					floorNumber: 1,
					coordinate: { row: 2, col: 1 },
					health: 1,
				},
			],
		};
		state = resolvePlayerActionWithHits(state, {
			type: "move",
			direction: "down",
		}).state;
		expect(state.progression.experience).toBe(10);
		expect(state.player).toEqual({ health: 12, maxHealth: 12 });
		expect(deriveAttributes(state.progression)).toMatchObject({
			strength: 10,
			dexterity: 12,
		});
		state = walk(state, { row: 1, col: 2 });
		state = walk(state, { row: 1, col: 3 });
		const cure = state.floorItems.find((entry) => entry.item.kind === "cure");
		if (!cure) throw new Error("Expected the objective on floor three.");
		state = walk(state, cure.coordinate);
		state = resolvePlayerAction(state, {
			type: "pickup",
			itemId: cure.item.id,
		}).state;
		state = walk(state, { row: 1, col: 1 });
		state = walk(state, { row: 1, col: 1 });
		state = walk(state, state.quest.entrance);
		expect(state.quest.victory).toMatchObject({
			level: 2,
			experience: 10,
			health: 12,
			monstersDefeated: 1,
		});
		expect(state.progression.experience).toBe(10);
		expect(resolvePlayerAction(state, { type: "wait" }).state).toBe(state);
		const replay = createGameState(run);
		expect(replay).toEqual(fresh);
		expect(replay.progression.experience).toBe(0);
		expect(deriveAttributes(replay.progression)).toMatchObject({
			strength: 10,
			dexterity: 10,
		});
	});

	it("places the objective on configured floor twenty without changing ordinary earlier loot", () => {
		const make = (floors: number) =>
			createGameState(
				connectDungeonFloors(
					generateDungeonRun(123, floors, COMPACT_TEST_CONFIGURATION),
				),
			);
		const short = make(5),
			long = make(20);
		// The Warden carrying the flame stands on floor twenty; no flame lies loose.
		expect(long.floorItems.some((x) => x.item.kind === "cure")).toBe(false);
		expect(
			long.monsters
				.filter((x) => x.kind === "ember-warden")
				.map((x) => x.floorNumber),
		).toEqual([20]);
		expect(
			long.floorItems.filter(
				(x) =>
					x.item.kind !== "cure" &&
					ITEM_DEFINITIONS[x.item.kind].type !== "spellbook" &&
					x.floorNumber <= 5,
			),
		).toEqual(
			short.floorItems.filter(
				(x) =>
					x.item.kind !== "cure" &&
					ITEM_DEFINITIONS[x.item.kind].type !== "spellbook",
			),
		);
		// Each dungeon's own Warden guards its final floor, and thieves roam the floors
		// before it, so both depend on depth.
		expect(
			long.monsters.filter(
				(x) => x.floorNumber <= 5 && x.kind !== "ember-warden" && !isThief(x),
			),
		).toEqual(
			short.monsters.filter((x) => x.kind !== "ember-warden" && !isThief(x)),
		);
	});
});
