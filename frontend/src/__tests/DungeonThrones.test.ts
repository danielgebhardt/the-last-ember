// @vitest-environment node

import { expect, it } from "vitest";
import { initializeEconomyTelemetry } from "../domain/game/EconomyTelemetry";
import { createGameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";

const throne = {
	id: "floor:1:object:throne:1",
	kind: "throne" as const,
	floorNumber: 1,
	coordinate: { row: 1, col: 2 },
	activated: false,
};
const encounter = () => ({
	...createGameState(createCorridorEncounter()),
	monsters: [],
	objects: [throne],
	mana: 4,
	player: { health: 8, maxHealth: 10 },
});
it("inspecting or leaving a throne is free and leaves its future choice intact", () => {
	const state = encounter();
	expect(resolvePlayerAction(state, { type: "interact" }).state).toBe(state);
	expect(
		resolvePlayerAction(state, { type: "interact", choice: "leave" })
			.turnAdvanced,
	).toBe(false);
});
it("sitting has fixed bounded blessing, recovery, curse or legal relocation outcomes", () => {
	const seen = new Set<string>();
	for (let seed = 0; seed < 50; seed++) {
		const state = { ...encounter(), run: { ...encounter().run, seed } };
		const result = resolvePlayerAction(state, {
			type: "interact",
			choice: "sit",
		}).state;
		expect(result.turn).toBe(1);
		expect(result.objects[0].activated).toBe(true);
		expect(
			resolvePlayerAction(state, { type: "interact", choice: "sit" }).state,
		).toEqual(result);
		const event = result.activityHistory.entries.find(
			(entry) => entry.event.type === "throne-used",
		)?.event;
		expect(event).toBeDefined();
		if (event?.type === "throne-used") seen.add(event.outcome);
		expect(result.player.health).toBeGreaterThanOrEqual(5);
		expect(result.run.activeFloor).toBe(1);
		expect(
			result.run.floors[0].terrain[result.run.playerCoordinate.row][
				result.run.playerCoordinate.col
			],
		).toBe(".");
		expect(
			resolvePlayerAction(result, {
				type: "interact",
				objectId: throne.id,
				choice: "sit",
			}).turnAdvanced,
		).toBe(false);
	}
	expect(seen).toEqual(
		new Set(["blessing", "recovery", "curse", "relocation"]),
	);
});
it("prying either grants gold or a bounded wound once, including across turns", () => {
	const seen = new Set<string>();
	for (let seed = 0; seed < 20; seed++) {
		const state = initializeEconomyTelemetry({
			...encounter(),
			run: { ...encounter().run, seed },
		});
		const result = resolvePlayerAction(state, {
			type: "interact",
			choice: "pry",
		}).state;
		const replay = resolvePlayerAction(
			{ ...state, turn: 20 },
			{ type: "interact", choice: "pry" },
		).state;
		expect(result.gold).toBe(replay.gold);
		expect(result.economyTelemetry?.floors[1]?.goldIn.throne ?? 0).toBe(
			result.gold - state.gold,
		);
		expect(result.player).toEqual(replay.player);
		expect(result.objects[0].activated).toBe(true);
		seen.add(result.gold > state.gold ? "gold" : "wound");
		expect(result.player.health).toBeGreaterThanOrEqual(4);
	}
	expect(seen).toEqual(new Set(["gold", "wound"]));
});
