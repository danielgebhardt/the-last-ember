// @vitest-environment node
import { expect, it } from "vitest";
import { createGameState, type GameState } from "../domain/game/GameState";
import { createEquipment } from "../domain/items/Equipment";
import { lowerEquipmentSale } from "../domain/merchant/LowerEquipmentSales";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { resolvePlayerActionWithHits as resolvePlayerAction } from "./ControlledCombatTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import { savedAdventure } from "./SaveTestHelpers";

const merchantId = "bulk:merchant";
const shop = (): GameState => {
	const saved = restoreSave(savedAdventure());
	return {
		...saved.state,
		monsters: [],
		effects: [],
		gold: 100,
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
				{ id: "same", kind: "iron-sword", enchantment: 1 },
				{ id: "better", kind: "short-sword", enchantment: 3 },
				{ id: "tradeoff", kind: "scholar-robe" },
				{ id: "ring-tradeoff", kind: "ring-intelligence" },
				{ id: "lower:2", kind: "short-sword", enchantment: 1 },
				{ id: "potion", kind: "healing-potion" },
			],
		},
		objects: [
			{
				id: merchantId,
				kind: "merchant",
				floorNumber: saved.state.run.activeFloor,
				coordinate: saved.state.run.playerCoordinate,
				activated: false,
			},
		],
	};
};

const sale = { type: "sell-lower", merchantId } as const;

it("sells only Lower carried copies atomically for their quoted value in one turn", () => {
	const before = shop();
	expect(lowerEquipmentSale(before)).toMatchObject({
		items: [{ id: "lower:1" }, { id: "lower:2" }],
		gold: 45,
	});
	const sold = resolvePlayerAction(before, sale);
	expect(sold.turnAdvanced).toBe(true);
	expect(sold.state.turn).toBe(before.turn + 1);
	expect(sold.state.gold).toBe(145);
	expect(sold.state.bag.items.map((item) => item.id)).toEqual([
		"same",
		"better",
		"tradeoff",
		"ring-tradeoff",
		"potion",
	]);
	expect(sold.state.equipment).toBe(before.equipment);
	expect(sold.state.merchantStock).toBe(before.merchantStock);
	expect(before.bag.items).toHaveLength(7);
	const events = sold.state.activityHistory.entries.filter(
		({ event }) => event.type === "merchant-sold",
	);
	expect(events.map(({ event }) => event.turn)).toEqual([
		before.turn + 1,
		before.turn + 1,
	]);
});

it("keeps a ring useful in either destination and sells it only when both replacements are Lower", () => {
	const before = shop();
	const ring = { id: "ring", kind: "ring-strength" } as const;
	const either = { ...before, bag: { items: [ring] } };
	expect(lowerEquipmentSale(either).items).toEqual([]);
	const both = {
		...either,
		equipment: {
			...either.equipment,
			leftRing: { id: "left", kind: "relic-band" as const },
			rightRing: { id: "right", kind: "relic-band" as const },
		},
	};
	expect(lowerEquipmentSale(both)).toEqual({ items: [ring], gold: 20 });
});

it("recomputes eligibility from the current loadout instead of trusting an earlier quote", () => {
	const before = shop();
	expect(lowerEquipmentSale(before).items).toHaveLength(2);
	const changed = {
		...before,
		equipment: {
			...before.equipment,
			mainHand: { id: "worn:sword", kind: "short-sword" as const },
		},
	};
	const result = resolvePlayerAction(changed, sale);
	expect(result.state).toBe(changed);
	expect(result.turnAdvanced).toBe(false);
	expect(result.error).toBe("No Lower equipment to sell.");
});

it("advances effects and normal mana recovery once for the whole sale", () => {
	const before = shop();
	before.turn = 29;
	before.mana = 0;
	before.effects = [];
	before.afflictions = [
		{ kind: "poisoned" as const, remaining: 3, source: "test" },
	];
	const sold = resolvePlayerAction(before, sale).state;
	expect(sold.turn).toBe(30);
	expect(sold.mana).toBe(1);
	expect(sold.player.health).toBe(before.player.health - 1);
	expect(sold.afflictions[0].remaining).toBe(2);
	expect(sold.gold).toBe(145);
});

it("allows one adjacent monster response after both items have been sold", () => {
	const fresh = createGameState(createCorridorEncounter());
	const carried = shop();
	const before: GameState = {
		...fresh,
		bag: carried.bag,
		equipment: carried.equipment,
		objects: [
			{
				id: merchantId,
				kind: "merchant",
				floorNumber: 1,
				coordinate: { row: 1, col: 1 },
				activated: false,
			},
		],
		monsters: [
			{
				id: "1:1",
				kind: "goblin",
				floorNumber: 1,
				coordinate: { row: 1, col: 2 },
				health: 4,
				intent: { type: "idle" },
			},
		],
	};
	const result = resolvePlayerAction(before, sale).state;
	expect(result.turn).toBe(1);
	expect(result.player.health).toBe(9);
	expect(result.bag.items.some((item) => item.id.startsWith("lower:"))).toBe(
		false,
	);
	expect(
		result.activityHistory.entries.filter(
			({ event }) => event.type === "monster-hit",
		),
	).toHaveLength(1);
});

it("retains all completed sales after a fatal response and refuses further actions", () => {
	const before = shop();
	before.player = { ...before.player, health: 1 };
	before.effects = [];
	before.afflictions = [
		{ kind: "poisoned" as const, remaining: 3, source: "test" },
	];
	const sold = resolvePlayerAction(before, sale).state;
	expect(sold.player.health).toBe(0);
	expect(sold.turn).toBe(before.turn + 1);
	expect(sold.gold).toBe(145);
	expect(sold.bag.items.some((item) => item.id.startsWith("lower:"))).toBe(
		false,
	);
	expect(resolvePlayerAction(sold, sale).state).toBe(sold);
});

it("rejects absent merchants, empty eligibility and gold overflow without a partial sale or turn", () => {
	const before = shop();
	expect(
		resolvePlayerAction(before, { ...sale, merchantId: "missing" }).state,
	).toBe(before);
	const empty = { ...before, bag: { items: [] } };
	expect(resolvePlayerAction(empty, sale).state).toBe(empty);
	const full = { ...before, gold: Number.MAX_SAFE_INTEGER - 20 };
	const rejected = resolvePlayerAction(full, sale);
	expect(rejected.state).toBe(full);
	expect(rejected.error).toBe("You cannot carry more gold.");
});

it("retains completed bulk sales in a save and preserves the next ordinary turn", () => {
	const saved = restoreSave(savedAdventure());
	const sold = resolvePlayerAction(shop(), sale).state;
	const state = { ...sold, objects: [] };
	const document = createSaveDocument(
		state,
		saved.exploration,
		saved.configuration,
		saved.fog,
	);
	const parsed = parseSave(serializeSave(document));
	if (!parsed.ok) throw new Error(parsed.error);
	expect(parsed.value.version).toBe(33);
	const loaded = restoreSave(parsed.value).state;
	expect(loaded).toEqual(state);
	expect(resolvePlayerAction(loaded, { type: "wait" })).toEqual(
		resolvePlayerAction(state, { type: "wait" }),
	);
});
