// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { createGameState } from "../domain/game/GameState";
import { spawnRunQuestItems } from "../domain/items/CurePlacement";
import { eligibleLootKinds } from "../domain/items/Item";
import { spawnRunItems } from "../domain/items/ItemPlacement";
import { isWarden } from "../domain/monsters/EmberWarden";
import { spawnRunMonsters } from "../domain/monsters/MonsterPlacement";
import { COMPACT_TEST_CONFIGURATION } from "./TestRunConfiguration";
import { createThreeFloorTraversalRun, findFloorPath } from "./testhelpers";

describe("Unique seeded cure placement", () => {
	it("anchors one reachable flame tile on the final floor, carried by its Warden rather than placed", () => {
		const run = connectDungeonFloors(
			generateDungeonRun(0, 5, COMPACT_TEST_CONFIGURATION),
		);
		const state = createGameState(run);
		// The Warden carries the flame, so nothing lies on the floor until it falls.
		expect(state.floorItems.some((x) => x.item.kind === "cure")).toBe(false);
		expect(state.monsters.filter(isWarden)).toHaveLength(1);
		const monsters = spawnRunMonsters(run);
		const cures = spawnRunQuestItems(
			run,
			monsters,
			spawnRunItems(run, monsters),
		);
		expect(cures).toHaveLength(1);
		const cure = cures[0];
		expect(cure.floorNumber).toBe(5);
		const floor = run.floors[4];
		const entry = floor.upStair?.coordinate;
		if (!entry) throw new Error("Fixture needs an entry stair.");
		expect(
			findFloorPath(floor.terrain, entry, cure.coordinate).length,
		).toBeGreaterThan(0);
		expect(
			state.floorItems.filter(
				(x) =>
					x.floorNumber === 5 &&
					x.coordinate.row === cure.coordinate.row &&
					x.coordinate.col === cure.coordinate.col,
			),
		).toHaveLength(0);
		expect(
			state.monsters.some(
				(x) =>
					x.floorNumber === 5 &&
					x.coordinate.row === cure.coordinate.row &&
					x.coordinate.col === cure.coordinate.col,
			),
		).toBe(false);
		expect(createGameState(run)).toEqual(state);
	});
	it("keeps the cure out of all random loot pools", () => {
		for (const source of ["found", "drop"] as const)
			for (const floor of [1, 5, 20])
				expect(eligibleLootKinds(floor, source)).not.toContain("cure");
	});
	it("uses the reachable entry when a tiny single-floor fixture has no separate tile", () => {
		const run = createThreeFloorTraversalRun();
		run.floors = run.floors.slice(0, 1);
		run.floors[0].rooms = [{ startRow: 1, endRow: 1, startCol: 1, endCol: 1 }];
		const cure = spawnRunQuestItems(run, [], [])[0];
		expect(cure.coordinate).toEqual({ row: 1, col: 1 });
	});
});
