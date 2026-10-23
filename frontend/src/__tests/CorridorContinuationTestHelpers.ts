import { connectDungeonFloors } from "../domain/dungeon/DungeonRun";
import { updateExploration } from "../domain/dungeon/Exploration";
import {
	DEFAULT_FOG_CONFIGURATION,
	DEFAULT_RUN_CONFIGURATION,
} from "../domain/dungeon/RunConfiguration";
import { createGameState } from "../domain/game/GameState";
import { navigationRun } from "../domain/objects/NavigationTerrain";
import {
	createSaveDocument,
	parseSave,
	type RestoredAdventure,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { withFlameOnFloor } from "./SaveTestHelpers";
import { createTestDungeonFloor } from "./testhelpers";

// Valid five-floor save geometry, with a long, quiet route on floor 2. The
// hidden pursuer’s memory expires at a protected stair, proving that running
// still advances ordinary enemy phases.
export const corridorContinuationAdventure = (
	seed = 123,
): RestoredAdventure => {
	const configuration = {
		...DEFAULT_RUN_CONFIGURATION,
		rows: 15,
		cols: 24,
		floorCount: 5,
	};
	const fog = { ...DEFAULT_FOG_CONFIGURATION, radius: 4 };
	const run = connectDungeonFloors({
		seed,
		activeFloor: 2,
		playerCoordinate: { row: 7, col: 4 },
		floors: Array.from({ length: 5 }, (_, i) =>
			createTestDungeonFloor({
				floorNumber: i + 1,
				rows: 15,
				cols: 24,
				room: { startRow: 7, endRow: 7, startCol: 1, endCol: 22 },
			}),
		),
	});
	const fresh = withFlameOnFloor(createGameState(run));
	const state = {
		...fresh,
		objects: [],
		floorItems: fresh.floorItems.filter((x) => x.item.kind === "cure"),
		turn: 28,
		mana: 0,
		player: { ...fresh.player, health: 5 },
		monsters: [
			{
				id: "2:1",
				kind: "skeleton" as const,
				floorNumber: 2,
				coordinate: { row: 7, col: 18 },
				health: 8,
				intent: { type: "idle" as const },
				lastDamagedTurn: null,
				awareness: {
					type: "pursuing" as const,
					target: { row: 7, col: 4 },
					remaining: 3,
					blocked: 0,
				},
			},
			{
				id: "3:1",
				kind: "skeleton" as const,
				floorNumber: 3,
				coordinate: { row: 7, col: 18 },
				health: 8,
				intent: { type: "idle" as const },
				lastDamagedTurn: null,
			},
		],
		effects: [
			{
				actorId: "player",
				floorNumber: null,
				kind: "renewing" as const,
				remaining: 4,
			},
			{
				actorId: "3:1",
				floorNumber: 3,
				kind: "poisoned" as const,
				remaining: 3,
			},
		],
	};
	const parsed = parseSave(
		serializeSave(
			createSaveDocument(
				state,
				updateExploration(navigationRun(state), fog.radius),
				configuration,
				fog,
			),
		),
	);
	if (!parsed.ok)
		throw new Error(`Corridor continuation fixture: ${parsed.error}`);
	return restoreSave(parsed.value);
};
