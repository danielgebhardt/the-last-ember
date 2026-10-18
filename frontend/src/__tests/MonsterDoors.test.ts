// @vitest-environment node

import { describe, expect, it } from "vitest";
import type { GameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { resolveMonsterPhase } from "../domain/monsters/MonsterTurns";
import { visibleThreatHistory } from "../domain/monsters/VisibleAwareness";
import {
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { bruteEncounter } from "./BruteTestHelpers";
import { tacticalSnapshot } from "./TacticalReplayTestHelpers";

const encounter = (): GameState => {
	const state = bruteEncounter();
	return {
		...state,
		objects: [
			{
				id: "floor:4:object:door:1",
				kind: "door",
				floorNumber: 4,
				coordinate: { row: 4, col: 5 },
				activated: false,
			},
		],
		monsters: [
			{
				...state.monsters[0],
				kind: "orc",
				coordinate: { row: 4, col: 6 },
				health: 7,
				intent: { type: "idle" },
				awareness: {
					type: "pursuing",
					target: { ...state.run.playerCoordinate },
					remaining: 12,
					blocked: 0,
				},
			},
		],
	};
};
describe("Capable enemies opening ordinary doors", () => {
	it("spends one action opening, then moves on a later phase without attacking", () => {
		const state = encounter();
		const opened = resolvePlayerAction(state, { type: "wait" }).state;
		expect(opened.objects[0].activated).toBe(true);
		expect(opened.monsters[0].coordinate).toEqual(state.monsters[0].coordinate);
		expect(opened.player.health).toBe(state.player.health);
		expect(opened.monsters[0].awareness).toMatchObject({ remaining: 11 });
		expect(
			opened.activityHistory.entries.some(
				({ event }) => event.type === "monster-door-opened",
			),
		).toBe(true);
		const moved = resolvePlayerAction(opened, { type: "wait" }).state;
		expect(moved.monsters[0].coordinate).toEqual({ row: 4, col: 5 });
		expect(moved.player.health).toBe(state.player.health);
		expect(state.objects[0].activated).toBe(false);
	});
	it.each(["goblin", "orc"] as const)(
		"does not open a door without pursuit memory (%s)",
		(kind) => {
			const state = encounter();
			expect(
				resolveMonsterPhase({
					...state,
					monsters: [
						{ ...state.monsters[0], kind, awareness: { type: "idle" } },
					],
				}).objects[0].activated,
			).toBe(false);
		},
	);
	it("leaves ordinary incapable monsters blocked even with pursuit memory", () => {
		const state = encounter();
		expect(
			resolveMonsterPhase({
				...state,
				monsters: [{ ...state.monsters[0], kind: "goblin" }],
			}).objects[0].activated,
		).toBe(false);
	});
	it.each(["asleep", "afraid", "rooted", "slowed"] as const)(
		"cannot open during a prevented action (%s)",
		(kind) => {
			const state = encounter();
			const next = resolveMonsterPhase({
				...state,
				turn: 1,
				effects: [
					{ actorId: state.monsters[0].id, floorNumber: 4, kind, remaining: 3 },
				],
			});
			expect(next.objects[0].activated).toBe(false);
		},
	);
	it("never opens elite gates or doors on inactive floors", () => {
		const state = encounter();
		expect(
			resolveMonsterPhase({
				...state,
				objects: [{ ...state.objects[0], kind: "elite-door" }],
			}).objects[0].activated,
		).toBe(false);
		expect(
			resolveMonsterPhase({ ...state, run: { ...state.run, activeFloor: 1 } })
				.objects[0].activated,
		).toBe(false);
	});
	it("retains the opened door and reproduces the next phase after save/load", () => {
		const opened = resolvePlayerAction(encounter(), { type: "wait" }).state;
		expect(opened.objects[0].activated).toBe(true);
		const parsed = parseSave(serializeSave(tacticalSnapshot(opened)));
		expect(parsed.ok).toBe(true);
		if (!parsed.ok) throw Error(parsed.error);
		expect(
			resolvePlayerAction(restoreSave(parsed.value).state, { type: "wait" })
				.state,
		).toEqual(resolvePlayerAction(opened, { type: "wait" }).state);
	});
	it("updates navigation for later actors in numeric identity order", () => {
		const state = encounter();
		const actors = [
			state.monsters[0],
			{ ...state.monsters[0], id: "4:2", coordinate: { row: 3, col: 5 } },
		];
		const forward = resolveMonsterPhase({ ...state, monsters: actors });
		const reversed = resolveMonsterPhase({
			...state,
			monsters: [...actors].reverse(),
		});
		expect(forward.objects[0].activated).toBe(true);
		expect(
			forward.monsters.find((actor) => actor.id === "4:1")?.coordinate,
		).toEqual({ row: 4, col: 6 });
		expect(
			forward.monsters.find((actor) => actor.id === "4:2")?.coordinate,
		).toEqual({ row: 4, col: 5 });
		expect(forward.activityHistory).toEqual(reversed.activityHistory);
		expect(
			forward.activityHistory.entries.filter(
				({ event }) => event.type === "monster-door-opened",
			),
		).toHaveLength(1);
	});
	it("does not open an occupied door or act after pursuit expires", () => {
		const state = encounter();
		const occupied = resolveMonsterPhase({
			...state,
			monsters: [
				...state.monsters,
				{
					...state.monsters[0],
					kind: "goblin",
					id: "4:2",
					coordinate: state.objects[0].coordinate,
				},
			],
		});
		expect(occupied.objects[0].activated).toBe(false);
		expect(
			resolveMonsterPhase({
				...state,
				monsters: [
					{
						...state.monsters[0],
						awareness: {
							type: "pursuing",
							target: state.run.playerCoordinate,
							remaining: 0,
							blocked: 0,
						},
					},
				],
			}).objects[0].activated,
		).toBe(false);
	});
	it("filters door-opening feedback when the actor is hidden", () => {
		const state = encounter();
		const opened = resolveMonsterPhase(state);
		expect(
			visibleThreatHistory(
				state.activityHistory,
				opened.activityHistory,
				opened.monsters,
				4,
				[],
			).entries,
		).toEqual(state.activityHistory.entries);
	});
	it.each([null, 12, "", "x".repeat(201)])(
		"rejects invalid actor identities in the new saved event (%s)",
		(actorId) => {
			const state = resolvePlayerAction(encounter(), { type: "wait" }).state;
			const document = tacticalSnapshot(state);
			const corrupted = {
				...document,
				state: {
					...document.state,
					activityHistory: {
						entries: [
							{
								id: 0,
								event: {
									type: "monster-door-opened",
									monster: "orc",
									actorId,
									objectId: "door",
									turn: state.turn,
								},
							},
						],
						nextId: 1,
					},
				},
			};
			expect(parseSave(JSON.stringify(corrupted)).ok).toBe(false);
		},
	);
});
