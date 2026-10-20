// @vitest-environment node
import { expect, it } from "vitest";
import { createGameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";

const fountain = {
	id: "floor:1:object:fountain:1",
	kind: "fountain" as const,
	floorNumber: 1,
	coordinate: { row: 1, col: 2 },
	activated: false,
};
const encounter = () => ({
	...createGameState(createCorridorEncounter()),
	monsters: [],
	objects: [fountain],
	mana: 4,
	player: { health: 4, maxHealth: 10 },
});
it("inspection needs an explicit choice and neither spends the fountain nor advances time", () => {
	const state = encounter();
	const result = resolvePlayerAction(state, { type: "interact" });
	expect(result.turnAdvanced).toBe(false);
	expect(result.state).toBe(state);
});
it("a safe sip restores bounded resources for one turn and cannot be reused", () => {
	const state = encounter();
	const result = resolvePlayerAction(state, {
		type: "interact",
		choice: "sip",
	});
	expect(result.turnAdvanced).toBe(true);
	expect(result.state.player.health).toBe(10);
	expect(result.state.mana).toBe(8);
	expect(result.state.objects[0].activated).toBe(true);
	expect(
		resolvePlayerAction(result.state, { type: "interact", choice: "sip" })
			.turnAdvanced,
	).toBe(false);
	const full = {
		...encounter(),
		player: { health: 10, maxHealth: 10 },
		mana: 10,
	};
	expect(
		resolvePlayerAction(full, { type: "interact", choice: "sip" }).state,
	).toBe(full);
});
it("risky draws can restore or poison with identity-fixed outcomes, never rerolling on later turns", () => {
	const outcomes = new Set<string>();
	for (let seed = 0; seed < 20; seed++) {
		const state = { ...encounter(), run: { ...encounter().run, seed } };
		const result = resolvePlayerAction(state, {
			type: "interact",
			choice: "draw",
		}).state;
		const replay = resolvePlayerAction(
			{ ...state, turn: 20 },
			{ type: "interact", choice: "draw" },
		).state;
		expect(result.player).toEqual(replay.player);
		expect(result.mana).toBe(replay.mana);
		expect(result.objects[0].activated).toBe(true);
		outcomes.add(
			result.afflictions.some((a) => a.kind === "poisoned")
				? "poison"
				: "restore",
		);
	}
	expect(outcomes).toEqual(new Set(["restore", "poison"]));
});
