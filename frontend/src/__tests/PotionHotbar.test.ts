// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createGameState } from "../domain/game/GameState";
import { createBag } from "../domain/items/Bag";
import { hotbarSlotContents } from "../domain/items/PotionHotbar";
import { resolvePlayerActionWithHits as resolvePlayerAction } from "./ControlledCombatTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";

const potion = { id: "potion:1", kind: "healing-potion" } as const;
const second = { id: "potion:2", kind: "healing-potion" } as const;
const game = () => ({
	...createGameState(createCorridorEncounter()),
	monsters: [],
	potionHotbar: [null, null, null, null] as const,
	player: { health: 1, maxHealth: 10 },
	bag: createBag([potion, second]),
});
const assigned = () =>
	resolvePlayerAction(game(), {
		type: "assign-hotbar",
		slot: 1,
		itemId: potion.id,
	}).state;

describe("Potion hotbar assignments", () => {
	it("supports four empty slots when no potions are assigned", () => {
		expect(game().potionHotbar).toEqual([null, null, null, null]);
	});
	it("assigns without transferring ownership, spending a turn, or waking monsters", () => {
		const before = {
			...game(),
			monsters: [
				{
					intent: { type: "idle" as const },
					id: "1:1",
					kind: "goblin" as const,
					floorNumber: 1,
					coordinate: { row: 1, col: 2 },
					health: 4,
				},
			],
		};
		const snapshot = structuredClone(before);
		const result = resolvePlayerAction(before, {
			type: "assign-hotbar",
			slot: 2,
			itemId: potion.id,
		});
		expect(result.state.potionHotbar).toEqual([
			null,
			"healing-potion",
			null,
			null,
		]);
		expect(result.state.bag).toBe(before.bag);
		expect(result.state.turn).toBe(0);
		expect(result.state.player.health).toBe(1);
		expect(result.turnAdvanced).toBe(false);
		expect(result.state.activityHistory).toBe(before.activityHistory);
		expect(result.state.monsters).toBe(before.monsters);
		expect(before).toEqual(snapshot);
	});
	it("moves a kind to another slot rather than creating duplicate assignments", () => {
		const before = assigned();
		const moved = resolvePlayerAction(before, {
			type: "assign-hotbar",
			slot: 4,
			itemId: second.id,
		}).state;
		expect(moved.potionHotbar).toEqual([null, null, null, "healing-potion"]);
		expect(before.potionHotbar).toEqual(["healing-potion", null, null, null]);
		expect(
			resolvePlayerAction(moved, {
				type: "assign-hotbar",
				slot: 4,
				itemId: potion.id,
			}).state,
		).toBe(moved);
	});
	it("clears a slot for free and treats clearing an empty slot as a no-op", () => {
		const before = assigned();
		const cleared = resolvePlayerAction(before, {
			type: "clear-hotbar",
			slot: 1,
		});
		expect(cleared.state.potionHotbar).toEqual([null, null, null, null]);
		expect(cleared.turnAdvanced).toBe(false);
		expect(
			resolvePlayerAction(cleared.state, { type: "clear-hotbar", slot: 1 })
				.state,
		).toBe(cleared.state);
	});
	it.each(["missing", "sword"])("rejects assigning %s", (itemId) => {
		const before = {
			...game(),
			bag: createBag([potion, { id: "sword", kind: "iron-sword" }]),
		};
		const result = resolvePlayerAction(before, {
			type: "assign-hotbar",
			slot: 1,
			itemId,
		});
		expect(result.state).toBe(before);
		expect(result.error).toBeTruthy();
	});
	it("resets assignments on replay", () => {
		const before = assigned();
		expect(createGameState(before.run).potionHotbar).toEqual([
			"healing-potion",
			"mana-potion",
			"greater-healing-potion",
			"greater-mana-potion",
		]);
	});
});
describe("Using assigned potions", () => {
	it("consumes the first matching bag copy and keeps the kind assigned for the next", () => {
		const before = assigned();
		const used = resolvePlayerAction(before, { type: "use-hotbar", slot: 1 });
		expect(used.turnAdvanced).toBe(true);
		expect(used.state.turn).toBe(1);
		expect(used.state.player.health).toBe(6);
		expect(used.state.bag.items).toEqual([second]);
		expect(used.state.potionHotbar).toBe(before.potionHotbar);
		expect(hotbarSlotContents(used.state, 1)).toMatchObject({
			kind: "healing-potion",
			count: 1,
		});
	});
	it("updates availability after dropping, picking up, and direct consumption", () => {
		const before = { ...assigned(), bag: createBag([potion]) };
		const dropped = resolvePlayerAction(before, {
			type: "drop",
			itemId: potion.id,
		}).state;
		expect(hotbarSlotContents(dropped, 1).count).toBe(0);
		const picked = resolvePlayerAction(dropped, {
			type: "pickup",
			itemId: potion.id,
		}).state;
		expect(hotbarSlotContents(picked, 1).count).toBe(1);
		const used = resolvePlayerAction(picked, {
			type: "consume",
			itemId: potion.id,
		}).state;
		expect(hotbarSlotContents(used, 1)).toMatchObject({
			kind: "healing-potion",
			count: 0,
		});
	});
	it.each(["empty", "unavailable", "full health"])(
		"rejects %s use without spending a turn or item",
		(scenario) => {
			const initial = assigned();
			const before =
				scenario === "unavailable"
					? { ...initial, bag: createBag() }
					: scenario === "full health"
						? { ...initial, player: { health: 10, maxHealth: 10 } }
						: initial;
			const result = resolvePlayerAction(before, {
				type: "use-hotbar",
				slot: scenario === "empty" ? 2 : 1,
			});
			expect(result.state).toBe(before);
			expect(result.turnAdvanced).toBe(false);
			expect(result.error).toBeTruthy();
		},
	);
	it("heals before exactly one monster phase using the existing consumption event", () => {
		const before = {
			...assigned(),
			monsters: [
				{
					intent: { type: "idle" as const },
					id: "1:1",
					kind: "goblin" as const,
					floorNumber: 1,
					coordinate: { row: 1, col: 2 },
					health: 4,
				},
			],
		};
		const used = resolvePlayerAction(before, {
			type: "use-hotbar",
			slot: 1,
		}).state;
		expect(used.player.health).toBe(5);
		expect(
			used.activityHistory.entries.map((entry) => entry.event.type),
		).toEqual(["item-consumed", "monster-hit"]);
	});
	it("prevents activation after death", () => {
		const before = { ...assigned(), player: { health: 0, maxHealth: 10 } };
		expect(
			resolvePlayerAction(before, { type: "use-hotbar", slot: 1 }),
		).toEqual({ state: before, turnAdvanced: false });
	});
});
