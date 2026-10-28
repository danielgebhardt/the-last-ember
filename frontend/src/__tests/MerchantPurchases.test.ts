// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { initializeEconomyTelemetry } from "../domain/game/EconomyTelemetry";
import { createGameState } from "../domain/game/GameState";
import { BAG_CAPACITY, createBag } from "../domain/items/Bag";
import * as Availability from "../domain/merchant/MerchantAvailability";
import { resolvePlayerActionWithHits as resolvePlayerAction } from "./ControlledCombatTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";

const shop = () => ({
	...createGameState(createCorridorEncounter()),
	gold: 2000,
	bag: createBag(),
	potionHotbar: [null, null, null, null] as const,
	monsters: [],
	floorItems: [],
	objects: [
		{
			id: "floor:1:object:merchant:1",
			kind: "merchant" as const,
			floorNumber: 1,
			coordinate: { row: 1, col: 2 },
			activated: false,
		},
	],
});
const buy = {
	type: "buy" as const,
	merchantId: "floor:1:object:merchant:1",
	kind: "healing-potion" as const,
};
describe("Merchant purchases", () => {
	it("transfers one unique bottle, charges gold, decrements shared stock and auto-assigns a shortcut", () => {
		const before = initializeEconomyTelemetry(shop()),
			first = resolvePlayerAction(before, buy),
			second = resolvePlayerAction(first.state, buy);
		expect(first.turnAdvanced).toBe(true);
		expect(first.state.turn).toBe(1);
		expect(first.state.gold).toBe(1850);
		expect(first.state.merchantStock["healing-potion"]).toBe(9);
		expect(first.state.bag.items).toHaveLength(1);
		expect(first.state.potionHotbar[0]).toBe("healing-potion");
		expect(second.state.bag.items).toHaveLength(2);
		expect(
			second.state.economyTelemetry?.floors[1]?.purchases["dungeon-merchant"]?.[
				"healing-potion"
			],
		).toEqual({ quantity: 2, gold: 300 });
		expect(
			second.state.economyTelemetry?.floors[1]?.acquired["healing-potion"],
		).toBe(2);
		expect(new Set(second.state.bag.items.map((i) => i.id)).size).toBe(2);
		expect(second.state.merchantStock["healing-potion"]).toBe(8);
		expect(before.merchantStock["healing-potion"]).toBe(10);
	});
	it.each(["poor", "sold out", "full", "out of reach"])(
		"rejects %s without changing any state or advancing time",
		(reason) => {
			let state = shop();
			if (reason === "poor") state = { ...state, gold: 149 };
			if (reason === "sold out")
				state = {
					...state,
					merchantStock: { ...state.merchantStock, "healing-potion": 0 },
				};
			if (reason === "full")
				state = {
					...state,
					bag: createBag(
						Array.from({ length: BAG_CAPACITY }, (_, i) => ({
							id: `bag:${i}`,
							kind: "short-sword" as const,
						})),
					),
				};
			if (reason === "out of reach") state = { ...state, objects: [] };
			const result = resolvePlayerAction(state, buy);
			expect(result.state).toBe(state);
			expect(result.turnAdvanced).toBe(false);
			expect(result.error).toBeTruthy();
		},
	);
	it("rejects trades when the developer flag disables saved merchants", () => {
		const state = shop();
		vi.spyOn(Availability, "merchantsEnabled").mockReturnValueOnce(false);
		const result = resolvePlayerAction(state, buy);
		expect(result.state).toBe(state);
		expect(result.turnAdvanced).toBe(false);
	});
	it("accepts an existing stack when every bag slot is occupied", () => {
		const state = {
			...shop(),
			bag: createBag([
				{ id: "bag:potion", kind: "healing-potion" },
				...Array.from({ length: BAG_CAPACITY - 1 }, (_, i) => ({
					id: `bag:${i}`,
					kind: "short-sword" as const,
				})),
			]),
		};
		const result = resolvePlayerAction(state, buy);
		expect(result.turnAdvanced).toBe(true);
		expect(result.state.bag.items).toHaveLength(BAG_CAPACITY + 1);
	});
	it("grants exactly one monster response and keeps the purchased bottle after a fatal trade", () => {
		const initial = shop();
		const state = {
			...initial,
			player: { health: 1, maxHealth: 10 },
			monsters: [
				{
					id: "1:1",
					kind: "goblin" as const,
					floorNumber: 1,
					coordinate: { row: 1, col: 2 },
					health: 4,
					intent: { type: "idle" as const },
				},
			],
		};
		const result = resolvePlayerAction(state, buy);
		expect(result.state.player.health).toBe(0);
		expect(result.state.turn).toBe(1);
		expect(result.state.bag.items).toHaveLength(1);
		expect(
			result.state.activityHistory.entries.filter(
				(e) => e.event.type === "monster-hit",
			),
		).toHaveLength(1);
	});
});
