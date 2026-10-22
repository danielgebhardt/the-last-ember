// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { updateExploration } from "../domain/dungeon/Exploration";
import { DEFAULT_FOG_CONFIGURATION } from "../domain/dungeon/RunConfiguration";
import { createGameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { bagSlots } from "../domain/items/Bag";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
} from "../domain/saves/SaveFormat";
import {
	createTownPotionStock,
	TOWN_POTION_OFFERS,
	type TownPotion,
} from "../domain/town/TownEconomy";
import { createTownLocation } from "../domain/town/TownLocation";
import { COMPACT_TEST_CONFIGURATION as config } from "./TestRunConfiguration";

const shopState = () => ({
	...createGameState(connectDungeonFloors(generateDungeonRun(123, 5, config))),
	town: { ...createTownLocation(), coordinate: { row: 13, col: 3 } },
	gold: 1000,
	turn: 29,
	mana: 2,
});
const buy = (
	state: ReturnType<typeof shopState>,
	kind: TownPotion = "antidote",
	expectedStock = 4,
) =>
	resolvePlayerAction(state, { type: "buy-town-potion", kind, expectedStock });
describe("finite town potion purchases", () => {
	it("atomically spends gold, records a unique bottle and stock, without a dungeon phase, leaving the full starting bar unchanged", () => {
		const state = shopState();
		const next = buy(state);
		expect(next.error).toBeUndefined();
		expect(next.turnAdvanced).toBe(false);
		expect(next.state.gold).toBe(875);
		expect(next.state.townPotionStock.antidote).toBe(3);
		expect(next.state.bag.items.at(-1)).toEqual({
			id: "town-potion:antidote:1",
			kind: "antidote",
		});
		expect(next.state.potionHotbar).toBe(state.potionHotbar);
		for (const key of [
			"run",
			"monsters",
			"merchantStock",
			"effects",
			"floorItems",
			"objects",
			"progression",
			"player",
		] as const)
			expect(next.state[key]).toBe(state[key]);
		expect(next.state.turn).toBe(29);
		expect(next.state.mana).toBe(2);
		expect(next.state.activityHistory.entries.at(-1)?.event).toMatchObject({
			type: "merchant-bought",
			item: "antidote",
			gold: 125,
			turn: 29,
		});
	});
	it("rejects stale duplicate confirmation instead of buying twice", () => {
		const first = buy(shopState());
		const repeated = resolvePlayerAction(first.state, {
			type: "buy-town-potion",
			kind: "antidote",
			expectedStock: 4,
		});
		expect(repeated.error).toMatch(/changed/i);
		expect(repeated.state).toBe(first.state);
	});
	it("rejects no gold, sold out, wrong location, dungeon, ended adventures, invalid stock quotes and unsupported supplies", () => {
		const state = shopState();
		const cases = [
			{ ...state, gold: 0 },
			{ ...state, town: null },
			{ ...state, town: createTownLocation() },
			{ ...state, player: { ...state.player, health: 0 } },
			{ ...state, townPotionStock: { ...state.townPotionStock, antidote: 0 } },
		];
		for (const invalid of cases) {
			const result = resolvePlayerAction(invalid, {
				type: "buy-town-potion",
				kind: "antidote",
				expectedStock: 4,
			});
			expect(result.error).toBeDefined();
			expect(result.state).toBe(invalid);
			expect(result.turnAdvanced).toBe(false);
		}
		expect(buy(state, "toString" as TownPotion).state).toBe(state);
		expect(buy(state, "antidote", 1.5).state).toBe(state);
	});
	it("rejects a new stack in a full bag but appends to an existing stack without moving its slot", () => {
		const state = shopState();
		const gear = Array.from({ length: 27 }, (_, i) => ({
			id: `bag:${i}`,
			kind: "short-sword" as const,
		}));
		const full = { ...state, bag: { items: gear } };
		expect(buy(full).state).toBe(full);
		const stack = {
			...state,
			bag: {
				items: [{ id: "already", kind: "antidote" as const }, ...gear.slice(1)],
			},
		};
		const next = buy(stack);
		expect(next.error).toBeUndefined();
		expect(bagSlots(next.state.bag)).toHaveLength(27);
		expect(bagSlots(next.state.bag)[0]).toEqual({
			item: stack.bag.items[0],
			count: 2,
		});
	});
	it("cannot introduce a duplicate item id or exceed the physical copy cap", () => {
		const state = shopState();
		const duplicate = {
			...state,
			bag: {
				items: [{ id: "town-potion:antidote:1", kind: "antidote" as const }],
			},
		};
		expect(buy(duplicate).state).toBe(duplicate);
		const enormous = {
			...state,
			bag: {
				items: Array.from({ length: 10000 }, (_, i) => ({
					id: `copy:${i}`,
					kind: "antidote" as const,
				})),
			},
		};
		expect(buy(enormous).state).toBe(enormous);
	});
	it("persists depletion and ownership, rejects forged refills", () => {
		const state = shopState(),
			next = buy(state).state;
		const doc = createSaveDocument(
			next,
			updateExploration(next.run, 8),
			config,
			DEFAULT_FOG_CONFIGURATION,
		);
		const parsed = parseSave(JSON.stringify(doc));
		if (!parsed.ok) throw new Error(parsed.error);
		expect(restoreSave(parsed.value).state.townPotionStock.antidote).toBe(3);
		expect(restoreSave(parsed.value).state.bag).toEqual(next.bag);
		const forged = {
			...doc,
			state: { ...doc.state, townPotionStock: createTownPotionStock() },
		};
		expect(parseSave(JSON.stringify(forged)).ok).toBe(false);
	});
	it("depletes every offered stock without changing the wandering pool", () => {
		for (const kind of Object.keys(TOWN_POTION_OFFERS) as TownPotion[]) {
			let state = shopState();
			const wandering = state.merchantStock;
			for (let count = TOWN_POTION_OFFERS[kind].quantity; count > 0; count--) {
				const result = buy({ ...state, gold: 10000 }, kind, count);
				expect(result.error).toBeUndefined();
				state = { ...state, ...result.state, town: state.town };
			}
			expect(state.townPotionStock[kind]).toBe(0);
			expect(state.merchantStock).toBe(wandering);
		}
	});
});
