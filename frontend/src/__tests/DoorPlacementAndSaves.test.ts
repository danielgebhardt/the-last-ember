// @vitest-environment node

import { expect, it } from "vitest";
import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { updateExploration } from "../domain/dungeon/Exploration";
import { DEFAULT_RUN_CONFIGURATION } from "../domain/dungeon/RunConfiguration";
import { createGameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { protectedFloorLocations } from "../domain/monsters/MonsterLocations";
import { navigationRun } from "../domain/objects/NavigationTerrain";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { savedAdventure } from "./SaveTestHelpers";

it("seeds doors in straight passage tiles without occupying actors, loot or protected stairs", () => {
	const run = connectDungeonFloors(
		generateDungeonRun(7, 5, DEFAULT_RUN_CONFIGURATION),
	);
	const first = createGameState(run);
	expect(createGameState(run).objects).toEqual(first.objects);
	expect(
		first.objects.filter((object) => object.kind === "door").length,
	).toBeGreaterThan(0);
	for (const door of first.objects.filter((object) => object.kind === "door")) {
		expect(protectedFloorLocations(run, door.floorNumber)).not.toContainEqual(
			door.coordinate,
		);
		expect(
			first.monsters.some(
				(actor) =>
					actor.floorNumber === door.floorNumber &&
					actor.coordinate.row === door.coordinate.row &&
					actor.coordinate.col === door.coordinate.col,
			),
		).toBe(false);
		expect(
			first.floorItems.some(
				(item) =>
					item.floorNumber === door.floorNumber &&
					item.coordinate.row === door.coordinate.row &&
					item.coordinate.col === door.coordinate.col,
			),
		).toBe(false);
	}
	for (const floor of run.floors)
		expect(
			first.objects.filter(
				(door) =>
					door.kind === "door" && door.floorNumber === floor.floorNumber,
			).length,
		).toBeLessThanOrEqual(2);
});
it("preserves an opened door through saving and restores closed-door sight from the object state", () => {
	const original = restoreSave(savedAdventure());
	const door = {
		id: "floor:1:object:door:1",
		kind: "door" as const,
		floorNumber: 1,
		coordinate: { row: 7, col: 8 },
		activated: false,
	};
	const state = { ...original.state, monsters: [], objects: [door] };
	const doc = createSaveDocument(
		state,
		updateExploration(navigationRun(state), original.fog.radius),
		original.configuration,
		original.fog,
	);
	const parsed = parseSave(serializeSave(doc));
	expect(parsed.ok).toBe(true);
	if (!parsed.ok) throw new Error(parsed.error);
	const closed = restoreSave(parsed.value);
	expect(closed.exploration.visible[7][9]).toBe(false);
	const opened = resolvePlayerAction(closed.state, {
		type: "interact",
		objectId: door.id,
	}).state;
	const resumed = parseSave(
		serializeSave(
			createSaveDocument(
				opened,
				closed.exploration,
				original.configuration,
				original.fog,
			),
		),
	);
	if (!resumed.ok) throw new Error(resumed.error);
	expect(restoreSave(resumed.value).state.objects[0].activated).toBe(true);
	expect(restoreSave(resumed.value).exploration.visible[7][9]).toBe(true);
});
