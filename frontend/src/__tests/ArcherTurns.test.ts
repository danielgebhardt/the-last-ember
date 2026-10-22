// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { Coordinate } from "../domain/dungeon/DungeonTypes";
import { WALL } from "../domain/dungeon/Tiles";
import type { AttackRollSource } from "../domain/game/CombatRandomness";
import { createGameState, type GameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { createEquipment } from "../domain/items/Equipment";
import { createMonsterDrop } from "../domain/items/MonsterDrops";
import type { MonsterKind } from "../domain/monsters/Monster";
import { createTestDungeonFloor } from "./testhelpers";

const encounter = (coordinate: Coordinate = { row: 4, col: 6 }): GameState => ({
	...createGameState({
		seed: 123,
		activeFloor: 2,
		playerCoordinate: { row: 4, col: 2 },
		floors: [1, 2].map((floorNumber) =>
			createTestDungeonFloor({
				floorNumber,
				rows: 9,
				cols: 11,
				room: { startRow: 1, endRow: 7, startCol: 1, endCol: 9 },
			}),
		),
	}),
	floorItems: [],
	monsters: [
		{
			id: "2:1",
			kind: "goblin-archer" as MonsterKind,
			floorNumber: 2,
			coordinate,
			health: 5,
			intent: { type: "idle" },
		},
	],
});
const highRolls: AttackRollSource = () => ({
	d20: () => 20,
	damage: (_min, max) => max,
});
const wait = (state: GameState, rolls: AttackRollSource = highRolls) =>
	resolvePlayerAction(state, { type: "wait" }, rolls).state;

describe("Goblin archer turns", () => {
	it.each([
		{ name: "minimum range 2", coordinate: { row: 4, col: 4 } },
		{ name: "maximum range 4", coordinate: { row: 4, col: 6 } },
		{ name: "diagonal Manhattan range 2", coordinate: { row: 5, col: 3 } },
		{ name: "diagonal Manhattan range 4", coordinate: { row: 6, col: 4 } },
	])(
		"shoots at $name without moving or taking a second action",
		({ coordinate }) => {
			const before = encounter(coordinate);
			const snapshot = structuredClone(before);
			const rolls = vi.fn(highRolls);
			const after = wait(before, rolls);
			expect(after.player.health).toBe(8);
			expect(after.monsters).toMatchObject(before.monsters);
			expect(rolls).toHaveBeenCalledTimes(1);
			expect(after.activityHistory.entries.map(({ event }) => event)).toEqual([
				{
					type: "monster-shot-hit",
					turn: 1,
					monster: "goblin-archer",
					damage: 2,
				},
			]);
			expect(before).toEqual(snapshot);
		},
	);

	it("uses melee rather than a shot when adjacent", () => {
		const before = encounter({ row: 4, col: 3 });
		const after = wait(before);
		expect(after.monsters).toMatchObject(before.monsters);
		expect(after.activityHistory.entries[0].event).toEqual({
			type: "monster-hit",
			turn: 1,
			monster: "goblin-archer",
			damage: 2,
		});
	});

	it.each([
		{ name: "horizontal", start: { row: 4, col: 7 }, step: { row: 4, col: 6 } },
		{ name: "diagonal", start: { row: 6, col: 5 }, step: { row: 5, col: 5 } },
	])(
		"pursues one tile at $name Manhattan range 5, then shoots next turn",
		({ start, step }) => {
			const before = encounter(start);
			const rolls = vi.fn(highRolls);
			const moved = wait(before, rolls);
			expect(moved.monsters[0].coordinate).toEqual(step);
			expect(moved.player.health).toBe(10);
			expect(rolls).not.toHaveBeenCalled();
			const shot = wait(moved, rolls);
			expect(shot.monsters).toMatchObject(moved.monsters);
			expect(shot.player.health).toBe(8);
			expect(rolls).toHaveBeenCalledTimes(1);
		},
	);

	it.each(["another actor", "protected stair"])(
		"pursuit avoids %s",
		(obstacle) => {
			const before = encounter({ row: 4, col: 7 });
			const blocked = { row: 4, col: 6 };
			if (obstacle === "another actor") {
				before.monsters = [
					...before.monsters,
					{
						...before.monsters[0],
						id: "2:2",
						kind: "goblin",
						coordinate: blocked,
						health: 4,
					},
				];
			} else {
				before.run.floors[1].upStair = {
					coordinate: blocked,
					destinationFloor: 1,
					arrivalCoordinate: { row: 1, col: 1 },
				};
			}
			const after = wait(before);
			expect(after.monsters[0].coordinate).toEqual({ row: 3, col: 7 });
			expect(after.player.health).toBe(10);
		},
	);

	it.each([
		"wall",
		"closed diagonal corner",
		"outside detection",
		"inactive floor",
	])("does not shoot or pursue with %s", (obstacle) => {
		const before = encounter();
		const terrain = before.run.floors[1].terrain.map((row) => [...row]);
		before.run.floors[1] = { ...before.run.floors[1], terrain };
		if (obstacle === "wall") terrain[4][4] = WALL;
		if (obstacle === "closed diagonal corner") {
			before.monsters = [
				{ ...before.monsters[0], coordinate: { row: 5, col: 3 } },
			];
			terrain[4][3] = WALL;
			terrain[5][2] = WALL;
		}
		if (obstacle === "outside detection")
			before.monsters = [
				{ ...before.monsters[0], coordinate: { row: 4, col: 9 } },
			];
		if (obstacle === "inactive floor")
			before.monsters = [{ ...before.monsters[0], id: "1:1", floorNumber: 1 }];
		const rolls = vi.fn(highRolls);
		const after = wait(before, rolls);
		expect(after.monsters).toMatchObject(before.monsters);
		expect(after.player.health).toBe(10);
		expect(after.activityHistory.entries).toEqual([]);
		expect(rolls).not.toHaveBeenCalled();
	});

	it("ignores creatures between shooter and player and resolves actors in spawn order", () => {
		const before = encounter();
		const blocker = {
			...before.monsters[0],
			id: "2:2",
			kind: "goblin" as const,
			coordinate: { row: 4, col: 3 },
			health: 4,
		};
		before.monsters = [blocker, before.monsters[0]];
		const after = wait(before);
		expect(
			after.activityHistory.entries.map(({ event }) => event.type),
		).toEqual(["monster-shot-hit", "monster-hit"]);
		expect(after.player.health).toBe(7);
	});

	it("applies evasion to shots without rolling damage on a miss", () => {
		const before = encounter();
		// Level 4 (Dexterity 14) is the first evasion step: a 5 misses.
		before.progression = { experience: 60 };
		const damage = vi.fn(() => 3);
		const after = wait(before, () => ({ d20: () => 5, damage }));
		expect(after.player.health).toBe(10);
		expect(damage).not.toHaveBeenCalled();
		expect(after.activityHistory.entries[0].event).toEqual({
			type: "monster-shot-missed",
			turn: 1,
			monster: "goblin-archer",
		});
	});

	it("uses the bounded damage range and subtracts armor once, with at least one damage", () => {
		const before = encounter();
		before.equipment = createEquipment(
			null,
			{ id: "shield", kind: "wooden-shield" },
			{ id: "chest", kind: "chain-armor" },
			{ id: "head", kind: "iron-helmet" },
		);
		const damage = vi.fn((_min: number, max: number) => max);
		const after = wait(before, () => ({ d20: () => 20, damage }));
		expect(damage).toHaveBeenCalledExactlyOnceWith(1, 3);
		expect(after.player.health).toBe(9);
	});

	it("uses a stable shot context independent of other actors and global randomness", () => {
		const before = encounter();
		const original = structuredClone(before);
		const random = vi.spyOn(Math, "random").mockImplementation(() => {
			throw new Error("Global RNG used");
		});
		try {
			const alone = resolvePlayerAction(before, { type: "wait" }).state;
			before.monsters = [
				{ ...before.monsters[0], id: "2:2", coordinate: { row: 3, col: 2 } },
				before.monsters[0],
			];
			const together = resolvePlayerAction(before, { type: "wait" }).state;
			expect(together.activityHistory.entries[0].event).toEqual(
				alone.activityHistory.entries[0].event,
			);
			expect(resolvePlayerAction(original, { type: "wait" }).state).toEqual(
				alone,
			);
			const rolls = vi.fn(highRolls);
			wait(original, rolls);
			expect(rolls).toHaveBeenCalledWith({
				seed: 123,
				floorNumber: 2,
				turn: 1,
				attackerId: "2:1:shot",
				targetId: "player",
			});
		} finally {
			random.mockRestore();
		}
	});

	it("stops after a fatal shot without rolling for later actors", () => {
		const before = encounter();
		before.player = { health: 1, maxHealth: 10 };
		before.monsters = [
			...before.monsters,
			{ ...before.monsters[0], id: "2:2" },
		];
		const rolls = vi.fn(highRolls);
		const after = wait(before, rolls);
		expect(after.player.health).toBe(0);
		expect(rolls).toHaveBeenCalledTimes(1);
		expect(
			after.activityHistory.entries.map(({ event }) => event.type),
		).toEqual(["monster-shot-hit", "player-died"]);
	});

	it("awards one kill reward/drop through the existing path and cancels retaliation", () => {
		const before = encounter({ row: 4, col: 3 });
		// Seed 0 drops loot for actor 2:1, exercising the actual transfer path.
		before.run = { ...before.run, seed: 0 };
		before.monsters = [{ ...before.monsters[0], health: 1 }];
		const expectedDrop = createMonsterDrop(before.run.seed, before.monsters[0]);
		expect(expectedDrop).toBeDefined();
		const killed = resolvePlayerAction(
			before,
			{ type: "move", direction: "right" },
			highRolls,
		).state;
		expect(killed.monsters).toEqual([]);
		expect(killed.progression.experience).toBe(6);
		expect(killed.monstersDefeated).toBe(1);
		expect(killed.player.health).toBe(10);
		expect(killed.floorItems).toEqual([expectedDrop]);
		const later = wait(killed);
		expect(later.progression).toBe(killed.progression);
		expect(later.floorItems).toBe(killed.floorItems);
	});
});
