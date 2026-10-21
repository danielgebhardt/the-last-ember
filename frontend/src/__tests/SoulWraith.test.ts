// @vitest-environment node
import { expect, it } from "vitest";
import { formatActivityEvent } from "../components/game/ActivityMessages";
import { createGameState, type GameState } from "../domain/game/GameState";
import { maximumMana } from "../domain/game/Mana";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { createBag } from "../domain/items/Bag";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";

// The player stands at column 2 of a one-row corridor with the wraith
// `distance` tiles east, in clear sight.
const createMonsterEncounter = (distance: number): GameState => {
	const base = createGameState(createCorridorEncounter());
	return {
		...base,
		run: { ...base.run, playerCoordinate: { row: 1, col: 2 } },
		monsters: [
			{
				id: "1:1",
				kind: "soul-wraith",
				floorNumber: 1,
				coordinate: { row: 1, col: 2 + distance },
				health: 40,
				intent: { type: "idle" },
				lastDamagedTurn: null,
			},
		],
	};
};
const soulDrain = {
	kind: "soul-drain" as const,
	remaining: null,
	source: "test",
};
const wait = (state: GameState) =>
	resolvePlayerAction(state, { type: "wait" }).state;
const types = (state: GameState) =>
	state.activityHistory.entries.map(({ event }) => event.type);
const bolts = (state: GameState) =>
	types(state).filter((type) => type === "monster-soul-bolt-hit").length;

it("fires without warning in sight within 3 tiles: shadow damage and Soul Drain", () => {
	const before = createMonsterEncounter(3);
	const after = wait(before);
	expect(after.player.health).toBe(10 - 6);
	expect(after.afflictions).toEqual([
		{ kind: "soul-drain", remaining: null, source: "soul wraith" },
	]);
	// A full 10-point pool drops to 8 and current mana clamps to it.
	expect(after.mana).toBe(8);
	expect(
		maximumMana(after.progression, after.equipment, [], after.afflictions),
	).toBe(8);
	expect(after.monsters[0]).toMatchObject({
		intent: { type: "idle" },
		telegraphTurn: { "soul-bolt": 1 },
	});
	expect(types(after)).toEqual(["monster-soul-bolt-hit", "affliction-changed"]);
	expect(formatActivityEvent(after.activityHistory.entries[0].event)).toBe(
		"Turn 1 — The soul wraith's soul bolt hits you for 6 shadow damage.",
	);
});

it("closes in and fights normally between bolts, then fires again", () => {
	let state: GameState = {
		...createMonsterEncounter(3),
		player: { health: 200, maxHealth: 200 },
	};
	state = wait(state);
	for (let phase = 0; phase < 4; phase++) {
		state = wait(state);
		expect(bolts(state)).toBe(1);
	}
	expect(state.monsters[0].coordinate.col).toBeLessThan(5);
	expect(bolts(wait(state))).toBe(2);
});

it("holds its bolt beyond range and while magic resistance softens it", () => {
	const distant = wait(createMonsterEncounter(5));
	expect(bolts(distant)).toBe(0);
	expect(distant.afflictions).toEqual([]);
	const encounter = createMonsterEncounter(3);
	const warded = wait({
		...encounter,
		equipment: {
			...encounter.equipment,
			chest: { id: "test:cloak", kind: "warding-cloak" },
		},
	});
	expect(10 - warded.player.health).toBeLessThan(6);
});

it("restores capacity, not mana, when a Soul Restoration potion cures it", () => {
	const base = createGameState(createMonsterEncounter(9).run);
	const drained = {
		...base,
		monsters: [],
		afflictions: [soulDrain],
		mana: 4,
		bag: createBag([{ id: "soul", kind: "soul-restoration-potion" }]),
	};
	const cured = resolvePlayerAction(drained, {
		type: "consume",
		itemId: "soul",
	});
	expect(cured.error).toBeUndefined();
	expect(cured.state.afflictions).toEqual([]);
	expect(cured.state.mana).toBe(4);
	expect(
		maximumMana(cured.state.progression, cured.state.equipment, [], []),
	).toBe(10);
});
