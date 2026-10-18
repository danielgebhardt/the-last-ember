// @vitest-environment node

import { expect, it } from "vitest";
import { createGameState } from "../domain/game/GameState";
import { damageMonster } from "../domain/game/MonsterDamage";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { goldAmount } from "../domain/objects/Gold";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import { savedAdventure } from "./SaveTestHelpers";

it("walking onto gold collects it once without bag space or an extra turn", () => {
	const initial = {
		...createGameState(createCorridorEncounter()),
		monsters: [],
		objects: [
			{
				id: "floor:1:object:gold:1",
				kind: "gold" as const,
				floorNumber: 1,
				coordinate: { row: 1, col: 2 },
				activated: false,
			},
		],
	};
	const amount = goldAmount(initial.run.seed, 1, initial.objects[0].id);
	const collected = resolvePlayerAction(initial, {
		type: "move",
		direction: "right",
	}).state;
	expect(collected.gold).toBe(initial.gold + amount);
	expect(collected.turn).toBe(1);
	expect(collected.bag).toEqual(initial.bag);
	expect(
		collected.activityHistory.entries.map((entry) => entry.event),
	).toContainEqual({ type: "gold-collected", amount, turn: 1 });
	const back = resolvePlayerAction(collected, {
		type: "move",
		direction: "left",
	}).state;
	expect(
		resolvePlayerAction(back, { type: "move", direction: "right" }).state.gold,
	).toBe(initial.gold + amount);
});
it("one confirmed defeat grants seeded gold once even if an old actor reference is reused", () => {
	const monster = {
		id: "1:1",
		kind: "goblin" as const,
		floorNumber: 1,
		coordinate: { row: 1, col: 2 },
		health: 4,
		intent: { type: "idle" as const },
		lastDamagedTurn: null,
	};
	const initial = {
		...createGameState(createCorridorEncounter()),
		monsters: [monster],
		objects: [],
	};
	const killed = damageMonster(initial, monster, 100, { type: "player-hit" });
	expect(killed.gold).toBeGreaterThan(initial.gold);
	expect(damageMonster(killed, monster, 100, { type: "player-hit" })).toBe(
		killed,
	);
});
it("saves the actual gold balance and rejects negative gold", () => {
	const restored = restoreSave(savedAdventure());
	const state = { ...restored.state, gold: 42 };
	const doc = createSaveDocument(
		state,
		restored.exploration,
		restored.configuration,
		restored.fog,
	);
	expect(parseSave(serializeSave(doc))).toEqual({ ok: true, value: doc });
	expect(
		parseSave(JSON.stringify({ ...doc, state: { ...doc.state, gold: -1 } })).ok,
	).toBe(false);
});
