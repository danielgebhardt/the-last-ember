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
import { activateEscapeFloor } from "../domain/game/Escape";
import { createGameState, type GameState } from "../domain/game/GameState";
import { isWarden } from "../domain/monsters/EmberWarden";
import { isThief } from "../domain/monsters/TreasureThief";
import {
	createSaveDocument,
	parseSave,
	serializeSave,
} from "../domain/saves/SaveFormat";

describe("Complete return population geometry", () => {
	it.each([10, 25, 40])(
		"activates each %ix20-floor return once and remains a valid saved adventure",
		(size) => {
			const configuration = {
				...DEFAULT_RUN_CONFIGURATION,
				rows: size,
				cols: size,
			};
			const fresh = createGameState(
				connectDungeonFloors(generateDungeonRun(123, 20, configuration)),
			);
			// The Warden fell and its flame was claimed.
			let state: GameState = {
				...fresh,
				monsters: fresh.monsters.filter((actor) => !isWarden(actor)),
				quest: { ...fresh.quest, cureRecovered: true },
				floorItems: fresh.floorItems.filter(
					(entry) => entry.item.kind !== "cure",
				),
				escape: { startedTurn: 0, activatedFloors: [] },
			};
			for (let floor = 19; floor >= 1; floor--) {
				const arrival = state.run.floors[floor - 1].downStair?.coordinate;
				if (!arrival) throw new Error("Expected return stair");
				state = activateEscapeFloor(
					{
						...state,
						run: {
							...state.run,
							activeFloor: floor,
							playerCoordinate: arrival,
						},
					},
					floor + 1,
				);
				expect(state.run.floors).toBe(fresh.run.floors);
				expect(
					// Thieves never fight, so they sit outside the living cap.
					state.monsters.filter(
						(actor) => actor.floorNumber === floor && !isThief(actor),
					).length,
				).toBeLessThanOrEqual(16);
				expect(activateEscapeFloor(state, floor + 1)).toBe(state);
			}
			expect(state.escape?.activatedFloors).toHaveLength(19);
			expect(state.monsters.length - fresh.monsters.length).toBeLessThanOrEqual(
				76,
			);
			const document = createSaveDocument(
				state,
				updateExploration(state.run, 8),
				configuration,
				DEFAULT_FOG_CONFIGURATION,
			);
			const parsed = parseSave(serializeSave(document));
			if (!parsed.ok) throw new Error(parsed.error);
			expect(parsed.value.state.monsters).toEqual(state.monsters);
		},
	);
});
