// @vitest-environment node
import { expect, it } from "vitest";
import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { DEFAULT_RUN_CONFIGURATION } from "../domain/dungeon/RunConfiguration";
import { createGameState } from "../domain/game/GameState";
import { eligibleLootKinds, ITEM_DEFINITIONS } from "../domain/items/Item";
import { spawnRunItems } from "../domain/items/ItemPlacement";
import { protectedSpawnLocations } from "../domain/monsters/MonsterLocations";

it("places each selected book once within its floor band without changing ordinary generation", () => {
	const run = connectDungeonFloors(
		generateDungeonRun(123, 20, DEFAULT_RUN_CONFIGURATION),
	);
	const state = createGameState(run);
	const books = state.floorItems.filter(
		(entry) => ITEM_DEFINITIONS[entry.item.kind].type === "spellbook",
	);
	const eligible = Object.values(ITEM_DEFINITIONS).filter(
		(definition) =>
			definition.type === "spellbook" &&
			definition.minFloor <= run.floors.length,
	).length;
	expect(books.length).toBeGreaterThanOrEqual(Math.min(3, eligible));
	expect(books.length).toBeLessThanOrEqual(Math.min(6, eligible));
	expect(createGameState(run)).toEqual(state);
	expect(
		state.floorItems.filter(
			(entry) =>
				!books.includes(entry) &&
				entry.item.kind !== "cure" &&
				entry.item.kind !== "exit-scroll",
		),
	).toEqual(
		spawnRunItems(
			run,
			state.monsters.filter((actor) => actor.kind !== "iron-champion"),
			undefined,
			state.dungeonRemedies,
		),
	);
	expect(eligibleLootKinds(1, "found")).not.toContain("book-ember-bolt");
	for (const entry of books) {
		const definition = ITEM_DEFINITIONS[entry.item.kind];
		expect(entry.floorNumber).toBeGreaterThanOrEqual(definition.minFloor);
		expect(entry.floorNumber).toBeLessThanOrEqual(definition.maxFloor);
		expect(
			run.floors[entry.floorNumber - 1].terrain[entry.coordinate.row][
				entry.coordinate.col
			],
		).toBe(".");
		expect(protectedSpawnLocations(run, entry.floorNumber)).not.toContainEqual(
			entry.coordinate,
		);
		expect(
			state.monsters.some(
				(m) =>
					m.floorNumber === entry.floorNumber &&
					m.coordinate.row === entry.coordinate.row &&
					m.coordinate.col === entry.coordinate.col,
			),
		).toBe(false);
		expect(
			state.floorItems.filter(
				(item) =>
					item.floorNumber === entry.floorNumber &&
					item.coordinate.row === entry.coordinate.row &&
					item.coordinate.col === entry.coordinate.col,
			),
		).toHaveLength(1);
	}
});
it("bounds selected books to the currently implemented eligible pool on a short run", () => {
	const run = connectDungeonFloors(
		generateDungeonRun(8, 5, {
			...DEFAULT_RUN_CONFIGURATION,
			rows: 15,
			cols: 15,
		}),
	);
	const books = createGameState(run).floorItems.filter(
		(entry) => ITEM_DEFINITIONS[entry.item.kind].type === "spellbook",
	);
	const eligible = Object.values(ITEM_DEFINITIONS).filter(
		(definition) =>
			definition.type === "spellbook" &&
			definition.minFloor <= run.floors.length,
	).length;
	expect(books.length).toBeGreaterThanOrEqual(Math.min(3, eligible));
	expect(books.length).toBeLessThanOrEqual(Math.min(6, eligible));
	expect(new Set(books.map((entry) => entry.item.kind)).size).toBe(
		books.length,
	);
});
