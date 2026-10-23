// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
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
	it("snatches 15% of your carried gold and springs back a step in the same action, without attacking", () => {
		const robbed = act(encounter());
		expect(robbed.gold).toBe(255);
		expect(robbed.monsters[0]).toMatchObject({
			intent: { type: "idle" },
			coordinate: { row: 1, col: 7 },
			theft: { gold: 45, turn: 1 },
		});
		expect(types(robbed)).toEqual(["monster-theft-hit"]);
		expect(robbed.player).toEqual(encounter().player);
		// From two tiles away it darts in, steals and springs back.
		const darting = act(encounter({ coordinate: { row: 1, col: 7 } }));
		expect(darting.gold).toBe(255);
		expect(darting.monsters[0].coordinate).toEqual({ row: 1, col: 8 });
		// Webbed beside you it still steals, but cannot spring away.
		const near = encounter();
		const held = act(applyTimedEffect(near, near.monsters[0], "rooted"));
		expect(held.gold).toBe(255);
		expect(held.monsters[0].coordinate).toEqual({ row: 1, col: 6 });
	});

	it("never closes in on an empty purse, and Web holds it short of you", () => {
		const broke = act(act(encounter({}, 0)));
		expect(broke.monsters[0]).toMatchObject({
			intent: { type: "idle" },
			coordinate: { row: 1, col: 6 },
		});
		expect(broke.player).toEqual(encounter().player);
		expect(types(broke)).toEqual([]);
		const far = encounter({ coordinate: { row: 1, col: 7 } });
		const held = act(applyTimedEffect(far, far.monsters[0], "rooted"));
		expect(held.gold).toBe(300);
		expect(held.monsters[0].coordinate).toEqual({ row: 1, col: 7 });
	});

	it("runs with its haul and slips away after 20 phases, unless Web holds it", () => {
		let state = act(encounter());
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

	it("saves a fleeing haul, and rejects a theft from any other monster", () => {
		const original = restoreSave(savedAdventure());
		const [first] = original.state.monsters;
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
		const fleeing = {
			...placed,
			theft: { gold: 45, turn: original.state.turn },
		};
		const parsed = save(fleeing);
		if (!parsed.ok) throw new Error(parsed.error);
		expect(
			restoreSave(parsed.value).state.monsters.find((m) => m.id === placed.id),
		).toEqual(fleeing);
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
