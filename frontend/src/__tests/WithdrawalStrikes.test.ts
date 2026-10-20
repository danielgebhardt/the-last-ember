// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { AttackRollSource } from "../domain/game/CombatRandomness";
import type { GameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import type { MonsterKind } from "../domain/monsters/Monster";
import { bruteEncounter, preparingBrute } from "./BruteTestHelpers";

const highRolls: AttackRollSource = () => ({
	d20: () => 20,
	damage: (_min, max) => max,
});
// The player stands at 4,4 with the monster east at 4,5; "left" steps away.
const encounter = (kind: MonsterKind, health = 10): GameState => {
	const state = bruteEncounter();
	return {
		...state,
		player: { ...state.player, health },
		monsters: state.monsters.map((monster) => ({ ...monster, kind })),
	};
};
const stepAway = (state: GameState, rolls: AttackRollSource = highRolls) =>
	resolvePlayerAction(state, { type: "move", direction: "left" }, rolls);
const eventTypes = (state: GameState) =>
	state.activityHistory.entries.map(({ event }) => event.type);

describe("adjacent monsters strike before the player steps away", () => {
	it("lets an adjacent melee monster strike once from the original tile, then the step lands", () => {
		const before = encounter("orc");
		const rolls = vi.fn(highRolls);
		const after = stepAway(before, rolls);
		expect(after.turnAdvanced).toBe(true);
		expect(after.state.run.playerCoordinate).toEqual({ row: 4, col: 3 });
		expect(after.state.player.health).toBeLessThan(10);
		// The strike was its turn: no pursuit step and no second attack.
		expect(after.state.monsters[0].coordinate).toEqual({ row: 4, col: 5 });
		expect(rolls).toHaveBeenCalledExactlyOnceWith({
			seed: 0,
			floorNumber: 4,
			turn: 1,
			attackerId: "4:1",
			targetId: "player",
		});
		expect(after.state.activityHistory.entries.at(-1)?.event).toEqual({
			type: "monster-withdrawal-hit",
			turn: 1,
			monster: "orc",
			damage: 10 - after.state.player.health,
		});
	});

	it("records a miss as you step away without damage", () => {
		const after = stepAway(encounter("orc"), () => ({
			d20: () => 1,
			damage: (min) => min,
		}));
		expect(after.state.player.health).toBe(10);
		expect(after.state.run.playerCoordinate).toEqual({ row: 4, col: 3 });
		expect(eventTypes(after.state)).toEqual(["monster-withdrawal-missed"]);
	});

	it("ends the adventure on the original tile when the strike is lethal", () => {
		const after = stepAway(encounter("orc", 1));
		expect(after.state.player.health).toBe(0);
		expect(after.state.run.playerCoordinate).toEqual({ row: 4, col: 4 });
		expect(eventTypes(after.state)).toEqual([
			"monster-withdrawal-hit",
			"player-died",
		]);
	});

	it("keeps a telegraphed heavy attack dodgeable by stepping off its tile", () => {
		const after = stepAway(preparingBrute());
		expect(after.state.player.health).toBe(10);
		expect(eventTypes(after.state)).toEqual(["monster-heavy-avoided"]);
	});

	it.each([
		["a brute that would begin a heavy attack", "dungeon-brute"],
		["a caster", "cultist"],
		["an alarm sentry", "alarm-sentry"],
	] as const)("gives %s no early strike", (_label, kind) => {
		const after = stepAway(encounter(kind));
		expect(after.state.run.playerCoordinate).toEqual({ row: 4, col: 3 });
		expect(
			eventTypes(after.state).some((type) =>
				type.startsWith("monster-withdrawal"),
			),
		).toBe(false);
	});

	it("gives a sleeping monster no early strike", () => {
		const before = encounter("orc");
		const after = stepAway({
			...before,
			effects: [
				{ kind: "asleep", actorId: "4:1", floorNumber: 4, remaining: 3 },
			],
		});
		expect(after.state.player.health).toBe(10);
		expect(after.state.run.playerCoordinate).toEqual({ row: 4, col: 3 });
	});

	it("triggers no early strike when the player attacks instead of stepping", () => {
		const after = resolvePlayerAction(
			encounter("orc"),
			{ type: "move", direction: "right" },
			highRolls,
		);
		expect(after.state.run.playerCoordinate).toEqual({ row: 4, col: 4 });
		expect(
			eventTypes(after.state).some((type) =>
				type.startsWith("monster-withdrawal"),
			),
		).toBe(false);
	});

	it("leaves monsters that were not adjacent to act after the step", () => {
		const before = encounter("orc");
		const after = stepAway({
			...before,
			monsters: before.monsters.map((monster) => ({
				...monster,
				coordinate: { row: 4, col: 6 },
			})),
		});
		expect(after.state.player.health).toBe(10);
		expect(after.state.monsters[0].coordinate).toEqual({ row: 4, col: 5 });
	});

	it("resolves identically when replayed", () => {
		const first = stepAway(encounter("orc"), undefined);
		const second = stepAway(encounter("orc"), undefined);
		expect(second.state).toEqual(first.state);
	});
});
