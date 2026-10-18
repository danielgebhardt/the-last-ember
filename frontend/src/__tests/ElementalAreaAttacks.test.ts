// @vitest-environment node
import { expect, it } from "vitest";
import type { GameState } from "../domain/game/GameState";
import { createGameState } from "../domain/game/GameState";
import { damageMonster } from "../domain/game/MonsterDamage";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { createTestDungeonFloor } from "./testhelpers";

const hit = () => ({ d20: () => 20, damage: (min: number) => min });
const arena = (): GameState => ({
	...createGameState({
		seed: 123,
		activeFloor: 1,
		playerCoordinate: { row: 4, col: 4 },
		floors: [
			createTestDungeonFloor({
				floorNumber: 1,
				rows: 9,
				cols: 9,
				room: { startRow: 1, endRow: 7, startCol: 1, endCol: 7 },
			}),
		],
	}),
	monsters: [
		{
			id: "1:1",
			kind: "salamander" as const,
			floorNumber: 1,
			coordinate: { row: 4, col: 1 },
			health: 24,
			intent: { type: "idle" as const },
			lastDamagedTurn: null,
		},
	],
});
it("fire resistance and cold weakness apply once through the shared damage owner", () => {
	const state = arena();
	const target = state.monsters[0];
	const fire = damageMonster(state, target, 8, {
		type: "spell-hit",
		spell: "ember-bolt",
	});
	expect(fire.monsters[0].health).toBe(20);
	const cold = damageMonster(state, target, 8, {
		type: "spell-hit",
		spell: "frost-bolt",
	});
	expect(cold.monsters[0].health).toBe(8);
	expect(
		damageMonster(state, target, 1, { type: "spell-hit", spell: "ember-bolt" })
			.monsters[0].health,
	).toBe(23);
});
it("breath warnings give two response turns and resolve only the original marked area", () => {
	const initial = arena();
	const prepared = resolvePlayerAction(initial, { type: "wait" }, hit).state;
	expect(prepared.player.health).toBe(10);
	expect(prepared.monsters[0].intent).toMatchObject({
		type: "preparing-area",
		target: { row: 4, col: 4 },
		remaining: 2,
		radius: 1,
	});
	const moved = resolvePlayerAction(
		prepared,
		{ type: "move", direction: "up" },
		hit,
	).state;
	expect(moved.player.health).toBe(10);
	const escaped = resolvePlayerAction(
		moved,
		{ type: "move", direction: "up" },
		hit,
	).state;
	expect(escaped.player.health).toBe(10);
	expect(escaped.monsters[0].intent.type).toBe("idle");
	expect(escaped.activityHistory.entries.at(-1)?.event.type).toBe(
		"monster-area-avoided",
	);
});
it("staying in the warned area receives one seeded hit after the delay", () => {
	let state = arena();
	for (let phase = 0; phase < 3; phase++)
		state = resolvePlayerAction(state, { type: "wait" }, hit).state;
	expect(state.player.health).toBe(4);
	expect(state.monsters[0].intent.type).toBe("idle");
	expect(
		state.activityHistory.entries.filter(
			(entry) => entry.event.type === "monster-area-hit",
		),
	).toHaveLength(1);
});

it("Sleep cancels the prepared blast and Drain Life heals only damage after resistance", () => {
	const initial = arena();
	initial.knownSpells = ["sleep"];
	const prepared = resolvePlayerAction(initial, { type: "wait" }, hit).state;
	const asleep = resolvePlayerAction(
		prepared,
		{ type: "cast", spell: "sleep", targetId: "1:1" },
		hit,
	).state;
	expect(asleep.monsters[0].intent.type).toBe("idle");
	expect(asleep.player.health).toBe(10);
	const drain = {
		...arena(),
		player: { health: 5, maxHealth: 10 },
		knownSpells: ["drain-life"] as const,
		monsters: [
			{
				id: "1:1",
				kind: "necromancer" as const,
				floorNumber: 1,
				coordinate: { row: 4, col: 3 },
				health: 28,
				intent: { type: "idle" as const },
				lastDamagedTurn: null,
			},
		],
	};
	const drained = resolvePlayerAction(
		drain,
		{ type: "cast", spell: "drain-life", targetId: "1:1" },
		hit,
	).state;
	expect(
		drained.activityHistory.entries.some(
			(entry) =>
				entry.event.type === "spell-healed" && entry.event.recovered === 2,
		),
	).toBe(true);
	expect(drained.monsters[0].health).toBe(26);
});

it.each(["salamander", "frost-giant"] as const)(
	"%s breath applies resistance after difficulty and logs the actual HP loss",
	(kind) => {
		let state: GameState = {
			...arena(),
			difficulty: 1.25,
			player: { health: 100, maxHealth: 100 },
			progression: {
				experience: 0,
				permanentAttributes: { strength: 0, dexterity: 0, intelligence: 40 },
			},
		};
		state.monsters = [
			{
				...state.monsters[0],
				kind,
				health: 100,
				coordinate: { row: 4, col: 2 },
			},
		];
		const roll = () => ({
			d20: () => 20,
			damage: (_min: number, max: number) => max,
		});
		// Resolve the complete warning countdown.
		state = resolvePlayerAction(state, { type: "wait" }, roll).state;
		for (
			let phase = 0;
			phase < 4 && state.monsters[0].intent.type !== "idle";
			phase++
		)
			state = resolvePlayerAction(state, { type: "wait" }, roll).state;
		// Fire: 10 -> harder 13 -> 10; cold: 12 -> harder 15 -> 11.
		const expected = kind === "salamander" ? 10 : 11;
		expect(state.player.health).toBe(100 - expected);
		expect(
			state.activityHistory.entries
				.filter((entry) => entry.event.type === "monster-area-hit")
				.map((entry) => entry.event),
		).toMatchObject([{ type: "monster-area-hit", damage: expected }]);
	},
);
