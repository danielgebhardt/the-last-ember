// @vitest-environment node
import { expect, it } from "vitest";
import { formatActivityEvent } from "../components/game/ActivityMessages";
import { afflictedSightRadius } from "../domain/game/AfflictionDefinitions";
import type { AttackRollSource } from "../domain/game/CombatRandomness";
import type { GameState } from "../domain/game/GameState";
import { deriveAccuracy } from "../domain/game/MeleeRules";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { restoreSave } from "../domain/saves/SaveFormat";
import { bruteEncounter } from "./BruteTestHelpers";
import { savedAdventure } from "./SaveTestHelpers";

const hits: AttackRollSource = () => ({
	d20: () => 20,
	damage: (_min, max) => max,
});
const misses: AttackRollSource = () => ({
	d20: () => 1,
	damage: (min) => min,
});
// The player stands at 4,4 with the stalker beside them at 4,5.
const encounter = (): GameState => {
	const state = bruteEncounter();
	return {
		...state,
		monsters: state.monsters.map((monster) => ({
			...monster,
			kind: "shadow-stalker",
		})),
	};
};
const wait = (state: GameState, rolls = hits) =>
	resolvePlayerAction(state, { type: "wait" }, rolls).state;
const types = (state: GameState) =>
	state.activityHistory.entries.map(({ event }) => event.type);
const blinded = (state: GameState) =>
	state.afflictions.find((a) => a.kind === "blinded");

it("marks your tile, then a landed strike deals melee damage and blinds", () => {
	const prepared = wait(encounter());
	expect(prepared.player.health).toBe(10);
	expect(prepared.monsters[0].intent).toEqual({
		type: "preparing-blind",
		target: { row: 4, col: 4 },
	});
	const struck = wait(prepared);
	expect(struck.player.health).toBeLessThan(10);
	expect(blinded(struck)).toEqual({
		kind: "blinded",
		remaining: 29,
		source: "shadow stalker",
	});
	expect(struck.monsters[0]).toMatchObject({
		intent: { type: "idle" },
		telegraphTurn: { blind: struck.turn },
	});
	expect(types(struck)).toEqual([
		"monster-blind-prepared",
		"monster-blind-hit",
		"affliction-changed",
	]);
	expect(formatActivityEvent(struck.activityHistory.entries[1].event)).toBe(
		`Turn 2 — The shadow stalker's blinding strike hits you for ${10 - struck.player.health} damage.`,
	);
});

it("finds empty air when you step off the marked tile, without an early strike", () => {
	const prepared = wait(encounter());
	const escaped = resolvePlayerAction(
		prepared,
		{ type: "move", direction: "left" },
		hits,
	).state;
	expect(escaped.player.health).toBe(10);
	expect(blinded(escaped)).toBeUndefined();
	expect(types(escaped).at(-1)).toBe("monster-blind-avoided");
});

it("does not blind on a missed roll", () => {
	const missed = wait(wait(encounter()), misses);
	expect(missed.player.health).toBe(10);
	expect(blinded(missed)).toBeUndefined();
	expect(types(missed).at(-1)).toBe("monster-blind-missed");
});

it("fights normally between strikes for its cooldown", () => {
	let next = wait(wait(encounter()), misses);
	for (let phase = 0; phase < 4; phase++) {
		next = wait(next, misses);
		expect(next.monsters[0].intent.type).not.toBe("preparing-blind");
		expect(types(next).at(-1)).toBe("monster-missed");
	}
	expect(wait(next, misses).monsters[0].intent.type).toBe("preparing-blind");
});

it("narrows sight to 2 tiles and melee to-hit by 20 while it lasts", () => {
	const affliction = {
		kind: "blinded" as const,
		remaining: 30,
		source: "test",
	};
	expect(afflictedSightRadius(8, [affliction])).toBe(2);
	expect(afflictedSightRadius(1, [affliction])).toBe(1);
	expect(afflictedSightRadius(8, [])).toBe(8);
	const state = encounter();
	const sighted = deriveAccuracy(state.progression, [], state.equipment, []);
	const blind = deriveAccuracy(state.progression, [], state.equipment, [
		affliction,
	]);
	expect(sighted.playerHitChance - blind.playerHitChance).toBe(20);
	// A loaded blinded adventure keeps its map memory but sees only 2 tiles.
	const document = savedAdventure();
	document.state.afflictions = [affliction];
	const { exploration, state: loaded } = restoreSave(document);
	expect(exploration.radius).toBe(2);
	const { row, col } = loaded.run.playerCoordinate;
	for (const [r, line] of exploration.visible.entries())
		for (const [c, seen] of line.entries())
			if (seen)
				expect(Math.abs(r - row) + Math.abs(c - col)).toBeLessThanOrEqual(4);
});
