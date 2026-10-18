// @vitest-environment node

import { describe, expect, it } from "vitest";
import { createGameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { BAG_CAPACITY, bagSlots, createBag } from "../domain/items/Bag";
import type { ItemInstance, ItemKind } from "../domain/items/Item";
import { parseSave, serializeSave } from "../domain/saves/SaveFormat";
import { savedAdventure } from "./SaveTestHelpers";
import { createThreeFloorTraversalRun } from "./testhelpers";

const copies = (kind: ItemKind, count: number): ItemInstance[] =>
	Array.from({ length: count }, (_, i) => ({ id: `${kind}:${i}`, kind }));

describe("Potion stacks and 27 bag slots", () => {
	it("groups identical potion copies while retaining their identities and separate gear", () => {
		const items = [
			...copies("healing-potion", 30),
			...copies("greater-healing-potion", 2),
			...copies("short-sword", 2),
		];
		const bag = createBag(items);
		expect(BAG_CAPACITY).toBe(27);
		expect(bag.items).toEqual(items);
		expect(bagSlots(bag).map(({ item, count }) => [item.kind, count])).toEqual([
			["healing-potion", 30],
			["greater-healing-potion", 2],
			["short-sword", 1],
			["short-sword", 1],
		]);
	});
	it("accepts a matching potion into a full bag but rejects a new kind for free", () => {
		const initial = {
			...createGameState(createThreeFloorTraversalRun()),
			monsters: [],
			bag: createBag([
				...copies("short-sword", 26),
				...copies("healing-potion", 2),
			]),
		};
		const matching = {
			item: { id: "found:heal", kind: "healing-potion" as const },
			floorNumber: 1,
			coordinate: initial.run.playerCoordinate,
		};
		const mana = {
			...matching,
			item: { id: "found:mana", kind: "mana-potion" as const },
		};
		const state = { ...initial, floorItems: [matching, mana] };
		const rejected = resolvePlayerAction(state, {
			type: "pickup",
			itemId: mana.item.id,
		});
		expect(rejected.state).toBe(state);
		expect(rejected.error).toMatch(/full/i);
		const picked = resolvePlayerAction(state, {
			type: "pickup",
			itemId: matching.item.id,
		});
		expect(picked.state.turn).toBe(1);
		expect(bagSlots(picked.state.bag)).toHaveLength(27);
		expect(
			picked.state.bag.items.filter((i) => i.kind === "healing-potion"),
		).toHaveLength(3);
	});
	it("drinks or drops one owned bottle and removes only the final stack member", () => {
		const bottles = copies("healing-potion", 2);
		const initial = {
			...createGameState(createThreeFloorTraversalRun()),
			monsters: [],
			player: { health: 1, maxHealth: 10 },
			bag: createBag(bottles),
		};
		const drank = resolvePlayerAction(initial, {
			type: "consume",
			itemId: bottles[0].id,
		}).state;
		expect(drank.bag.items).toEqual([bottles[1]]);
		expect(bagSlots(drank.bag)[0].count).toBe(1);
		const dropped = resolvePlayerAction(drank, {
			type: "drop",
			itemId: bottles[1].id,
		}).state;
		expect(bagSlots(dropped.bag)).toEqual([]);
		expect(dropped.floorItems.some((e) => e.item.id === bottles[1].id)).toBe(
			true,
		);
	});
	it("rejects 28 individual gear slots and duplicate bottle identities", () => {
		expect(() => createBag(copies("short-sword", 28))).toThrow(/27/);
		const bottle = copies("mana-potion", 1)[0];
		expect(() => createBag([bottle, bottle])).toThrow(/same item/i);
	});
	it("rejects saved bags with too many slots, duplicate ownership or malformed bottles", () => {
		const document = savedAdventure();
		for (const items of [
			copies("short-sword", 28),
			[
				{ id: "same", kind: "mana-potion" },
				{ id: "same", kind: "mana-potion" },
			],
			[{ id: "bad", kind: "unknown-potion" }],
		]) {
			expect(
				parseSave(
					JSON.stringify({
						...document,
						state: { ...document.state, bag: { items } },
					}),
				).ok,
			).toBe(false);
		}
	});
	it("round-trips more than twenty bottles without losing copies", () => {
		const current = savedAdventure();
		current.state.bag = createBag(copies("mana-potion", 40));
		expect(parseSave(serializeSave(current))).toEqual({
			ok: true,
			value: current,
		});
	});
});
