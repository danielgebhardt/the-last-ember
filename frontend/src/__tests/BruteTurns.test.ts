// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { AttackRollSource } from "../domain/game/CombatRandomness";
import {
	type PlayerAction,
	resolvePlayerAction,
} from "../domain/game/PlayerActions";
import { createBag } from "../domain/items/Bag";
import { createEquipment } from "../domain/items/Equipment";
import { createMonsterDrop } from "../domain/items/MonsterDrops";
import { bruteEncounter, preparingBrute } from "./BruteTestHelpers";

const highRolls: AttackRollSource = () => ({
	d20: () => 20,
	damage: (_min, max) => max,
});
const wait = (
	state: ReturnType<typeof bruteEncounter>,
	rolls: AttackRollSource = highRolls,
) => resolvePlayerAction(state, { type: "wait" }, rolls).state;

describe("Brute preparation and response", () => {
	it("rolls damage 4–6 and applies all armor once with a minimum of one", () => {
		const before = preparingBrute();
		before.equipment = createEquipment(
			null,
			{ id: "shield", kind: "wooden-shield" },
			{ id: "chest", kind: "chain-armor" },
			{ id: "head", kind: "iron-helmet" },
		);
		const damage = vi.fn((minimum: number) => minimum);
		const after = wait(before, () => ({ d20: () => 20, damage }));
		expect(damage).toHaveBeenCalledExactlyOnceWith(4, 6);
		expect(after.player.health).toBe(9);
	});

	it("prepares the current player tile without attacking or rolling, then strikes next turn", () => {
		const before = bruteEncounter();
		const snapshot = structuredClone(before);
		const rolls = vi.fn(highRolls);
		const prepared = wait(before, rolls);
		expect(prepared.turn).toBe(1);
		expect(prepared.player.health).toBe(10);
		expect(prepared.monsters[0]).toMatchObject({
			coordinate: { row: 4, col: 5 },
			intent: { type: "preparing-attack", target: { row: 4, col: 4 } },
		});
		expect(prepared.activityHistory.entries[0].event).toEqual({
			type: "monster-prepared",
			turn: 1,
			monster: "dungeon-brute",
			target: { row: 4, col: 4 },
		});
		expect(rolls).not.toHaveBeenCalled();
		expect(before).toEqual(snapshot);
		const struck = wait(prepared, rolls);
		expect(struck.turn).toBe(2);
		expect(struck.player.health).toBe(5);
		expect(struck.monsters[0].intent).toEqual({ type: "idle" });
		expect(rolls).toHaveBeenCalledExactlyOnceWith({
			seed: 0,
			floorNumber: 4,
			turn: 2,
			attackerId: "4:1:heavy",
			targetId: "player",
		});
		expect(struck.activityHistory.entries.at(-1)?.event).toEqual({
			type: "monster-heavy-hit",
			turn: 2,
			monster: "dungeon-brute",
			damage: 5,
		});
	});

	it("starts another preparation only on the following committed turn", () => {
		const struck = wait(preparingBrute());
		const next = wait(struck);
		expect(next.player.health).toBe(struck.player.health);
		expect(next.monsters[0].intent.type).toBe("preparing-attack");
		expect(next.activityHistory.entries.map(({ event }) => event.type)).toEqual(
			["monster-heavy-hit", "monster-prepared"],
		);
	});

	it("dodges a fixed target without a roll, retarget, movement or second attack", () => {
		const before = preparingBrute();
		const rolls = vi.fn(highRolls);
		const after = resolvePlayerAction(
			before,
			{ type: "move", direction: "left" },
			rolls,
		).state;
		expect(after.player.health).toBe(10);
		expect(after.monsters[0]).toMatchObject({
			coordinate: { row: 4, col: 5 },
			intent: { type: "idle" },
		});
		expect(after.activityHistory.entries[0].event).toEqual({
			type: "monster-heavy-avoided",
			turn: 2,
			monster: "dungeon-brute",
		});
		expect(rolls).not.toHaveBeenCalled();
		expect(before.monsters[0].intent).toEqual({
			type: "preparing-attack",
			target: { row: 4, col: 4 },
		});
	});

	it("clears a dodged attack even when the player has left detection range", () => {
		const before = preparingBrute();
		before.run = { ...before.run, playerCoordinate: { row: 12, col: 12 } };
		const after = wait(before);
		expect(after.monsters[0].intent).toEqual({ type: "idle" });
		expect(after.player.health).toBe(10);
		expect(after.activityHistory.entries[0].event.type).toBe(
			"monster-heavy-avoided",
		);
	});

	it("uses evasion and never rolls damage for a missed heavy attack", () => {
		const before = preparingBrute();
		// Level 4 (Dexterity 14) is the first evasion step: a 5 misses.
		before.progression = { experience: 60 };
		const damage = vi.fn(() => 6);
		const after = wait(before, () => ({ d20: () => 5, damage }));
		expect(after.player.health).toBe(10);
		expect(damage).not.toHaveBeenCalled();
		expect(after.monsters[0].intent.type).toBe("idle");
		expect(after.activityHistory.entries[0].event.type).toBe(
			"monster-heavy-missed",
		);
	});

	it("pursues one tile, then prepares when adjacent on a later turn", () => {
		const before = bruteEncounter();
		before.monsters = [
			{ ...before.monsters[0], coordinate: { row: 4, col: 6 } },
		];
		const moved = wait(before);
		expect(moved.monsters[0]).toMatchObject({
			coordinate: { row: 4, col: 5 },
			intent: { type: "idle" },
		});
		expect(moved.activityHistory.entries).toEqual([]);
		const prepared = wait(moved);
		expect(prepared.player.health).toBe(10);
		expect(prepared.monsters[0].intent.type).toBe("preparing-attack");
	});

	it.each([
		{ name: "wall movement", action: { type: "move", direction: "up" } },
		{ name: "missing pickup", action: { type: "pickup", itemId: "missing" } },
		{
			name: "invalid spell target",
			action: { type: "cast", spell: "magic-missile", targetId: "missing" },
		},
	] satisfies { name: string; action: PlayerAction }[])(
		"retains preparation after rejected $name",
		({ action, name }) => {
			const before = preparingBrute();
			if (name === "wall movement")
				before.run = { ...before.run, playerCoordinate: { row: 1, col: 4 } };
			const rolls = vi.fn(highRolls);
			const after = resolvePlayerAction(before, action, rolls);
			expect(after.turnAdvanced).toBe(false);
			expect(after.state).toBe(before);
			expect(rolls).not.toHaveBeenCalled();
		},
	);

	it("does not advance preparation for a free hotbar assignment", () => {
		const before = preparingBrute();
		const after = resolvePlayerAction(before, {
			type: "clear-hotbar",
			slot: 1,
		});
		expect(after.turnAdvanced).toBe(false);
		expect(after.state.monsters).toBe(before.monsters);
		expect(after.state.turn).toBe(1);
	});

	it.each([
		{ name: "wait", action: { type: "wait" }, health: 5 },
		{
			name: "potion",
			action: { type: "consume", itemId: "potion" },
			health: 5,
		},
		{ name: "Heal", action: { type: "cast", spell: "heal" }, health: 4 },
		{
			name: "Magic Missile",
			action: { type: "cast", spell: "magic-missile", targetId: "4:1" },
			health: 5,
		},
		{
			name: "equip armor",
			action: { type: "equip", itemId: "chest", slot: "chest" },
			health: 7,
		},
		{
			name: "unequip shield",
			action: { type: "unequip", slot: "offHand" },
			health: 4,
		},
		{ name: "drop", action: { type: "drop", itemId: "chest" }, health: 5 },
		{ name: "pickup", action: { type: "pickup", itemId: "ground" }, health: 5 },
		{
			name: "bump attack",
			action: { type: "move", direction: "right" },
			health: 5,
		},
	] satisfies { name: string; action: PlayerAction; health: number }[])(
		"$name spends the response turn, applying the player effect before the heavy attack",
		({ action, health }) => {
			const before = preparingBrute();
			before.bag = createBag([
				{ id: "potion", kind: "healing-potion" },
				{ id: "chest", kind: "chain-armor" },
			]);
			before.floorItems = [
				...before.floorItems,
				{
					item: { id: "ground", kind: "wooden-shield" },
					floorNumber: 4,
					coordinate: before.run.playerCoordinate,
				},
			];
			if (action.type === "consume")
				before.player = { health: 5, maxHealth: 10 };
			if (action.type === "cast" && action.spell === "heal")
				before.player = { health: 5, maxHealth: 10 };
			const after = resolvePlayerAction(before, action, highRolls);
			expect(after.turnAdvanced).toBe(true);
			expect(after.state.turn).toBe(2);
			expect(after.state.player.health).toBe(health);
			expect(after.state.monsters[0].intent.type).toBe("idle");
			expect(after.state.activityHistory.entries.at(-1)?.event.type).toBe(
				"monster-heavy-hit",
			);
		},
	);

	it("a player kill cancels preparation and grants one XP reward/drop", () => {
		const before = preparingBrute();
		before.monsters = [{ ...before.monsters[0], health: 1 }];
		const drop = createMonsterDrop(before.run.seed, before.monsters[0]);
		const killed = resolvePlayerAction(
			before,
			{ type: "move", direction: "right" },
			highRolls,
		).state;
		expect(killed.monsters).toEqual([]);
		expect(killed.monstersDefeated).toBe(1);
		expect(killed.progression.experience).toBe(12);
		expect(killed.player.health).toBe(12);
		expect(killed.floorItems).toEqual(
			drop ? [...before.floorItems, drop] : before.floorItems,
		);
		const later = wait(killed);
		expect(later.progression).toBe(killed.progression);
		expect(later.floorItems).toBe(killed.floorItems);
	});

	it("a fatal heavy attack clears its own intent and stops before the next actor", () => {
		const before = preparingBrute();
		before.player = { health: 1, maxHealth: 10 };
		before.monsters = [
			...before.monsters,
			{ ...before.monsters[0], id: "4:2", coordinate: { row: 3, col: 4 } },
		];
		const rolls = vi.fn(highRolls);
		const after = wait(before, rolls);
		expect(after.player.health).toBe(0);
		expect(after.monsters[0].intent.type).toBe("idle");
		expect(after.monsters[1]).toBe(before.monsters[1]);
		expect(rolls).toHaveBeenCalledTimes(1);
		expect(
			after.activityHistory.entries.map(({ event }) => event.type),
		).toEqual(["monster-heavy-hit", "player-died"]);
		expect(wait(after)).toBe(after);
	});
});
