import { afterEach, describe, expect, it } from "vitest";
import {
	type AttackContext,
	type AttackRollSource,
	createAttackRolls,
} from "../domain/game/CombatRandomness";
import type { GameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import {
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { readAdventureFile } from "../persistence/AdventureSaveFiles";
import {
	LOCAL_SAVE_KEY,
	readLocalSave,
	writeLocalSave,
} from "../persistence/LocalAdventureSave";
import {
	afterMixedEncounter,
	mixedEncounter,
	mixedFollowUp,
	preparedMixedEncounter,
	tacticalSnapshot,
} from "./TacticalReplayTestHelpers";

// Record real seeded rolls, rather than substituting guaranteed hits.
const recordedRolls = () => {
	const trace: { context: AttackContext; purpose: string; value: number }[] =
		[];
	const source: AttackRollSource = (context) => {
		const rolls = createAttackRolls(context);
		return {
			d20: () => {
				const value = rolls.d20();
				trace.push({ context, purpose: "hit", value });
				return value;
			},
			damage: (min, max) => {
				const value = rolls.damage(min, max);
				trace.push({ context, purpose: "damage", value });
				return value;
			},
		};
	};
	return { source, trace };
};
afterEach(() => localStorage.clear());

describe("Tactical save and deterministic continuation", () => {
	it.each([
		{ name: "facing an idle archer and brute", state: mixedEncounter },
		{
			name: "immediately after preparation and an archer shot",
			state: preparedMixedEncounter,
		},
		{ name: "after mixed kills and recovery", state: afterMixedEncounter },
	])(
		"continues identically through local load and file import $name",
		async ({ state }) => {
			let uninterrupted = state();
			const snapshot = tacticalSnapshot(uninterrupted);
			expect(writeLocalSave(snapshot).ok).toBe(true);
			const local = readLocalSave();
			const imported = await readAdventureFile(
				new File([serializeSave(snapshot)], "tactics.json"),
			);
			if (!local.ok || !local.value || !imported.ok)
				throw new Error("Valid tactical saves must load.");
			let loaded = restoreSave(local.value).state;
			let fromFile = restoreSave(imported.value).state;
			expect(loaded).toEqual(uninterrupted);
			expect(fromFile).toEqual(uninterrupted);
			const streams = [recordedRolls(), recordedRolls(), recordedRolls()];
			// Give the surviving brute time to approach and resolve another attack,
			// including when the checkpoint already starts after the two kills.
			const actions = [
				...mixedFollowUp,
				...Array.from({ length: 6 }, () => ({ type: "wait" as const })),
			];
			for (const action of actions) {
				const original = resolvePlayerAction(
					uninterrupted,
					action,
					streams[0].source,
				);
				const localResult = resolvePlayerAction(
					loaded,
					action,
					streams[1].source,
				);
				const fileResult = resolvePlayerAction(
					fromFile,
					action,
					streams[2].source,
				);
				expect(localResult, JSON.stringify(action)).toEqual(original);
				expect(fileResult, JSON.stringify(action)).toEqual(original);
				expect(streams[1].trace).toEqual(streams[0].trace);
				expect(streams[2].trace).toEqual(streams[0].trace);
				uninterrupted = original.state;
				loaded = localResult.state;
				fromFile = fileResult.state;
			}
			expect(streams[0].trace.length).toBeGreaterThan(0);
		},
	);

	it("exercises actual preparation, shots, kills and a seeded drop in the replay fixture", () => {
		const prepared = preparedMixedEncounter();
		expect(prepared.monsters[0].intent.type).toBe("preparing-attack");
		expect(
			prepared.activityHistory.entries.some(({ event }) =>
				event.type.startsWith("monster-shot-"),
			),
		).toBe(true);
		const result = afterMixedEncounter();
		expect(result.player.health).toBeGreaterThan(0);
		expect(result.monstersDefeated).toBe(2);
		expect(result.monsters.map(({ kind }) => kind)).toEqual(["dungeon-brute"]);
		expect(
			result.floorItems.some(({ item }) => item.id === "monster:4:3:loot"),
		).toBe(true);
		expect(
			result.activityHistory.entries.some(
				({ event }) => event.type === "monster-heavy-avoided",
			),
		).toBe(true);
	});

	it.each([
		"malformed intent",
		"out-of-bounds target",
		"protected actor location",
	])(
		"rejects %s through both adapters without replacing the slot or current state",
		async (fault) => {
			const current = preparedMixedEncounter();
			const previous = tacticalSnapshot(current);
			writeLocalSave(previous);
			const bytes = localStorage.getItem(LOCAL_SAVE_KEY);
			const invalid = structuredClone(previous);
			const brute = invalid.state.monsters[0];
			if (fault === "malformed intent")
				Reflect.set(brute, "intent", { type: "charging" });
			else if (fault === "out-of-bounds target")
				Reflect.set(brute, "intent", {
					type: "preparing-attack",
					target: { row: 15, col: 4 },
				});
			else {
				const stair = invalid.state.run.floors[3].downStair;
				if (!stair) throw new Error("Floor 4 needs its protected down stair.");
				brute.coordinate = stair.coordinate;
			}
			expect(writeLocalSave(invalid).ok).toBe(false);
			expect(
				(
					await readAdventureFile(
						new File([serializeSave(invalid)], "invalid.json"),
					)
				).ok,
			).toBe(false);
			expect(localStorage.getItem(LOCAL_SAVE_KEY)).toBe(bytes);
			expect(current).toEqual(restoreSave(previous).state);
		},
	);

	it("keeps death and victory terminal after saving pending tactical intent", () => {
		let dead = preparedMixedEncounter();
		for (let turn = 0; turn < 20 && dead.player.health > 0; turn++)
			dead = resolvePlayerAction(dead, { type: "wait" }).state;
		expect(dead.player.health).toBe(0);
		const before = mixedEncounter();
		const won = resolvePlayerAction(
			{
				...before,
				run: {
					...before.run,
					activeFloor: 1,
					playerCoordinate: { row: 1, col: 2 },
				},
				quest: {
					...before.quest,
					entrance: { row: 1, col: 1 },
					cureRecovered: true,
				},
				floorItems: [],
				monsters: preparedMixedEncounter().monsters,
			},
			{ type: "move", direction: "left" },
		).state;
		expect(won.quest.victory).not.toBeNull();
		for (const ended of [dead, won]) {
			const parsed = parseSave(serializeSave(tacticalSnapshot(ended)));
			if (!parsed.ok) throw new Error(parsed.error);
			const restored: GameState = restoreSave(parsed.value).state;
			expect(restored).toEqual(ended);
			for (const action of mixedFollowUp)
				expect(resolvePlayerAction(restored, action).state).toBe(restored);
		}
	});
});
