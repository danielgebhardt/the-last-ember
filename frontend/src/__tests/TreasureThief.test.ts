// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { FLOOR } from "../domain/dungeon/Tiles";
import { createGameState, type GameState } from "../domain/game/GameState";
import { damageMonster } from "../domain/game/MonsterDamage";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { applyTimedEffect } from "../domain/game/TimedEffects";
import type { Monster } from "../domain/monsters/Monster";
import { orthogonalDistance } from "../domain/monsters/MonsterLocations";
import {
	isThief,
	MAX_THIEVES,
	MIN_THIEVES,
	THIEF_ESCAPE_PHASES,
	THIEF_SPAWN_ID,
} from "../domain/monsters/TreasureThief";
import { goldAmount } from "../domain/objects/Gold";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import { savedAdventure } from "./SaveTestHelpers";
import { COMPACT_TEST_CONFIGURATION } from "./TestRunConfiguration";

const hit = () => ({ d20: () => 20, damage: (min: number) => min });
const thief = (extra: Partial<Monster> = {}): Monster => ({
	id: `1:${THIEF_SPAWN_ID}`,
	kind: "treasure-thief",
	floorNumber: 1,
	coordinate: { row: 1, col: 6 },
	health: 12,
	intent: { type: "idle" },
	lastDamagedTurn: null,
	...extra,
});
// The player stands beside the thief in a straight corridor with the starting 300 gold.
const encounter = (extra: Partial<Monster> = {}, gold = 300): GameState => {
	const base = createGameState(createCorridorEncounter());
	return {
		...base,
		gold,
		run: { ...base.run, playerCoordinate: { row: 1, col: 5 } },
		monsters: [thief(extra)],
	};
};
const act = (
	state: GameState,
	action: Parameters<typeof resolvePlayerAction>[1] = { type: "wait" },
) => resolvePlayerAction(state, action, hit).state;
const types = (state: GameState, from = 0) =>
	state.activityHistory.entries.slice(from).map(({ event }) => event.type);

describe("Treasure thief", () => {
	it("marks your tile, then steals 15% of your carried gold if you stay, without attacking", () => {
		const prepared = act(encounter());
		expect(prepared.monsters[0].intent).toEqual({
			type: "preparing-theft",
			target: { row: 1, col: 5 },
		});
		expect(types(prepared)).toEqual(["monster-theft-prepared"]);
		const robbed = act(prepared);
		expect(robbed.gold).toBe(255);
		expect(robbed.monsters[0]).toMatchObject({
			intent: { type: "idle" },
			theft: { gold: 45, turn: 2 },
		});
		expect(types(robbed, 1)).toEqual(["monster-theft-hit"]);
		expect(robbed.player).toEqual(encounter().player);
	});

	it("takes nothing when you step off the marked tile, and never closes in on an empty purse", () => {
		const prepared = act(encounter());
		const dodged = act(prepared, { type: "move", direction: "left" });
		expect(dodged.gold).toBe(300);
		expect(dodged.monsters[0].theft).toBeUndefined();
		expect(types(dodged, 1)).toContain("monster-theft-avoided");
		const broke = act(act(encounter({}, 0)));
		expect(broke.monsters[0]).toMatchObject({
			intent: { type: "idle" },
			coordinate: { row: 1, col: 6 },
		});
		expect(broke.player).toEqual(encounter().player);
		expect(types(broke)).toEqual([]);
	});

	it("runs with its haul and slips away after 20 phases, unless Web holds it", () => {
		let state = act(act(encounter()));
		const start = state.monsters[0].coordinate.col;
		state = act(state);
		expect(state.monsters[0].coordinate.col).toBe(start + 1);
		for (let phase = 2; phase < THIEF_ESCAPE_PHASES; phase++)
			state = act(state);
		expect(state.monsters).toHaveLength(1);
		const escaped = act(state);
		expect(escaped.monsters).toEqual([]);
		expect(escaped.gold).toBe(255);
		expect(types(escaped).at(-1)).toBe("monster-thief-escaped");
		const held = act(applyTimedEffect(state, state.monsters[0], "rooted"));
		expect(held.monsters).toHaveLength(1);
		expect(held.monsters[0].coordinate).toEqual(state.monsters[0].coordinate);
	});

	it("returns everything it stole on top of its own purse when killed", () => {
		const state = encounter({ theft: { gold: 45, turn: 1 } }, 255);
		const slain = damageMonster(state, state.monsters[0], 99, {
			type: "player-hit",
		});
		expect(slain.monsters).toEqual([]);
		expect(slain.gold).toBe(
			255 + 45 + goldAmount(state.run.seed, 1, `1:${THIEF_SPAWN_ID}`),
		);
		expect(types(slain)).toContain("monster-theft-recovered");
	});

	it("saves a prepared theft and a fleeing haul, and rejects a theft from any other monster", () => {
		const original = restoreSave(savedAdventure());
		const [first] = original.state.monsters;
		const terrain = original.state.run.floors[first.floorNumber - 1].terrain;
		const target = [
			{ row: -1, col: 0 },
			{ row: 1, col: 0 },
			{ row: 0, col: -1 },
			{ row: 0, col: 1 },
		]
			.map(({ row, col }) => ({
				row: first.coordinate.row + row,
				col: first.coordinate.col + col,
			}))
			.find(({ row, col }) => terrain[row]?.[col] === FLOOR);
		if (!target) throw new Error("Expected an open tile beside the monster");
		const placed = thief({
			id: `${first.floorNumber}:${THIEF_SPAWN_ID}`,
			floorNumber: first.floorNumber,
			coordinate: first.coordinate,
		});
		const save = (monster: Monster) =>
			parseSave(
				serializeSave(
					createSaveDocument(
						{
							...original.state,
							monsters: original.state.monsters.map((m) =>
								m.id === first.id ? monster : { ...m, remedyDrop: undefined },
							),
						},
						original.exploration,
						original.configuration,
						original.fog,
					),
				),
			);
		for (const monster of [
			{ ...placed, intent: { type: "preparing-theft" as const, target } },
			{ ...placed, theft: { gold: 45, turn: original.state.turn } },
		]) {
			const parsed = save(monster);
			if (!parsed.ok) throw new Error(parsed.error);
			expect(
				restoreSave(parsed.value).state.monsters.find(
					(m) => m.id === placed.id,
				),
			).toEqual(monster);
		}
		expect(
			save({
				...placed,
				kind: "goblin",
				health: 4,
				intent: { type: "preparing-theft", target },
			}).ok,
		).toBe(false);
		expect(
			save({
				...placed,
				id: first.id,
				kind: "goblin",
				health: 4,
				theft: { gold: 45, turn: original.state.turn },
			}).ok,
		).toBe(false);
		expect(
			save({ ...placed, theft: { gold: 45, turn: original.state.turn + 1 } })
				.ok,
		).toBe(false);
	});

	it("places two to five thieves per adventure on middle floors, as far from where you arrive as the floor allows, the same way every time", () => {
		for (let seed = 1; seed <= 12; seed += 1) {
			const run = connectDungeonFloors(
				generateDungeonRun(seed, 20, COMPACT_TEST_CONFIGURATION),
			);
			const state = createGameState(run);
			// Each floor's own thief; Thieves' den and Gilded omens add more on top.
			const thieves = state.monsters.filter(
				(m) => isThief(m) && m.id.endsWith(`:${THIEF_SPAWN_ID}`),
			);
			expect(thieves.length).toBeGreaterThanOrEqual(MIN_THIEVES);
			expect(thieves.length).toBeLessThanOrEqual(MAX_THIEVES);
			for (const placed of thieves) {
				expect(placed.id).toBe(`${placed.floorNumber}:${THIEF_SPAWN_ID}`);
				expect(placed.floorNumber).toBeGreaterThanOrEqual(3);
				expect(placed.floorNumber).toBeLessThan(20);
				const arrival = run.floors[placed.floorNumber - 1].upStair?.coordinate;
				if (!arrival) throw new Error("Expected an up stair");
				expect(
					orthogonalDistance(placed.coordinate, arrival),
				).toBeGreaterThanOrEqual(4);
			}
			expect(
				createGameState(run).monsters.filter(
					(m) => isThief(m) && m.id.endsWith(`:${THIEF_SPAWN_ID}`),
				),
			).toEqual(thieves);
		}
	});
});
