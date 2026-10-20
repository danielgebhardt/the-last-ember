// @vitest-environment node
import { expect, it } from "vitest";
import { formatActivityEvent } from "../components/game/ActivityMessages";
import type { GameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { createBag } from "../domain/items/Bag";
import { createEquipment } from "../domain/items/Equipment";
import type { ItemInstance } from "../domain/items/Item";
import {
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import {
	canReachTownForge,
	townForgePrice,
	townForgeTier,
} from "../domain/town/TownForge";
import { createTownLocation } from "../domain/town/TownLocation";
import { savedAdventure } from "./SaveTestHelpers";
import { tacticalSnapshot } from "./TacticalReplayTestHelpers";

const atForge = (): GameState => {
	const base = restoreSave(savedAdventure()).state;
	return {
		...base,
		gold: 2000,
		town: { ...createTownLocation(), coordinate: { row: 5, col: 20 } },
		equipment: createEquipment(
			{ id: "worn:sword", kind: "iron-sword", enchantment: 1 },
			null,
			{ id: "worn:leather", kind: "leather-armor" },
		),
		bag: createBag([
			{ id: "bag:helmet", kind: "steel-helmet", enchantment: 2 },
			{ id: "bag:maxed", kind: "chain-armor", enchantment: 3 },
			{ id: "bag:cloak", kind: "warding-cloak" },
		]),
	};
};
const quote = (state: GameState, itemId: string) => {
	const item = [...Object.values(state.equipment), ...state.bag.items].find(
		(i): i is ItemInstance => i?.id === itemId,
	);
	if (!item) throw new Error(`Missing ${itemId}`);
	return {
		type: "town-forge" as const,
		itemId,
		enchantment: item.enchantment ?? 0,
		price: townForgePrice(item),
	};
};

it("tiers by base stat and prices the tier base times the level being bought", () => {
	expect(
		(
			[
				"short-sword",
				"iron-sword",
				"steel-sword",
				"battle-axe",
				"runeblade",
				"star-forged-blade",
				"leather-armor",
				"scholar-robe",
				"chain-armor",
				"plate-armor",
				"dragon-mail",
				"leather-cap",
				"runic-helmet",
				"wooden-shield",
				"tower-shield",
			] as const
		).map(townForgeTier),
	).toEqual([1, 1, 2, 2, 3, 4, 1, 1, 2, 3, 4, 1, 4, 1, 3]);
	expect(townForgePrice({ id: "a", kind: "leather-armor" })).toBe(150);
	expect(
		townForgePrice({ id: "b", kind: "star-forged-blade", enchantment: 2 }),
	).toBe(3000);
	expect(
		[0, 1, 2]
			.map((enchantment) =>
				townForgePrice({ id: "c", kind: "dragon-mail", enchantment }),
			)
			.reduce((a, b) => a + b),
	).toBe(6000);
});

it("reforges the worn starting sword in place for gold and no turn, then saves", () => {
	// Starting equipment keeps saved ownership valid.
	const base = restoreSave(savedAdventure()).state;
	const state = { ...base, gold: 500, town: atForge().town };
	expect(canReachTownForge(state)).toBe(true);
	const result = resolvePlayerAction(state, quote(state, "starting:main-hand"));
	expect(result.turnAdvanced).toBe(false);
	expect(result.state.turn).toBe(state.turn);
	expect(result.state.gold).toBe(350);
	expect(result.state.equipment.mainHand).toEqual({
		id: "starting:main-hand",
		kind: "short-sword",
		enchantment: 1,
	});
	expect(result.state.bag).toEqual(state.bag);
	const event = result.state.activityHistory.entries.at(-1)?.event;
	if (event?.type !== "town-forged") throw new Error("Expected forge event");
	expect(formatActivityEvent(event)).toContain(
		"reforges your Short sword to +1 for 150 gold",
	);
	const parsed = parseSave(serializeSave(tacticalSnapshot(result.state)));
	if (!parsed.ok) throw new Error(parsed.error);
	expect(restoreSave(parsed.value).state.equipment.mainHand).toEqual(
		result.state.equipment.mainHand,
	);
});

it("raises a worn piece's stats through the normal loadout", () => {
	const state = atForge();
	const result = resolvePlayerAction(state, quote(state, "worn:sword"));
	expect(result.state.gold).toBe(1700);
	expect(result.state.equipment.mainHand?.enchantment).toBe(2);
});

it("reforges a bag item at its own position", () => {
	const state = atForge();
	const result = resolvePlayerAction(state, quote(state, "bag:helmet"));
	expect(result.state.gold).toBe(2000 - 1800);
	expect(result.state.bag.items.map((i) => i.id)).toEqual(
		state.bag.items.map((i) => i.id),
	);
	expect(result.state.bag.items[0]).toEqual({
		id: "bag:helmet",
		kind: "steel-helmet",
		enchantment: 3,
	});
});

it("rejects free: cap, rare, gold, stale quote, unknown item, away from the forge and ember", () => {
	const state = atForge();
	const cases: [GameState, ReturnType<typeof quote>][] = [
		[state, quote(state, "bag:maxed")],
		[state, quote(state, "bag:cloak")],
		[{ ...state, gold: 100 }, quote(state, "worn:sword")],
		[state, { ...quote(state, "worn:sword"), enchantment: 0 }],
		[state, { ...quote(state, "worn:sword"), price: 150 }],
		[state, { ...quote(state, "worn:sword"), itemId: "missing" }],
		[{ ...state, town: createTownLocation() }, quote(state, "worn:sword")],
		[
			{ ...state, quest: { ...state.quest, cureRecovered: true } },
			quote(state, "worn:sword"),
		],
	];
	for (const [current, action] of cases) {
		const result = resolvePlayerAction(current, action);
		expect(result.state).toBe(current);
		expect(result.turnAdvanced).toBe(false);
		expect(result.error).toBeTruthy();
	}
});
