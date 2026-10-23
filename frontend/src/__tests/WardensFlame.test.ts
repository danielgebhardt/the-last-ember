// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { questInstruction } from "../domain/game/Adventure";
import { createGameState, type GameState } from "../domain/game/GameState";
import { damageMonster } from "../domain/game/MonsterDamage";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { isWarden } from "../domain/monsters/EmberWarden";
import {
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { tacticalSnapshot } from "./TacticalReplayTestHelpers";
import { COMPACT_TEST_CONFIGURATION as config } from "./TestRunConfiguration";

const adventure = (seed = 123) =>
	createGameState(connectDungeonFloors(generateDungeonRun(seed, 5, config)));
const wardenOf = (state: GameState) => {
	const warden = state.monsters.find(isWarden);
	if (!warden) throw new Error("Expected an Ember Warden");
	return warden;
};
const flames = (state: GameState) =>
	state.floorItems.filter((entry) => entry.item.kind === "cure");
// The Warden falls to a single blow, wherever it stands.
const slay = (state: GameState) =>
	damageMonster(state, wardenOf(state), 9999, { type: "player-hit" });
const standOn = (state: GameState, at: { row: number; col: number }) => ({
	...state,
	run: { ...state.run, activeFloor: 5, playerCoordinate: { ...at } },
});
const pickUpFlame = (state: GameState) =>
	resolvePlayerAction(state, { type: "pickup", itemId: "quest:cure" }).state;
const loads = (state: GameState) => {
	const parsed = parseSave(serializeSave(tacticalSnapshot(state)));
	return parsed.ok ? restoreSave(parsed.value).state : null;
};

describe("The Warden's Flame", () => {
	it("always falls where the Warden dies, beside its reward, without claiming it", () => {
		for (let seed = 1; seed <= 12; seed += 1) {
			const before = adventure(seed);
			const warden = wardenOf(before);
			expect(flames(before)).toEqual([]);
			const after = slay(before);
			expect(after.monsters.some(isWarden)).toBe(false);
			expect(flames(after)).toEqual([
				{
					item: { id: "quest:cure", kind: "cure" },
					floorNumber: 5,
					coordinate: warden.coordinate,
				},
			]);
			// The +2 reward shares the tile, forming an ordinary pile.
			expect(
				after.floorItems.filter(
					(entry) =>
						entry.coordinate.row === warden.coordinate.row &&
						entry.coordinate.col === warden.coordinate.col,
				).length,
			).toBeGreaterThanOrEqual(2);
			expect(after.quest.cureRecovered).toBe(false);
			expect(after.escape).toBeNull();
			expect(after.bag).toEqual(before.bag);
			expect(
				after.activityHistory.entries.some(
					(entry) => entry.event.type === "warden-fell",
				),
			).toBe(true);
			expect(slay(adventure(seed))).toEqual(after);
		}
	});

	it("never drops a second flame when one already lies on the floor or was claimed", () => {
		const fallen = slay(adventure());
		const legacy = {
			...adventure(),
			floorItems: [...adventure().floorItems, ...flames(fallen)],
		};
		expect(flames(slay(legacy))).toHaveLength(1);
		const claimed = {
			...adventure(),
			quest: { ...adventure().quest, cureRecovered: true },
		};
		expect(flames(slay(claimed))).toEqual([]);
	});

	it("is claimed by hand from the pile, uses no bag slot, and only then starts the escape", () => {
		const fallen = slay(adventure());
		const at = flames(fallen)[0].coordinate;
		const ready = standOn(fallen, at);
		const claimed = pickUpFlame(ready);
		expect(flames(claimed)).toEqual([]);
		expect(claimed.quest.cureRecovered).toBe(true);
		expect(claimed.bag.items).toHaveLength(ready.bag.items.length);
		expect(claimed.escape).toEqual({
			// The pickup's own turn.
			startedTurn: ready.turn + 1,
			activatedFloors: [],
		});
		const events = claimed.activityHistory.entries.map((e) => e.event.type);
		expect(events).toContain("escape-started");
		// The Warden is gone, so nothing enrages.
		expect(events).not.toContain("warden-enraged");
		// Claiming the flame is not victory: the return still waits.
		expect(claimed.quest.victory).toBeNull();
		// The Warden's reward is still on the tile for a later pickup.
		expect(
			claimed.floorItems.some(
				(e) => e.coordinate.row === at.row && e.coordinate.col === at.col,
			),
		).toBe(true);
	});

	it("tracks the objective from the Warden to the flame to the return", () => {
		const start = adventure();
		expect(questInstruction(start.quest)).toBe(
			"Defeat the Ember Warden on floor 5 and claim its flame.",
		);
		expect(questInstruction(start.quest, false)).toBe(
			"Claim the Warden's Flame on floor 5.",
		);
		expect(questInstruction({ ...start.quest, cureRecovered: true })).toBe(
			"Escape the depths. Return to the entrance on floor 1.",
		);
	});

	it("saves and resumes each stage, and rejects an adventure that lost its flame", () => {
		const start = adventure();
		expect(loads(start)).toEqual(start);
		const fallen = slay(start);
		expect(loads(fallen)).toEqual(fallen);
		const claimed = pickUpFlame(standOn(fallen, flames(fallen)[0].coordinate));
		expect(loads(claimed)).toEqual(claimed);
		// No flame on the floor, none claimed, and no Warden to carry it: unwinnable.
		const lost = {
			...start,
			monsters: start.monsters.filter((monster) => !isWarden(monster)),
		};
		expect(loads(lost)).toBeNull();
	});
});
