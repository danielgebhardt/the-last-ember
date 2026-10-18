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

const trap = {
	id: "floor:1:object:trap:1",
	kind: "trap" as const,
	floorNumber: 1,
	coordinate: { row: 1, col: 2 },
	activated: false,
};
const encounter = () => ({
	...createGameState(createCorridorEncounter()),
	monsters: [],
	objects: [trap],
});
it("a visible trap hurts once on entry within the movement turn and stays spent on revisits", () => {
	const initial = encounter();
	const sprung = resolvePlayerAction(initial, {
		type: "move",
		direction: "right",
	}).state;
	expect(sprung.turn).toBe(1);
	expect(sprung.progression.experience).toBe(initial.progression.experience);
	expect(sprung.player.health).toBeLessThan(10);
	expect(sprung.player.health).toBeGreaterThanOrEqual(6);
	expect(sprung.objects[0].activated).toBe(true);
	const back = resolvePlayerAction(sprung, {
		type: "move",
		direction: "left",
	}).state;
	expect(
		resolvePlayerAction(back, { type: "move", direction: "right" }).state.player
			.health,
	).toBe(sprung.player.health);
});
it("disarm uses Dexterity and one fixed identity roll; a spent trap cannot be farmed", () => {
	const outcomes = new Set<string>();
	for (let seed = 0; seed < 12; seed++) {
		const state = { ...encounter(), run: { ...encounter().run, seed } };
		const result = resolvePlayerAction(state, { type: "interact" });
		expect(result.turnAdvanced).toBe(true);
		expect(result.state.objects[0].activated).toBe(true);
		const disarmed = result.state.activityHistory.entries.some(
			(entry) => entry.event.type === "trap-disarmed",
		);
		outcomes.add(disarmed ? "success" : "failure");
		expect(result.state.progression.experience).toBe(
			state.progression.experience + (disarmed ? 5 : 0),
		);
		const xp = result.state.activityHistory.entries.filter(
			(entry) => entry.event.type === "experience-gained",
		);
		expect(xp.map((entry) => entry.event)).toEqual(
			disarmed ? [{ type: "experience-gained", amount: 5, turn: 1 }] : [],
		);
		expect(resolvePlayerAction(state, { type: "interact" }).state).toEqual(
			result.state,
		);
		expect(
			resolvePlayerAction(result.state, { type: "interact" }).turnAdvanced,
		).toBe(false);
		expect(resolvePlayerAction(result.state, { type: "interact" }).state).toBe(
			result.state,
		);
	}
	expect(outcomes).toEqual(new Set(["success", "failure"]));
});
it("a successful disarm crosses the normal level threshold and grants its health growth", () => {
	const initial = encounter();
	const state = {
		...initial,
		run: { ...initial.run, seed: 123 },
		progression: { ...initial.progression, experience: 5 },
		player: { health: 5, maxHealth: 10 },
	};
	const result = resolvePlayerAction(state, { type: "interact" });
	expect(result.turnAdvanced).toBe(true);
	expect(result.state.progression.experience).toBe(10);
	expect(result.state.player).toEqual({ health: 7, maxHealth: 12 });
	expect(
		result.state.activityHistory.entries.map((entry) => entry.event),
	).toContainEqual({ type: "level-gained", level: 2, healthGain: 2, turn: 1 });
	expect(result.state.monstersDefeated).toBe(state.monstersDefeated);
});
it("fatal trap damage ends the turn before retaliation or recovery", () => {
	const state = {
		...encounter(),
		player: { health: 1, maxHealth: 10 },
		effects: [
			{
				actorId: "player",
				floorNumber: null,
				kind: "renewing" as const,
				remaining: 4,
			},
		],
	};
	const result = resolvePlayerAction(state, {
		type: "move",
		direction: "right",
	}).state;
	expect(result.player.health).toBe(0);
	expect(
		result.activityHistory.entries.filter(
			(entry) => entry.event.type === "player-died",
		),
	).toHaveLength(1);
	expect(resolvePlayerAction(result, { type: "wait" }).turnAdvanced).toBe(
		false,
	);
});
it("retains earned disarm XP and spent trap state through validated save continuation", () => {
	const saved = restoreSave(savedAdventure());
	const state = {
		...saved.state,
		monsters: [],
		objects: [{ ...trap, coordinate: { row: 7, col: 8 } }],
		run: { ...saved.state.run, playerCoordinate: { row: 7, col: 7 } },
	};
	const disarmed = resolvePlayerAction(state, { type: "interact" }).state;
	expect(disarmed.progression.experience).toBe(
		state.progression.experience + 5,
	);
	const doc = createSaveDocument(
		disarmed,
		saved.exploration,
		saved.configuration,
		saved.fog,
	);
	const parsed = parseSave(serializeSave(doc));
	if (!parsed.ok) throw new Error(parsed.error);
	const restored = restoreSave(parsed.value).state;
	expect(restored.objects).toEqual(disarmed.objects);
	expect(restored.progression.experience).toBe(disarmed.progression.experience);
	expect(resolvePlayerAction(restored, { type: "interact" }).state).toBe(
		restored,
	);
});
