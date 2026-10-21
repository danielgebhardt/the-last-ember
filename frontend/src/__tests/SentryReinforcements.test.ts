// @vitest-environment node
import { expect, it } from "vitest";
import { formatActivityEvent } from "../components/game/ActivityMessages";
import { createGameState, type GameState } from "../domain/game/GameState";
import { damageMonster } from "../domain/game/MonsterDamage";
import {
	SENTRY_MAX_SUMMONS_ALIVE,
	sentrySummonKinds,
} from "../domain/monsters/MonsterAlarm";
import { parseSave, serializeSave } from "../domain/saves/SaveFormat";
import { bruteEncounter } from "./BruteTestHelpers";
import { resolveMonsterPhaseWithHits as phase } from "./ControlledCombatTestHelpers";
import { tacticalSnapshot } from "./TacticalReplayTestHelpers";
import { createTestDungeonFloor } from "./testhelpers";

// A sentry at 3,3 sees the player at 3,6 in an open 10×10 room.
const encounter = (): GameState => ({
	...createGameState({
		seed: 123,
		activeFloor: 1,
		playerCoordinate: { row: 3, col: 6 },
		floors: [
			createTestDungeonFloor({
				floorNumber: 1,
				rows: 12,
				cols: 12,
				room: { startRow: 1, endRow: 10, startCol: 1, endCol: 10 },
			}),
		],
	}),
	turn: 1,
	objects: [],
	monsters: [
		{
			id: "1:1",
			kind: "alarm-sentry",
			floorNumber: 1,
			coordinate: { row: 3, col: 3 },
			health: 8,
			intent: { type: "idle" },
		},
	],
});
// Runs phases from the given turn; the player is made sturdy so a long fight can't end it.
const run = (state: GameState, from: number, to: number) => {
	let next = { ...state, player: { health: 999, maxHealth: 999 } };
	for (let turn = from; turn <= to; turn++) next = phase({ ...next, turn });
	return next;
};
const summonsOf = (state: GameState) =>
	state.monsters.filter((m) => m.summonedBy === "1:1");
const sounded = () => run(encounter(), 1, 2);

it("calls one floor creature every two phases after sounding, hunting you", () => {
	const alarm = sounded();
	expect(alarm.monsters[0]).toMatchObject({
		alarmUsed: true,
		summons: { count: 0, turn: 2 },
	});
	expect(summonsOf(run(alarm, 3, 3))).toEqual([]);
	const first = run(alarm, 3, 4);
	const [called] = summonsOf(first);
	expect(called).toMatchObject({
		id: "1:2001001",
		summonedBy: "1:1",
		awareness: { type: "pursuing" },
	});
	expect(sentrySummonKinds(1)).toContain(called.kind);
	expect(sentrySummonKinds(1)).not.toContain("alarm-sentry");
	// It arrives on the nearest free room tile and has not acted yet.
	expect(
		Math.abs(called.coordinate.row - 3) + Math.abs(called.coordinate.col - 3),
	).toBe(1);
	const entry = first.activityHistory.entries.find(
		({ event }) => event.type === "monster-summoned",
	);
	expect(entry && formatActivityEvent(entry.event)).toMatch(
		/^Turn 4 — The alarm sentry calls a .+ to its side\.$/,
	);
	// The same seed always calls the same creatures.
	expect(summonsOf(run(alarm, 3, 8))).toEqual(summonsOf(run(alarm, 3, 8)));
});

it("keeps at most three reinforcements alive, then calls again when one falls", () => {
	const full = run(sounded(), 3, 12);
	expect(summonsOf(full)).toHaveLength(SENTRY_MAX_SUMMONS_ALIVE);
	expect(full.monsters[0].summons?.count).toBe(3);
	const killed = damageMonster(full, summonsOf(full)[0], 999, {
		type: "player-hit",
	});
	const refilled = run(killed, 13, 13);
	expect(summonsOf(refilled)).toHaveLength(3);
	expect(refilled.monsters[0].summons?.count).toBe(4);
});

it("reinforcements give no XP, gold or loot", () => {
	const called = run(sounded(), 3, 4);
	const reinforcement = summonsOf(called)[0];
	const killed = damageMonster(called, reinforcement, 999, {
		type: "player-hit",
	});
	expect(killed.progression.experience).toBe(called.progression.experience);
	expect(killed.gold).toBe(called.gold);
	expect(killed.floorItems).toEqual(called.floorItems);
});

it("killing the sentry stops the calls; its reinforcements stay", () => {
	const called = run(sounded(), 3, 4);
	const dead = damageMonster(called, called.monsters[0], 999, {
		type: "player-hit",
	});
	const later = run(dead, 5, 12);
	expect(later.monsters.some((m) => m.kind === "alarm-sentry")).toBe(false);
	expect(summonsOf(later)).toHaveLength(1);
});

it("saves reinforcements and rejects forged ones", () => {
	// A saveable floor-4 room: the sentry at 4,7 sees the player at 4,4.
	const base = bruteEncounter();
	const saveable: GameState = {
		...base,
		monsters: [
			{
				id: "4:1",
				kind: "alarm-sentry",
				floorNumber: 4,
				coordinate: { row: 4, col: 7 },
				health: 8,
				intent: { type: "idle" },
				lastDamagedTurn: null,
			},
		],
	};
	let called = saveable;
	for (const turn of [1, 2, 4]) called = phase({ ...called, turn });
	expect(called.monsters.filter((m) => m.summonedBy === "4:1")).toHaveLength(1);
	const document = tacticalSnapshot(called);
	expect(parseSave(serializeSave(document)).ok).toBe(true);
	const forge = (monsters: unknown[]) =>
		parseSave(
			serializeSave({
				...document,
				state: { ...document.state, monsters },
			} as typeof document),
		).ok;
	const [sentry, reinforcement] = document.state.monsters;
	// A call number beyond the sentry's count, a missing owner, or a sentry kind.
	expect(
		forge([
			sentry,
			reinforcement,
			{ ...reinforcement, id: "4:2001002", coordinate: { row: 9, col: 9 } },
		]),
	).toBe(false);
	expect(forge([sentry, { ...reinforcement, summonedBy: undefined }])).toBe(
		false,
	);
	expect(forge([sentry, { ...reinforcement, kind: "alarm-sentry" }])).toBe(
		false,
	);
});
