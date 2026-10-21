// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { updateExploration } from "../domain/dungeon/Exploration";
import { DEFAULT_FOG_CONFIGURATION } from "../domain/dungeon/RunConfiguration";
import { createGameState, type GameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
} from "../domain/saves/SaveFormat";
import {
	createTownScrollStock,
	TOWN_SCROLL_OFFERS,
	type TownScroll,
} from "../domain/town/TownEconomy";
import { createTownLocation } from "../domain/town/TownLocation";
import { COMPACT_TEST_CONFIGURATION as config } from "./TestRunConfiguration";

// Beside the Market Street scroll shop doorway.
const shopState = (): GameState => ({
	...createGameState(connectDungeonFloors(generateDungeonRun(123, 5, config))),
	town: { ...createTownLocation(), coordinate: { row: 13, col: 20 } },
	gold: 1000,
	turn: 12,
});
const buy = (
	state: GameState,
	kind: TownScroll = "exit-scroll",
	expectedStock: number = TOWN_SCROLL_OFFERS[kind].quantity,
) =>
	resolvePlayerAction(state, { type: "buy-town-scroll", kind, expectedStock });

describe("finite town scroll purchases", () => {
	it("stocks three portal scrolls at 200 and two Remove Curse at 375, and no Enchantment", () => {
		expect(createTownScrollStock()).toEqual({
			"exit-scroll": 3,
			"remove-curse-scroll": 2,
		});
		expect(TOWN_SCROLL_OFFERS["exit-scroll"].price).toBe(200);
		expect(TOWN_SCROLL_OFFERS["remove-curse-scroll"].price).toBe(375);
		expect(Object.hasOwn(TOWN_SCROLL_OFFERS, "enchantment-scroll")).toBe(false);
	});

	it("spends gold, adds a numbered scroll and records the sale without a dungeon turn", () => {
		const state = shopState();
		const next = buy(state);
		expect(next.error).toBeUndefined();
		expect(next.turnAdvanced).toBe(false);
		expect(next.state.gold).toBe(800);
		expect(next.state.turn).toBe(12);
		expect(next.state.townScrollStock["exit-scroll"]).toBe(2);
		expect(next.state.townPotionStock).toBe(state.townPotionStock);
		expect(next.state.potionHotbar).toEqual(state.potionHotbar);
		expect(next.state.bag.items.at(-1)).toEqual({
			id: "town-scroll:exit-scroll:1",
			kind: "exit-scroll",
		});
		expect(next.state.activityHistory.entries.at(-1)?.event).toMatchObject({
			type: "merchant-bought",
			item: "exit-scroll",
			gold: 200,
		});
	});

	it("sells out after the authored quantity and never restocks", () => {
		let state = shopState();
		for (const stock of [2, 1]) {
			const result = buy(state, "remove-curse-scroll", stock);
			expect(result.error).toBeUndefined();
			state = { ...state, ...result.state };
		}
		expect(state.townScrollStock["remove-curse-scroll"]).toBe(0);
		expect(state.gold).toBe(250);
		const soldOut = buy(state, "remove-curse-scroll", 0);
		expect(soldOut.error).toBe("That scroll is sold out for this adventure.");
		expect(soldOut.state).toBe(state);
	});

	it("rejects stale quotes, too little gold, a full bag and the wrong counter", () => {
		const state = shopState();
		const stale = buy(buy(state).state, "exit-scroll", 3);
		expect(stale.error).toMatch(/changed/i);
		const poor = { ...state, gold: 199 };
		expect(buy(poor).error).toBe("You do not have enough gold.");
		const full = {
			...state,
			bag: {
				items: Array.from({ length: 27 }, (_, i) => ({
					id: `bag:${i}`,
					kind: "short-sword" as const,
				})),
			},
		};
		expect(buy(full).error).toBe(
			"Your bag is full. Make room for a new scroll kind.",
		);
		// The potion counter does not sell scrolls, and the scroll shop does not sell potions.
		const atPotions = {
			...state,
			town: { ...createTownLocation(), coordinate: { row: 13, col: 3 } },
		};
		expect(buy(atPotions).error).toBe(
			"Stand beside the open scroll shop to trade.",
		);
		expect(
			resolvePlayerAction(state, {
				type: "buy-town-potion",
				kind: "antidote",
				expectedStock: 4,
			}).error,
		).toBe("Stand beside the open town potion store to trade.");
		expect(buy(state, "enchantment-scroll" as TownScroll, 1).error).toBe(
			"That scroll is not offered.",
		);
	});

	it("persists stock and bought copies, and rejects forged refills or copies", () => {
		const next = buy(shopState()).state;
		const doc = createSaveDocument(
			next,
			updateExploration(next.run, 8),
			config,
			DEFAULT_FOG_CONFIGURATION,
		);
		const parsed = parseSave(JSON.stringify(doc));
		if (!parsed.ok) throw new Error(parsed.error);
		const loaded = restoreSave(parsed.value).state;
		expect(loaded.townScrollStock).toEqual(next.townScrollStock);
		expect(loaded.bag).toEqual(next.bag);
		const refilled = {
			...doc,
			state: { ...doc.state, townScrollStock: createTownScrollStock() },
		};
		expect(parseSave(JSON.stringify(refilled)).ok).toBe(false);
		const extra = {
			...doc,
			state: {
				...doc.state,
				bag: {
					items: [
						...doc.state.bag.items,
						{ id: "town-scroll:exit-scroll:2", kind: "exit-scroll" },
					],
				},
			},
		};
		expect(parseSave(JSON.stringify(extra)).ok).toBe(false);
	});

	it("a bought portal scroll opens a town portal from the dungeon", () => {
		const bought = buy(shopState()).state;
		const dungeon = { ...bought, town: null, monsters: [] };
		const read = resolvePlayerAction(dungeon, {
			type: "exit-dungeon",
			itemId: "town-scroll:exit-scroll:1",
		});
		expect(read.error).toBeUndefined();
		expect(read.state.town).not.toBeNull();
		expect(
			read.state.bag.items.some((i) => i.id === "town-scroll:exit-scroll:1"),
		).toBe(false);
	});
});
