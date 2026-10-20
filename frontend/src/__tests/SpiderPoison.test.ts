// @vitest-environment node
import { expect, it } from "vitest";
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

const hit = () => ({ d20: () => 20, damage: (min: number) => min });
const encounter = () => ({
	...createGameState(createCorridorEncounter()),
	monsters: [
		{
			id: "1:1",
			kind: "spider" as const,
			floorNumber: 1,
			coordinate: { row: 1, col: 2 },
			health: 8,
			intent: { type: "idle" as const },
			// Web on cooldown: these cases isolate the poison bite (webs: SpiderWeb.test).
			webTurn: 0,
		},
	],
});
it("a landed spider bite poisons the player, ticks after retaliation and refreshes without stacking", () => {
	const initial = encounter();
	const first = resolvePlayerAction(initial, { type: "wait" }, hit).state;
	expect(first.player.health).toBe(8);
	expect(first.afflictions).toEqual([
		{ kind: "poisoned", remaining: 5, source: "giant spider" },
	]);
	const again = resolvePlayerAction(first, { type: "wait" }, hit).state;
	expect(again.afflictions).toHaveLength(1);
	expect(again.afflictions[0].remaining).toBe(5);
	expect(again.player.health).toBe(6);
});
it("missed bites and free blocked actions do not add or tick poison", () => {
	const initial = encounter();
	expect(
		resolvePlayerAction(initial, { type: "wait" }, () => ({
			d20: () => 1,
			damage: (min) => min,
		})).state.afflictions,
	).toEqual([]);
	const poisoned = resolvePlayerAction(initial, { type: "wait" }, hit).state;
	const blocked = resolvePlayerAction(
		poisoned,
		{ type: "move", direction: "up" },
		hit,
	);
	expect(blocked.state).toBe(poisoned);
});
it("poison follows the player, expires after six committed phases, and cannot be revived by Renewal", () => {
	const bitten = resolvePlayerAction(encounter(), { type: "wait" }, hit).state;
	const away = {
		...bitten,
		monsters: [],
		run: {
			...bitten.run,
			activeFloor: 2,
			playerCoordinate: { row: 1, col: 1 },
		},
	};
	const second = resolvePlayerAction(away, { type: "wait" }, hit).state;
	expect(second.player.health).toBe(7);
	let last = resolvePlayerAction(second, { type: "wait" }, hit).state;
	expect(last.player.health).toBe(6);
	expect(last.afflictions[0].remaining).toBe(3);
	for (let phase = 4; phase <= 6; phase++)
		last = resolvePlayerAction(last, { type: "wait" }, hit).state;
	expect(last.player.health).toBe(3);
	expect(last.afflictions).toEqual([]);
	const fatal = {
		...away,
		player: { health: 1, maxHealth: 10 },
		effects: [
			...away.effects,
			{
				actorId: "player",
				floorNumber: null,
				kind: "renewing" as const,
				remaining: 3,
			},
		],
	};
	const died = resolvePlayerAction(fatal, { type: "wait" }, hit).state;
	expect(died.player.health).toBe(0);
	expect(
		died.activityHistory.entries.filter(
			(entry) => entry.event.type === "player-died",
		),
	).toHaveLength(1);
	expect(resolvePlayerAction(died, { type: "wait" }, hit).state).toBe(died);
});

it("resumes a saved player poison timer without replaying the bite or refilling health", () => {
	const original = restoreSave(savedAdventure());
	const poisoned = {
		...original.state,
		monsters: [],
		player: { health: 3, maxHealth: 10 },
		effects: [],
		afflictions: [{ kind: "poisoned" as const, remaining: 2, source: "test" }],
	};
	const parsed = parseSave(
		serializeSave(
			createSaveDocument(
				poisoned,
				original.exploration,
				original.configuration,
				original.fog,
			),
		),
	);
	expect(parsed.ok).toBe(true);
	if (!parsed.ok) throw new Error(parsed.error);
	const resumed = resolvePlayerAction(
		restoreSave(parsed.value).state,
		{ type: "wait" },
		hit,
	).state;
	expect(resumed.player.health).toBe(2);
	expect(resumed.afflictions[0].remaining).toBe(1);
	expect(
		resumed.activityHistory.entries.filter(
			(entry) => entry.event.type === "player-condition-applied",
		),
	).toHaveLength(0);
});
