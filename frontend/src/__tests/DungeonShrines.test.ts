// @vitest-environment node

import { expect, it } from "vitest";
import { initializeEconomyTelemetry } from "../domain/game/EconomyTelemetry";
import { createGameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import { savedAdventure } from "./SaveTestHelpers";

const shrine = {
	id: "floor:1:object:shrine:1",
	kind: "shrine" as const,
	floorNumber: 1,
	coordinate: { row: 1, col: 2 },
	activated: false,
};
const encounter = () => ({
	...createGameState(createCorridorEncounter()),
	monsters: [],
	objects: [shrine],
	gold: 20,
});
it("inspection and insufficient-gold bargains leave the entire adventure untouched", () => {
	const state = encounter();
	expect(resolvePlayerAction(state, { type: "interact" }).state).toBe(state);
	const poor = { ...state, gold: 14 };
	const result = resolvePlayerAction(poor, {
		type: "interact",
		choice: "offer",
	});
	expect(result.turnAdvanced).toBe(false);
	expect(result.error).toMatch(/15 gold/);
	expect(result.state).toBe(poor);
});
it("an explicit offering trades exactly its stated gold for persistent XP and ordinary growth once", () => {
	const result = resolvePlayerAction(initializeEconomyTelemetry(encounter()), {
		type: "interact",
		choice: "offer",
	});
	expect(result.turnAdvanced).toBe(true);
	expect(result.state.gold).toBe(5);
	expect(result.state.economyTelemetry?.floors[1]?.goldOut.shrine).toBe(15);
	expect(result.state.progression.experience).toBe(24);
	expect(result.state.player.maxHealth).toBe(12);
	expect(result.state.objects[0].activated).toBe(true);
	expect(
		resolvePlayerAction(result.state, { type: "interact", choice: "offer" })
			.state,
	).toBe(result.state);
});
it("retains paid gold, XP and the spent shrine through validated loading", () => {
	const saved = restoreSave(savedAdventure());
	const state = {
		...saved.state,
		gold: 20,
		monsters: [],
		objects: [{ ...shrine, coordinate: { row: 7, col: 8 } }],
		run: { ...saved.state.run, playerCoordinate: { row: 7, col: 7 } },
	};
	const offered = resolvePlayerAction(state, {
		type: "interact",
		choice: "offer",
	}).state;
	const doc = createSaveDocument(
		offered,
		saved.exploration,
		saved.configuration,
		saved.fog,
	);
	const parsed = parseSave(serializeSave(doc));
	expect(parsed.ok).toBe(true);
	if (!parsed.ok) throw new Error(parsed.error);
	const loaded = restoreSave(parsed.value).state;
	expect(loaded.gold).toBe(5);
	expect(loaded.progression).toEqual(offered.progression);
	expect(
		resolvePlayerAction(loaded, { type: "interact", choice: "offer" })
			.turnAdvanced,
	).toBe(false);
});
