// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { MONSTER_VISUALS } from "../components/monsters/MonsterVisuals";
import {
	connectDungeonFloors,
	generateDungeonRun,
	type MovementDirection,
} from "../domain/dungeon/DungeonRun";
import type { Coordinate, Dungeon } from "../domain/dungeon/DungeonTypes";
import { updateExploration } from "../domain/dungeon/Exploration";
import { DEFAULT_FOG_CONFIGURATION } from "../domain/dungeon/RunConfiguration";
import { FLOOR } from "../domain/dungeon/Tiles";
import { createGameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import {
	eligibleMonsterKinds,
	MONSTER_DEFINITIONS,
	type MonsterKind,
	selectMonsterKind,
} from "../domain/monsters/Monster";
import {
	orthogonalDistance,
	protectedSpawnLocations,
} from "../domain/monsters/MonsterLocations";
import * as MonsterPlacement from "../domain/monsters/MonsterPlacement";
import {
	afflictionSourceKinds,
	spawnRunMonsters,
} from "../domain/monsters/MonsterPlacement";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { COMPACT_TEST_CONFIGURATION } from "./TestRunConfiguration";

const configuration = { ...COMPACT_TEST_CONFIGURATION, rows: 40, cols: 40 };
const generatedRun = (seed: number, floorCount = 5) =>
	connectDungeonFloors(generateDungeonRun(seed, floorCount, configuration));

// Return a walkable neighbor and the step that enters the requested tile.
const approachTo = (terrain: Dungeon, tile: Coordinate) => {
	const approaches: { coordinate: Coordinate; direction: MovementDirection }[] =
		[
			{ coordinate: { row: tile.row - 1, col: tile.col }, direction: "down" },
			{ coordinate: { row: tile.row + 1, col: tile.col }, direction: "up" },
			{ coordinate: { row: tile.row, col: tile.col - 1 }, direction: "right" },
			{ coordinate: { row: tile.row, col: tile.col + 1 }, direction: "left" },
		];
	const approach = approaches.find(
		({ coordinate: { row, col } }) => terrain[row]?.[col] === FLOOR,
	);
	if (!approach) throw new Error("Expected a walkable approach.");
	return approach;
};

describe("Mixed tactical populations", () => {
	it("selects each eligible role at the midpoint of its weighted interval", () => {
		const kinds = eligibleMonsterKinds(4);
		const total = kinds.reduce(
			(sum, kind) => sum + MONSTER_DEFINITIONS[kind].spawnWeight,
			0,
		);
		let preceding = 0;
		for (const kind of kinds) {
			const weight = MONSTER_DEFINITIONS[kind].spawnWeight;
			expect(selectMonsterKind(4, () => (preceding + weight / 2) / total)).toBe(
				kind,
			);
			preceding += weight;
		}
	});

	it.each([0, 123, 987])(
		"reproduces seed %i's mixed actors and preserves earlier floors at depth 20",
		(seed) => {
			const run = generatedRun(seed);
			const monsters = spawnRunMonsters(run);
			expect(spawnRunMonsters(structuredClone(run))).toEqual(monsters);
			expect(
				spawnRunMonsters(generatedRun(seed, 20)).filter(
					({ floorNumber }) => floorNumber <= 5,
				),
			).toEqual(monsters);
			expect(new Set(monsters.map(({ kind }) => kind)).size).toBeGreaterThan(1);
			for (const monster of monsters) {
				// Affliction carriers enter only through their separate sparse budget.
				expect([
					...eligibleMonsterKinds(monster.floorNumber),
					...afflictionSourceKinds(monster.floorNumber),
				]).toContain(monster.kind);
				expect(monster.health).toBe(
					MONSTER_DEFINITIONS[monster.kind].maxHealth,
				);
				expect(monster.intent).toEqual({ type: "idle" });
			}
		},
	);

	it("keeps mixed spawns capped, unique and outside protected entry buffers through floor 20", () => {
		const run = generatedRun(123, 20);
		const monsters = spawnRunMonsters(run);
		expect(new Set(monsters.map(({ id }) => id)).size).toBe(monsters.length);
		expect(
			new Set(
				monsters.map(
					({ floorNumber, coordinate }) =>
						`${floorNumber}:${coordinate.row}:${coordinate.col}`,
				),
			).size,
		).toBe(monsters.length);
		for (const floor of run.floors) {
			const population = monsters.filter(
				({ floorNumber }) => floorNumber === floor.floorNumber,
			);
			expect(population).toHaveLength(12);
			const protectedTiles = protectedSpawnLocations(run, floor.floorNumber);
			if (floor.floorNumber === 1) protectedTiles.push(run.playerCoordinate);
			for (const monster of population) {
				expect(
					floor.terrain[monster.coordinate.row][monster.coordinate.col],
				).toBe(FLOOR);
				for (const tile of protectedTiles)
					expect(orthogonalDistance(tile, monster.coordinate)).toBeGreaterThan(
						1,
					);
			}
		}
	});

	it("gives every kind a named visual and respects its ordinary-spawn opt-out", () => {
		const kinds = Object.keys(MONSTER_DEFINITIONS) as MonsterKind[];
		expect(new Set(Object.keys(MONSTER_VISUALS))).toEqual(new Set(kinds));
		for (const kind of kinds) {
			expect(MONSTER_VISUALS[kind].label).toBe(MONSTER_DEFINITIONS[kind].name);
			expect(MONSTER_VISUALS[kind].icon).toBeDefined();
			expect(
				Array.from({ length: 20 }, (_, index) =>
					eligibleMonsterKinds(index + 1),
				).some((pool) => pool.includes(kind)),
			).toBe(MONSTER_DEFINITIONS[kind].spawnEnabled !== false);
		}
	});

	it("retains the played mixture through saving and a floor revisit without respawning", () => {
		const state = createGameState(generatedRun(123));
		// Assign the two required roles to seeded, legal inactive-floor positions.
		// This continuation test must not depend on a content pool selecting them.
		const brutePosition = state.monsters.find(
			(actor) => actor.floorNumber === 4,
		);
		const archerPosition = state.monsters.find(
			(actor) => actor.floorNumber === 2,
		);
		const defeated = state.monsters.find((actor) => actor.floorNumber === 1);
		if (!brutePosition || !archerPosition || !defeated)
			throw new Error("Roomy fixture needs actors on floors 1, 2 and 4.");
		const brute = {
			...brutePosition,
			kind: "dungeon-brute" as const,
			health: 10,
		};
		const archer = {
			...archerPosition,
			kind: "goblin-archer" as const,
			health: 5,
		};
		state.monsters = state.monsters.map((actor) =>
			actor.id === brute.id ? brute : actor.id === archer.id ? archer : actor,
		);

		const floor = state.run.floors[3];
		const target = approachTo(floor.terrain, brute.coordinate).coordinate;
		state.monsters = state.monsters
			.filter(({ id }) => id !== defeated.id)
			.map((monster) =>
				monster.id === brute.id
					? {
							...monster,
							health: 3,
							intent: { type: "preparing-attack", target },
						}
					: monster.id === archer.id
						? { ...monster, health: 2 }
						: monster,
			);
		// Wait on floor 1 while the wounded archer and prepared brute are inactive.
		const paused = resolvePlayerAction(state, { type: "wait" }).state;
		expect(paused.monsters.find(({ id }) => id === brute.id)).toEqual(
			state.monsters.find(({ id }) => id === brute.id),
		);
		const document = createSaveDocument(
			paused,
			updateExploration(paused.run, DEFAULT_FOG_CONFIGURATION.radius),
			configuration,
			DEFAULT_FOG_CONFIGURATION,
		);
		const parsed = parseSave(serializeSave(document));
		if (!parsed.ok) throw new Error(parsed.error);
		const sampler = vi.spyOn(MonsterPlacement, "spawnRunMonsters");
		try {
			const restored = restoreSave(parsed.value).state;
			expect(restored).toEqual(paused);
			expect(restored.monsters.some(({ id }) => id === defeated.id)).toBe(
				false,
			);
			expect(restored.monsters.find(({ id }) => id === archer.id)?.health).toBe(
				2,
			);
			expect(restored.monsters.find(({ id }) => id === brute.id)).toMatchObject(
				{ health: 3, intent: { type: "preparing-attack", target } },
			);
			// Enter floor 4 through its actual reciprocal link. The paused brute
			// resolves its old target; it is not recreated at full health.
			const upperStair = restored.run.floors[4].upStair;
			if (!upperStair) throw new Error("Floor 5 needs an up stair.");
			const entry = approachTo(
				restored.run.floors[4].terrain,
				upperStair.coordinate,
			);
			const returned = resolvePlayerAction(
				{
					...restored,
					run: {
						...restored.run,
						activeFloor: 5,
						playerCoordinate: entry.coordinate,
					},
				},
				{
					type: "move",
					direction: entry.direction,
				},
			).state;
			expect(returned.run.activeFloor).toBe(4);
			expect(returned.monsters.find(({ id }) => id === brute.id)).toMatchObject(
				{
					kind: "dungeon-brute",
					health: 3,
					coordinate: brute.coordinate,
					intent: { type: "idle" },
				},
			);
			expect(returned.monsters.find(({ id }) => id === archer.id)?.health).toBe(
				2,
			);
			expect(returned.monsters.map(({ id }) => id)).toEqual(
				paused.monsters.map(({ id }) => id),
			);
			expect(sampler).not.toHaveBeenCalled();
		} finally {
			sampler.mockRestore();
		}
	});
});
