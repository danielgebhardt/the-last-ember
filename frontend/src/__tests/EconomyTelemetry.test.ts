// @vitest-environment node
import { expect, it } from "vitest";
import {
	EXPENSE_SOURCES,
	emptyEconomyMetrics,
	INCOME_SOURCES,
	initializeEconomyTelemetry,
} from "../domain/game/EconomyTelemetry";
import type { GameState } from "../domain/game/GameState";
import { damageMonster } from "../domain/game/MonsterDamage";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { USAGE_EQUIPMENT_KINDS } from "../domain/game/RunUsage";
import { SPELL_DEFINITIONS } from "../domain/game/Spells";
import { bagItemKey, createBag } from "../domain/items/Bag";
import { createEquipment } from "../domain/items/Equipment";
import { ITEM_DEFINITIONS } from "../domain/items/Item";
import { collectGoldAtPlayer } from "../domain/objects/Gold";
import {
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { sanctuaryQuote } from "../domain/town/Sanctuary";
import { TOWN } from "../domain/town/TownDefinition";
import { TOWN_EQUIPMENT_OFFERS } from "../domain/town/TownEquipmentStock";
import { townForgePrice } from "../domain/town/TownForge";
import { LIBRARY_PRICE, libraryOffers } from "../domain/town/TownLibrary";
import { createTownLocation } from "../domain/town/TownLocation";
import { bruteEncounter } from "./BruteTestHelpers";
import { resolvePlayerActionWithHits as act } from "./ControlledCombatTestHelpers";
import { savedAdventure } from "./SaveTestHelpers";
import {
	mixedEncounter,
	mixedFollowUp,
	tacticalSnapshot,
} from "./TacticalReplayTestHelpers";

it("records the starting kit separately and counts a physical pickup only once across drop/re-pick", () => {
	const raw = { ...bruteEncounter(), monsters: [], objects: [] };
	const initial = initializeEconomyTelemetry(raw);
	expect(initial.economyTelemetry?.initialItems["healing-potion"]).toBe(1);
	expect(initial.economyTelemetry?.floors).toEqual({});
	const item = { id: "loot:potion", kind: "healing-potion" as const };
	const start = {
		...initial,
		floorItems: [
			...initial.floorItems,
			{ item, floorNumber: 4, coordinate: initial.run.playerCoordinate },
		],
	};
	const first = act(start, { type: "pickup", itemId: item.id }).state;
	expect(first.economyTelemetry?.floors[4]?.acquired["healing-potion"]).toBe(1);
	const dropped = act(first, { type: "drop", itemId: item.id }).state;
	const parsed = parseSave(serializeSave(tacticalSnapshot(dropped)));
	expect(parsed.ok).toBe(true);
	if (!parsed.ok) return;
	const loaded = restoreSave(parsed.value).state;
	expect(
		loaded.floorItems.find((entry) => entry.item.id === item.id)?.item
			.telemetryAcquired,
	).toBe(true);
	const again = act(loaded, { type: "pickup", itemId: item.id }).state;
	expect(again.economyTelemetry).toEqual(first.economyTelemetry);
});

it("does not invent history for an untracked save or count rejected pickups", () => {
	const raw = {
		...bruteEncounter(),
		monsters: [],
		objects: [],
		bag: createBag(),
	};
	expect(act(raw, { type: "wait" }).state.economyTelemetry).toBeUndefined();
	const state = initializeEconomyTelemetry(raw);
	expect(act(state, { type: "pickup", itemId: "absent" }).state).toBe(state);
});

const quiet = () => ({ ...bruteEncounter(), monsters: [], objects: [] });
const at = (state: GameState, building: string): GameState => {
	const place = TOWN.buildings.find((b) => b.id === building);
	if (!place) throw Error("Expected town building");
	return {
		...state,
		town: { ...createTownLocation(), coordinate: place.entry },
	};
};
const town = (building: string) =>
	initializeEconomyTelemetry(
		at({ ...restoreSave(savedAdventure()).state, gold: 10000 }, building),
	);
const reload = (state: GameState) => {
	const parsed = parseSave(serializeSave(tacticalSnapshot(state)));
	expect(parsed.ok).toBe(true);
	if (!parsed.ok) throw Error(parsed.error);
	return restoreSave(parsed.value).state;
};

it("counts auto-equipped gear and learned books without requiring bag ownership", () => {
	const raw = quiet();
	let state = initializeEconomyTelemetry({
		...raw,
		equipment: createEquipment(),
	});
	state = {
		...state,
		floorItems: [
			...state.floorItems,
			...[
				{ id: "found:sword", kind: "short-sword" as const },
				{ id: "found:book", kind: "book-ember-bolt" as const },
			].map((item) => ({
				item,
				floorNumber: 4,
				coordinate: state.run.playerCoordinate,
			})),
		],
	};
	const equipped = act(state, { type: "pickup", itemId: "found:sword" }).state;
	expect(equipped.equipment.mainHand?.telemetryAcquired).toBe(true);
	expect(equipped.economyTelemetry?.floors[4]?.acquired["short-sword"]).toBe(1);
	const learned = act(equipped, { type: "pickup", itemId: "found:book" }).state;
	expect(learned.economyTelemetry?.floors[4]?.learned["ember-bolt"]).toBe(1);
	expect(learned.economyTelemetry?.floors[4]?.acquired["book-ember-bolt"]).toBe(
		1,
	);
	expect(reload(learned).economyTelemetry).toEqual(learned.economyTelemetry);
});

it("records repeated town purchases by kind, quantity and actual price; stale stock adds nothing", () => {
	const state = town("potions");
	const buy = {
		type: "buy-town-potion",
		kind: "healing-potion",
		expectedStock: state.townPotionStock["healing-potion"],
	} as const;
	const first = act(state, buy).state;
	const paid = state.gold - first.gold;
	expect(paid).toBeGreaterThan(0);
	expect(act(first, buy).state).toBe(first);
	const second = act(first, {
		...buy,
		expectedStock: first.townPotionStock[buy.kind],
	}).state;
	expect(
		second.economyTelemetry?.town.purchases["town-potions"]?.[buy.kind],
	).toEqual({ quantity: 2, gold: paid * 2 });
	expect(second.economyTelemetry?.town.acquired[buy.kind]).toBe(2);
	expect(second.economyTelemetry?.floors).toEqual({});
	expect(reload(second).economyTelemetry).toEqual(second.economyTelemetry);
});

it("separates scroll, weapon and armor purchases and confirmed salvage sales", () => {
	let state = town("scrolls");
	state = act(state, {
		type: "buy-town-scroll",
		kind: "exit-scroll",
		expectedStock: state.townScrollStock["exit-scroll"],
	}).state;
	expect(
		state.economyTelemetry?.town.purchases["town-scrolls"]?.["exit-scroll"]
			?.quantity,
	).toBe(1);
	for (const store of ["weapons", "armor"] as const) {
		state = at(state, store);
		const offer = Object.values(TOWN_EQUIPMENT_OFFERS).find(
			(o) => o.store === store,
		);
		if (!offer) throw Error("Expected offer");
		const bought = act(state, {
			type: "buy-town-equipment",
			offerId: offer.item.id,
		}).state;
		expect(
			bought.economyTelemetry?.town.purchases[`town-${store}`]?.[
				offer.item.kind
			]?.quantity,
		).toBe(1);
		expect(
			act(bought, { type: "buy-town-equipment", offerId: offer.item.id }).state,
		).toBe(bought);
		state = at(bought, "rag-and-bone");
		const sold = act(state, {
			type: "sell-town-equipment",
			itemId: offer.item.id,
		}).state;
		expect(
			sold.economyTelemetry?.town.sales["town-salvage"]?.[offer.item.kind],
		).toEqual({ quantity: 1, gold: sold.gold - state.gold });
		expect(
			act(sold, { type: "sell-town-equipment", itemId: offer.item.id }).state,
		).toBe(sold);
		state = sold;
	}
	expect(reload(state).economyTelemetry).toEqual(state.economyTelemetry);
});

it("records bulk sale quantities and paid gold without counting sales as acquisitions", () => {
	const raw = at(
		{
			...restoreSave(savedAdventure()).state,
			gold: 100,
			equipment: createEquipment({
				id: "worn",
				kind: "iron-sword",
				enchantment: 2,
			}),
			bag: createBag([
				{ id: "sell:1", kind: "short-sword" },
				{ id: "sell:2", kind: "short-sword" },
			]),
		},
		"rag-and-bone",
	);
	const state = initializeEconomyTelemetry(raw);
	const result = act(state, { type: "sell-town-lower" }).state;
	expect(
		result.economyTelemetry?.town.sales["town-salvage"]?.["short-sword"],
	).toEqual({ quantity: 2, gold: result.gold - state.gold });
	expect(result.economyTelemetry?.town.acquired).toEqual({});
	expect(reload(result).economyTelemetry).toEqual(result.economyTelemetry);
});

it("records library learning, forging and sanctuary spending as services", () => {
	let state = town("library");
	const offer = libraryOffers(state.run)[0];
	state = act(state, { type: "library-learn", book: offer.book }).state;
	expect(state.economyTelemetry?.town.goldOut.library).toBe(LIBRARY_PRICE);
	expect(state.economyTelemetry?.town.learned[offer.spell]).toBe(1);
	expect(state.economyTelemetry?.town.acquired[offer.book]).toBe(1);
	state = at(state, "forge");
	const item = state.equipment.mainHand;
	if (!item) throw Error("Expected weapon");
	const price = townForgePrice(item);
	const forged = act(state, {
		type: "town-forge",
		itemId: item.id,
		enchantment: item.enchantment ?? 0,
		price,
	}).state;
	expect(forged.economyTelemetry?.town.goldOut["town-forge"]).toBe(price);
	expect(forged.equipment.mainHand?.telemetryAcquired).toBe(true);
	expect(forged.economyTelemetry?.town.acquired).toEqual(
		state.economyTelemetry?.town.acquired,
	);
	state = at(
		{
			...forged,
			player: { ...forged.player, health: forged.player.maxHealth - 2 },
		},
		"sanctuary",
	);
	const quote = sanctuaryQuote(state, "health");
	const treated = act(state, { type: "sanctuary-treatment", quote }).state;
	expect(treated.economyTelemetry?.town.goldOut["sanctuary-health"]).toBe(
		quote.cost,
	);
	expect(reload(treated).economyTelemetry).toEqual(treated.economyTelemetry);
});

it("separates floor treasure, kill rewards and recovered theft gold", () => {
	const raw = quiet();
	const state = initializeEconomyTelemetry({
		...raw,
		objects: [
			{
				id: "treasure",
				kind: "gold",
				floorNumber: 4,
				coordinate: raw.run.playerCoordinate,
				activated: false,
			},
		],
	});
	const collected = collectGoldAtPlayer(state);
	expect(collected.economyTelemetry?.floors[4]?.goldIn["floor-gold"]).toBe(
		collected.gold - state.gold,
	);
	expect(collectGoldAtPlayer(collected)).toBe(collected);
	const monster = {
		...bruteEncounter().monsters[0],
		health: 1,
		theft: { gold: 20, turn: 0 },
	};
	const slain = damageMonster(
		{ ...collected, monsters: [monster] },
		monster,
		100,
		{ type: "player-hit" },
	);
	expect(slain.economyTelemetry?.floors[4]?.goldIn["theft-recovery"]).toBe(20);
	expect(slain.economyTelemetry?.floors[4]?.goldIn["monster-reward"]).toBe(
		slain.gold - collected.gold - 20,
	);
});

it("preserves deterministic gameplay and counters through repeated mid-combat reloads", () => {
	let plain = mixedEncounter();
	let tracked = initializeEconomyTelemetry(plain);
	const strip = (value: unknown) =>
		JSON.parse(
			JSON.stringify(value, (key, v) =>
				key === "economyTelemetry" || key === "telemetryAcquired"
					? undefined
					: v,
			),
		);
	for (const action of [{ type: "wait" } as const, ...mixedFollowUp]) {
		plain = resolvePlayerAction(plain, action).state;
		tracked = resolvePlayerAction(tracked, action).state;
		expect(strip(tracked)).toEqual(strip(plain));
		tracked = reload(tracked);
	}
});

it("rejects invalid marker types, counter keys, trade subtotals and gold/learning inconsistencies", () => {
	const state = town("potions");
	const document = tacticalSnapshot(state);
	const modified = (change: (d: typeof document) => void) => {
		const copy = structuredClone(document);
		change(copy);
		expect(parseSave(serializeSave(copy)).ok).toBe(false);
	};
	modified((d) => {
		d.state.gold++;
	});
	modified((d) => {
		d.state.bag = {
			items: [
				{
					...d.state.bag.items[0],
					telemetryAcquired: false as unknown as true,
				},
				...d.state.bag.items.slice(1),
			],
		};
	});
	modified((d) => {
		if (d.state.economyTelemetry)
			d.state.economyTelemetry.town.goldOut.well = -1;
	});
	modified((d) => {
		if (d.state.economyTelemetry) d.state.economyTelemetry.initialSpells = {};
	});
	modified((d) => {
		if (d.state.economyTelemetry)
			d.state.economyTelemetry.town.purchases["town-potions"] = {
				"healing-potion": { quantity: 1, gold: 150 },
			};
	});
	modified((d) => {
		const telemetry = d.state.economyTelemetry;
		if (!telemetry) throw Error("Expected economy telemetry");
		telemetry.town.acquired["healing-potion"] = 1;
		telemetry.town.goldOut.purchases = 150;
		telemetry.town.purchases["town-weapons"] = {
			"healing-potion": { quantity: 1, gold: 150 },
		};
		d.state.gold -= 150;
	});
	modified((d) => {
		if (d.state.economyTelemetry)
			d.state.economyTelemetry.floors[21] = emptyEconomyMetrics();
	});
});

it("retains acquisition markers through storage without adding acquisitions", () => {
	const state = town("storage");
	const item = state.bag.items[0],
		key = bagItemKey(item);
	const stored = act(state, { type: "storage-deposit", itemKey: key }).state;
	expect(
		stored.townStorage.find((copy) => copy.id === item.id)?.telemetryAcquired,
	).toBe(true);
	const restored = reload(stored);
	const withdrawn = act(restored, {
		type: "storage-withdraw",
		itemKey: key,
	}).state;
	expect(withdrawn.economyTelemetry).toEqual(state.economyTelemetry);
	expect(
		withdrawn.bag.items.find((copy) => copy.id === item.id)?.telemetryAcquired,
	).toBe(true);
});

it("leaves older saves without economy metrics unknown after load and play", () => {
	const loaded = reload(quiet());
	expect(act(loaded, { type: "wait" }).state.economyTelemetry).toBeUndefined();
	expect(
		loaded.bag.items.every((item) => item.telemetryAcquired === undefined),
	).toBe(true);
});

it("bounds catalog-wide twenty-floor economy counters and all town stores below 256 KiB", () => {
	const count = Number.MAX_SAFE_INTEGER;
	const kinds = (...types: string[]) =>
		Object.entries(ITEM_DEFINITIONS)
			.filter(([, definition]) => types.includes(definition.type))
			.map(([kind]) => kind);
	const counts = (keys: readonly string[]) =>
		Object.fromEntries(keys.map((key) => [key, count]));
	const trades = (keys: readonly string[]) =>
		Object.fromEntries(
			keys.map((key) => [key, { quantity: count, gold: count }]),
		);
	const metrics = {
		...emptyEconomyMetrics(),
		acquired: counts(Object.keys(ITEM_DEFINITIONS)),
		learned: counts(Object.keys(SPELL_DEFINITIONS)),
		goldIn: counts(INCOME_SOURCES),
		goldOut: counts(EXPENSE_SOURCES),
		purchases: { "dungeon-merchant": trades(kinds("potion")) },
		sales: { "dungeon-merchant": trades(USAGE_EQUIPMENT_KINDS) },
	};
	const telemetry = {
		initialGold: count,
		initialItems: metrics.acquired,
		initialSpells: metrics.learned,
		floors: Object.fromEntries(
			Array.from({ length: 20 }, (_, i) => [i + 1, metrics]),
		),
		town: {
			...metrics,
			purchases: {
				"town-potions": trades(kinds("potion")),
				"town-scrolls": trades(kinds("scroll", "enchantment")),
				"town-armor": trades(kinds("shield", "chest-armor", "helmet", "ring")),
				"town-weapons": trades(kinds("weapon")),
			},
			sales: { "town-salvage": trades(USAGE_EQUIPMENT_KINDS) },
		},
	};
	expect(
		new TextEncoder().encode(JSON.stringify(telemetry)).length,
	).toBeLessThan(256 * 1024);
});
