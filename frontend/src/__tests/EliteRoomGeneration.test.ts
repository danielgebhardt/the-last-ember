// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { updateExploration } from "../domain/dungeon/Exploration";
import {
	DEFAULT_FOG_CONFIGURATION,
	DEFAULT_RUN_CONFIGURATION,
} from "../domain/dungeon/RunConfiguration";
import { createGameState } from "../domain/game/GameState";
import { generateEscapeEncounters } from "../domain/monsters/EscapeEncounters";
import {
	coordinateKey,
	protectedFloorLocations,
} from "../domain/monsters/MonsterLocations";
import { navigationRun } from "../domain/objects/NavigationTerrain";
import {
	findOptionalEliteRooms,
	sealedTiles,
} from "../domain/objects/OptionalEliteRooms";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";

describe("Generated optional elite rooms", () => {
	it.each([10, 25, 40])(
		"keeps objectives outside sealed rooms on %ix20 maps",
		(size) => {
			const config = { ...DEFAULT_RUN_CONFIGURATION, rows: size, cols: size };
			const make = () =>
				createGameState(
					connectDungeonFloors(generateDungeonRun(123, 20, config)),
				);
			const state = make();
			expect(make()).toEqual(state);
			for (const gate of state.objects.filter((o) => o.kind === "elite-door")) {
				const floor = state.run.floors[gate.floorNumber - 1];
				const required = protectedFloorLocations(state.run, gate.floorNumber);
				required.push(
					...state.floorItems
						.filter(
							(i) =>
								i.floorNumber === gate.floorNumber && i.item.kind === "cure",
						)
						.map((i) => i.coordinate),
				);
				expect(
					findOptionalEliteRooms(floor, required).some(
						(c) => coordinateKey(c.gate) === coordinateKey(gate.coordinate),
					),
				).toBe(true);
				expect(
					navigationRun(state).floors[gate.floorNumber - 1].terrain[
						gate.coordinate.row
					][gate.coordinate.col],
				).toBe("#");
				const sealed = sealedTiles(floor, state.objects);
				expect(
					state.monsters.filter(
						(m) =>
							m.floorNumber === gate.floorNumber && m.kind === "iron-champion",
					),
				).toHaveLength(1);
				expect(
					generateEscapeEncounters(state, gate.floorNumber).every(
						(m) => !sealed.has(coordinateKey(m.coordinate)),
					),
				).toBe(true);
			}
			if (size === 40)
				expect(state.objects.some((o) => o.kind === "elite-door")).toBe(true);
			const document = createSaveDocument(
				state,
				updateExploration(navigationRun(state), 8),
				config,
				DEFAULT_FOG_CONFIGURATION,
			);
			const parsed = parseSave(serializeSave(document));
			if (!parsed.ok) throw new Error(parsed.error);
			expect(restoreSave(parsed.value).state).toEqual(state);
		},
		15000,
	);
});
