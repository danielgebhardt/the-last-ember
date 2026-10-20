// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { GameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { createEquipment } from "../domain/items/Equipment";
import { equipmentSalePrice } from "../domain/merchant/MerchantRules";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
} from "../domain/saves/SaveFormat";
import { createTownLocation } from "../domain/town/TownLocation";
import { savedAdventure } from "./SaveTestHelpers";

const shop = (): GameState => ({
	...restoreSave(savedAdventure()).state,
	town: { ...createTownLocation(), coordinate: { row: 17, col: 20 } },
	gold: 100,
	turn: 29,
	mana: 2,
	effects: [],
	afflictions: [{ kind: "poisoned" as const, remaining: 3, source: "test" }],
	equipment: createEquipment(
		{ id: "worn:sword", kind: "iron-sword", enchantment: 1 },
		{ id: "worn:shield", kind: "wooden-shield" },
		{ id: "worn:plate", kind: "plate-armor" },
		null,
		{ id: "worn:strength", kind: "ring-strength" },
		{ id: "worn:mana", kind: "ring-mana" },
	),
	bag: {
		items: [
			{ id: "lower:1", kind: "short-sword" },
			{ id: "lower:2", kind: "short-sword", enchantment: 1 },
			{ id: "same", kind: "iron-sword", enchantment: 1 },
			{ id: "better", kind: "short-sword", enchantment: 3 },
			{ id: "tradeoff", kind: "scholar-robe" },
			{ id: "ring", kind: "ring-intelligence" },
			{ id: "supply", kind: "healing-potion" },
			{ id: "scroll", kind: "exit-scroll" },
			{ id: "book", kind: "book-ember-bolt" },
		],
	},
});
const sell = { type: "sell-town-equipment", itemId: "lower:1" } as const;
const bulk = { type: "sell-town-lower" } as const;

describe("The Rag & Bone sales", () => {
	it("sells exactly one owned copy at merchant prices without a dungeon phase or stock changes", () => {
		const before = shop();
		const result = resolvePlayerAction(before, sell);
		expect(result.error).toBeUndefined();
		expect(result.turnAdvanced).toBe(false);
		expect(result.state.gold).toBe(
			100 + (equipmentSalePrice(before.bag.items[0]) ?? 0),
		);
		expect(result.state.bag.items.map((item) => item.id)).toEqual(
			before.bag.items.slice(1).map((item) => item.id),
		);
		for (const key of [
			"town",
			"turn",
			"mana",
			"effects",
			"player",
			"progression",
			"equipment",
			"run",
			"monsters",
			"objects",
			"floorItems",
			"townPotionStock",
			"townEquipmentStock",
			"merchantStock",
		] as const)
			expect(result.state[key]).toBe(before[key]);
		expect(result.state.activityHistory.entries.at(-1)?.event).toMatchObject({
			type: "merchant-sold",
			item: "short-sword",
			turn: 29,
		});
		expect(resolvePlayerAction(result.state, sell).state).toBe(result.state);
	});
	it("bulk sells only Lower gear, retaining Same, Better, Tradeoff, rings and supplies", () => {
		const before = shop();
		const result = resolvePlayerAction(before, bulk);
		expect(result.error).toBeUndefined();
		expect(result.turnAdvanced).toBe(false);
		expect(result.state.gold).toBe(145);
		expect(result.state.bag.items).toEqual(before.bag.items.slice(2));
		expect(result.state.effects).toBe(before.effects);
		expect(result.state.turn).toBe(29);
		expect(resolvePlayerAction(result.state, bulk).state).toBe(result.state);
	});
	it.each(["worn:sword", "supply", "scroll", "book", "missing"])(
		"protects ineligible or unowned copy %s",
		(itemId) => {
			const state = shop();
			const result = resolvePlayerAction(state, { ...sell, itemId });
			expect(result.error).toBeDefined();
			expect(result.state).toBe(state);
		},
	);
	it("rejects both sale types away from the shop, after death/victory, with the ember or on overflow", () => {
		const state = shop();
		for (const action of [sell, bulk]) {
			for (const invalid of [
				{ ...state, town: null },
				{ ...state, town: createTownLocation() },
				{
					...state,
					town: { ...createTownLocation(), coordinate: { row: 17, col: 19 } },
				},
				{ ...state, player: { ...state.player, health: 0 } },
				{ ...state, quest: { ...state.quest, cureRecovered: true } },
				{
					...state,
					quest: {
						...state.quest,
						victory: {
							seed: 123,
							gold: 100,
							floors: 5,
							turns: 29,
							monstersDefeated: 0,
							health: 10,
							level: 1,
							experience: 0,
						},
					},
				},
				{ ...state, gold: Number.MAX_SAFE_INTEGER },
			]) {
				const result = resolvePlayerAction(invalid, action);
				expect(result.error).toBeDefined();
				expect(result.turnAdvanced).toBe(false);
				expect(result.state).toBe(invalid);
			}
		}
	});
	it("preserves the sale through validated loading and cannot resell the removed copy", () => {
		const original = savedAdventure();
		const before = shop();
		before.bag = {
			items: before.bag.items.filter((item) => item.id !== "book"),
		};
		const sold = resolvePlayerAction(before, sell).state;
		const doc = createSaveDocument(
			sold,
			restoreSave(original).exploration,
			original.configuration,
			original.fog,
		);
		const parsed = parseSave(JSON.stringify(doc));
		if (!parsed.ok) throw new Error(parsed.error);
		const loaded = restoreSave(parsed.value).state;
		expect(loaded.gold).toBe(sold.gold);
		expect(loaded.bag).toEqual(sold.bag);
		expect(loaded.effects).toEqual(sold.effects);
		expect(resolvePlayerAction(loaded, sell).state).toBe(loaded);
	});
});
