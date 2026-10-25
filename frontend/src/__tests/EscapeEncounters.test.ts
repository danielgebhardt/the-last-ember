// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { createGameState } from "../domain/game/GameState";
import { generateEscapeEncounters } from "../domain/monsters/EscapeEncounters";
import { MONSTER_DEFINITIONS } from "../domain/monsters/Monster";
import {
	orthogonalDistance,
	protectedFloorLocations,
} from "../domain/monsters/MonsterLocations";
import { COMPACT_TEST_CONFIGURATION } from "./TestRunConfiguration";

const adventure = (size = 40, floors = 20) =>
	createGameState(
		connectDungeonFloors(
			generateDungeonRun(123, floors, {
				...COMPACT_TEST_CONFIGURATION,
				rows: size,
				cols: size,
			}),
		),
	);

describe("Deterministic return-floor encounters", () => {
	it("uses an independent seed stream without modifying the original population", () => {
		const state = adventure();
		const before = structuredClone(state);
		const actors = generateEscapeEncounters(state, 5);
		expect(actors).toHaveLength(4);
		expect(generateEscapeEncounters(state, 5)).toEqual(actors);
		expect(actors).not.toEqual(
			state.monsters.filter((actor) => actor.floorNumber === 5),
		);
		expect(state).toEqual(before);
		const shorter = adventure(40, 10);
		expect(generateEscapeEncounters(shorter, 5)).toEqual(actors);
	});
	it("reserves stair buffers, actors, objects and loot while drawing from the floor-20 pool", () => {
		const state = adventure();
		const actors = generateEscapeEncounters(state, 5);
		const protectedTiles = protectedFloorLocations(state.run, 5);
		const occupied = [
			...state.monsters,
			...state.objects,
			...state.floorItems,
		].filter((entry) => entry.floorNumber === 5);
		for (const actor of actors) {
			expect(
				Math.min(
					...protectedTiles.map((point) =>
						orthogonalDistance(point, actor.coordinate),
					),
				),
			).toBeLessThanOrEqual(20);
			expect(
				protectedTiles.every(
					(point) =>
						orthogonalDistance(point, actor.coordinate) >
						(MONSTER_DEFINITIONS[actor.kind].rangedAttackRange ?? 0),
				),
			).toBe(true);
			expect(
				protectedTiles.every(
					(point) => orthogonalDistance(point, actor.coordinate) > 3,
				),
			).toBe(true);
			expect(
				occupied.every(
					(entry) => orthogonalDistance(entry.coordinate, actor.coordinate) > 0,
				),
			).toBe(true);
			expect(state.monsters.some((existing) => existing.id === actor.id)).toBe(
				false,
			);
			expect(MONSTER_DEFINITIONS[actor.kind].minFloor).toBeLessThanOrEqual(20);
			expect(MONSTER_DEFINITIONS[actor.kind].maxFloor).toBeGreaterThanOrEqual(
				20,
			);
		}
		expect(
			new Set(
				actors.map(
					(actor) => `${actor.coordinate.row}:${actor.coordinate.col}`,
				),
			).size,
		).toBe(actors.length);
	});
	it("excludes the cure floor and reduces encounters when survivors or space fill the floor", () => {
		const state = adventure();
		expect(generateEscapeEncounters(state, 20)).toEqual([]);
		expect(generateEscapeEncounters(state, 0)).toEqual([]);
		const small = adventure(10, 5);
		expect(generateEscapeEncounters(small, 1).length).toBeLessThanOrEqual(1);
		const survivors = state.monsters.filter((actor) => actor.floorNumber === 5);
		const crowded = {
			...state,
			monsters: Array.from({ length: 16 }, (_, index) => ({
				...survivors[0],
				id: `5:${index + 1}`,
			})),
		};
		expect(generateEscapeEncounters(crowded, 5)).toEqual([]);
	});
});
