// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { updateExploration } from "../domain/dungeon/Exploration";
import { DEFAULT_FOG_CONFIGURATION } from "../domain/dungeon/RunConfiguration";
import { activateEscapeFloor } from "../domain/game/Escape";
import { createGameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { isWarden } from "../domain/monsters/EmberWarden";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { COMPACT_TEST_CONFIGURATION } from "./TestRunConfiguration";

describe("Resuming an awakened return floor", () => {
	it("keeps actors and phase progress and cannot reactivate after reload", () => {
		const configuration = { ...COMPACT_TEST_CONFIGURATION, rows: 40, cols: 40 };
		const fresh = createGameState(
			connectDungeonFloors(generateDungeonRun(123, 5, configuration)),
		);
		const arrival = fresh.run.floors[3].downStair?.coordinate;
		if (!arrival) throw new Error("Expected return stair");
		const escaping = activateEscapeFloor(
			{
				...fresh,
				run: { ...fresh.run, activeFloor: 4, playerCoordinate: arrival },
				// The Warden fell and its flame was claimed.
				monsters: fresh.monsters.filter((actor) => !isWarden(actor)),
				quest: { ...fresh.quest, cureRecovered: true },
				floorItems: fresh.floorItems.filter(
					(entry) => entry.item.kind !== "cure",
				),
				escape: { startedTurn: 0, activatedFloors: [] },
			},
			5,
		);
		const pursuing = resolvePlayerAction(escaping, { type: "wait" }).state;
		expect(
			pursuing.monsters.some(
				(monster) => monster.awareness?.type === "pursuing",
			),
		).toBe(true);
		const document = createSaveDocument(
			pursuing,
			updateExploration(pursuing.run, 8),
			configuration,
			DEFAULT_FOG_CONFIGURATION,
		);
		const parsed = parseSave(serializeSave(document));
		if (!parsed.ok) throw new Error(parsed.error);
		const loaded = restoreSave(parsed.value).state;
		expect(loaded).toEqual(pursuing);
		expect(activateEscapeFloor(loaded, 5)).toBe(loaded);
		expect(resolvePlayerAction(loaded, { type: "wait" }).state).toEqual(
			resolvePlayerAction(pursuing, { type: "wait" }).state,
		);
		expect(createGameState(fresh.run).escape).toBeNull();
	});
});
