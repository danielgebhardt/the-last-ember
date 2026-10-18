// @vitest-environment node
import { expect, it } from "vitest";
import type { GameState } from "../domain/game/GameState";
import { createGameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { protectedFloorLocations } from "../domain/monsters/MonsterLocations";
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
			kind: "cultist" as const,
			floorNumber: 1,
			coordinate: { row: 1, col: 4 },
			health: 16,
			intent: { type: "idle" as const },
		},
	],
});
it("cultists cast one seeded spell, ignore physical armor and spend intervening phases recovering", () => {
	const initial = encounter();
	const first = resolvePlayerAction(initial, { type: "wait" }, hit).state;
	expect(first.player.health).toBe(7);
	expect(first.monsters[0].coordinate).toEqual(initial.monsters[0].coordinate);
	expect(first.activityHistory.entries.at(-1)?.event).toMatchObject({
		type: "monster-spell-hit",
		spell: "ember-bolt",
		damage: 3,
	});
	const second = resolvePlayerAction(first, { type: "wait" }, hit).state;
	expect(second.player.health).toBe(7);
	const third = resolvePlayerAction(second, { type: "wait" }, hit).state;
	expect(third.player.health).toBe(7);
	const fourth = resolvePlayerAction(third, { type: "wait" }, hit).state;
	expect(fourth.player.health).toBe(4);
	expect(resolvePlayerAction(initial, { type: "wait" }, hit).state).toEqual(
		first,
	);
});
it("a wounded cultist chooses bounded healing instead of also attacking", () => {
	const initial = encounter();
	initial.monsters[0].health = 7;
	const after = resolvePlayerAction(initial, { type: "wait" }, hit).state;
	expect(after.monsters[0].health).toBe(11);
	expect(after.player.health).toBe(10);
	expect(after.activityHistory.entries.at(-1)?.event).toMatchObject({
		type: "monster-spell-healed",
		recovered: 4,
	});
});
it("walls and sleeping conditions prevent enemy casting", () => {
	const initial = encounter();
	const terrain = initial.run.floors[0].terrain.map((row) => [...row]);
	terrain[1][3] = "#";
	initial.run.floors[0] = { ...initial.run.floors[0], terrain };
	expect(
		resolvePlayerAction(initial, { type: "wait" }, hit).state.player.health,
	).toBe(10);
	const asleep = {
		...encounter(),
		effects: [
			{ actorId: "1:1", floorNumber: 1, kind: "asleep" as const, remaining: 3 },
		],
	};
	expect(
		resolvePlayerAction(asleep, { type: "wait" }, hit).state.player.health,
	).toBe(10);
});

it("resumes the caster's cadence and seeded damage after saving", () => {
	const original = restoreSave(savedAdventure());
	const { row, col } = original.state.run.playerCoordinate;
	const protectedTiles = protectedFloorLocations(original.state.run, 1);
	const coordinate = [
		{ row: row - 1, col },
		{ row: row + 1, col },
		{ row, col: col - 1 },
		{ row, col: col + 1 },
	].find(
		(tile) =>
			original.state.run.floors[0].terrain[tile.row]?.[tile.col] === "." &&
			!protectedTiles.some((p) => p.row === tile.row && p.col === tile.col),
	);
	if (!coordinate)
		throw new Error("Fixture requires a safe neighbouring tile.");
	let uninterrupted: GameState = {
		...original.state,
		progression: {
			...original.state.progression,
			permanentAttributes: { strength: 0, dexterity: 0, intelligence: 40 },
		},
		monsters: [
			{
				id: "1:1",
				kind: "cultist" as const,
				floorNumber: 1,
				coordinate,
				health: 16,
				intent: { type: "idle" as const },
				lastDamagedTurn: null,
			},
		],
	};
	uninterrupted = resolvePlayerAction(uninterrupted, { type: "wait" }).state;
	const parsed = parseSave(
		serializeSave(
			createSaveDocument(
				uninterrupted,
				original.exploration,
				original.configuration,
				original.fog,
			),
		),
	);
	if (!parsed.ok) throw new Error(parsed.error);
	let resumed = restoreSave(parsed.value).state;
	for (let phase = 0; phase < 4; phase++) {
		uninterrupted = resolvePlayerAction(uninterrupted, { type: "wait" }).state;
		resumed = resolvePlayerAction(resumed, { type: "wait" }).state;
		expect(resumed).toEqual(uninterrupted);
	}
});

it.each(["cultist", "necromancer"] as const)(
	"%s magic uses effective Intelligence once after difficulty scaling",
	(kind) => {
		const initial: GameState = {
			...encounter(),
			difficulty: 1.25,
			progression: {
				experience: 0,
				permanentAttributes: { strength: 0, dexterity: 0, intelligence: 40 },
			},
		};
		initial.monsters = [{ ...initial.monsters[0], kind, health: 100 }];
		// Cultists use Ember Bolt; necromancers use Shock across casting windows.
		for (const turn of [0, 3]) {
			const before = {
				...initial,
				turn,
				player: { health: 100, maxHealth: 100 },
			};
			const after = resolvePlayerAction(before, { type: "wait" }, () => ({
				d20: () => 20,
				damage: (_min, max) => max,
			})).state;
			const event = after.activityHistory.entries.findLast(
				(entry) => entry.event.type === "monster-spell-hit",
			)?.event;
			// 25% MR: Ember Bolt 7 -> difficulty 9 -> 7; Shock 8 -> 10 -> 8.
			const expected = kind === "necromancer" ? 8 : 7;
			expect(after.player.health).toBe(100 - expected);
			expect(event).toMatchObject({
				type: "monster-spell-hit",
				damage: expected,
			});
		}
	},
);
