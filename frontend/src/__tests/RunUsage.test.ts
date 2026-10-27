// @vitest-environment node
import { expect, it } from "vitest";
import { createGameState, type GameState } from "../domain/game/GameState";
import {
	type PlayerAction,
	resolvePlayerAction,
} from "../domain/game/PlayerActions";
import {
	USAGE_CONSUMABLE_KINDS,
	USAGE_EQUIPMENT_KINDS,
} from "../domain/game/RunUsage";
import { SPELL_DEFINITIONS } from "../domain/game/Spells";
import { createBag } from "../domain/items/Bag";
import { createEquipment } from "../domain/items/Equipment";
import {
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { createTownLocation } from "../domain/town/TownLocation";
import { resolvePlayerActionWithHits } from "./ControlledCombatTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import { savedAdventure } from "./SaveTestHelpers";
import { tacticalSnapshot } from "./TacticalReplayTestHelpers";

const game = (): GameState => ({
	...createGameState(createCorridorEncounter()),
	monsters: [],
	objects: [],
	floorItems: [],
});
const act = (state: GameState, action: PlayerAction) =>
	resolvePlayerActionWithHits(state, action).state;

it("starts with measured zero usage and counts successful utility and targeted casts once", () => {
	const start = {
		...game(),
		knownSpells: ["protection", "magic-missile"] as const,
	};
	expect(start.usage).toEqual({
		casts: {},
		consumables: {},
		equippedTurns: {},
	});
	const buffed = act(start, { type: "cast", spell: "protection" });
	expect(buffed.usage?.casts).toEqual({ protection: 1 });
	const failed = resolvePlayerAction(buffed, {
		type: "cast",
		spell: "magic-missile",
		targetId: "missing",
	});
	expect(failed.error).toBeTruthy();
	expect(failed.state).toBe(buffed);
	const targeted = {
		...buffed,
		monsters: [
			{
				id: "1:1",
				kind: "goblin" as const,
				health: 4,
				floorNumber: 1,
				coordinate: { row: 1, col: 2 },
				intent: { type: "idle" as const },
			},
		],
	};
	const cast = act(targeted, {
		type: "cast",
		spell: "magic-missile",
		targetId: "1:1",
	});
	expect(cast.usage?.casts).toEqual({ protection: 1, "magic-missile": 1 });
	expect(
		act({ ...start, mana: 0 }, { type: "cast", spell: "protection" }).usage
			?.casts,
	).toEqual({});
});
it("counts a hotbar potion once, and ignores rejected consumption and free assignments", () => {
	const start = {
		...game(),
		player: { health: 2, maxHealth: 10 },
		bag: createBag([{ id: "p", kind: "healing-potion" }]),
	};
	const assigned = act(start, { type: "assign-hotbar", slot: 1, itemId: "p" });
	expect(assigned.usage).toBe(start.usage);
	const used = act(assigned, { type: "use-hotbar", slot: 1 });
	expect(used.usage?.consumables).toEqual({ "healing-potion": 1 });
	expect(used.turn).toBe(1);
	expect(act(used, { type: "consume", itemId: "p" }).usage).toBe(used.usage);
});
it("counts town potions and enchantment scrolls without adding equipped turns", () => {
	const start = {
		...game(),
		town: createTownLocation(),
		player: { health: 2, maxHealth: 10 },
		bag: createBag([
			{ id: "p", kind: "healing-potion" },
			{ id: "s", kind: "enchantment-scroll" },
		]),
	};
	const drunk = act(start, { type: "consume", itemId: "p" });
	const enchanted = act(drunk, {
		type: "enchant",
		scrollId: "s",
		targetItemId: "starting:main-hand",
	});
	expect(enchanted.usage?.consumables).toEqual({
		"healing-potion": 1,
		"enchantment-scroll": 1,
	});
	expect(enchanted.usage?.equippedTurns).toEqual({});
	expect(enchanted.turn).toBe(0);
	expect(act(enchanted, { type: "wait" }).usage).toBe(enchanted.usage);
});
it("counts portal and remove-curse scrolls, including freeing a bound blade", () => {
	const start = {
		...game(),
		bag: createBag([
			{ id: "exit", kind: "exit-scroll" },
			{ id: "curse", kind: "remove-curse-scroll" },
		]),
	};
	const portalled = act(start, { type: "exit-dungeon", itemId: "exit" });
	expect(portalled.usage?.consumables).toEqual({ "exit-scroll": 1 });
	expect(portalled.turn).toBe(1);
	const freed = act(
		{ ...start, hunger: { fedTurn: 0 } },
		{ type: "consume", itemId: "curse" },
	);
	expect(freed.usage?.consumables).toEqual({ "remove-curse-scroll": 1 });
	expect(act(start, { type: "consume", itemId: "curse" }).usage).toBe(
		start.usage,
	);
});
it("credits the equipment worn for the resolved turn, once per kind across both ring slots", () => {
	const start = {
		...game(),
		equipment: createEquipment(
			null,
			null,
			null,
			null,
			{ id: "r1", kind: "copper-ring" },
			{ id: "r2", kind: "copper-ring" },
		),
		bag: createBag([{ id: "sword", kind: "iron-sword" }]),
	};
	const equipped = act(start, {
		type: "equip",
		itemId: "sword",
		slot: "mainHand",
	});
	expect(equipped.usage?.equippedTurns).toEqual({
		"iron-sword": 1,
		"copper-ring": 1,
	});
	const removed = act(equipped, { type: "unequip", slot: "mainHand" });
	expect(removed.usage?.equippedTurns).toEqual({
		"iron-sword": 1,
		"copper-ring": 2,
	});
	const dead = { ...removed, player: { ...removed.player, health: 0 } };
	expect(act(dead, { type: "wait" }).usage).toBe(dead.usage);
});
it("does not change gameplay or seeded outcomes, even after the activity log rolls over", () => {
	const tracked = game(),
		untracked = { ...tracked };
	delete untracked.usage;
	let a: GameState = tracked,
		b: GameState = untracked;
	for (let i = 0; i < 110; i++) {
		const action: PlayerAction =
			i % 2 === 0
				? { type: "unequip", slot: "mainHand" }
				: { type: "equip", slot: "mainHand", itemId: "starting:main-hand" };
		a = act(a, action);
		b = act(b, action);
	}
	expect(a.activityHistory.entries).toHaveLength(100);
	expect(a.activityHistory.entries[0].id).toBeGreaterThan(0);
	const { usage, ...played } = a;
	expect(played).toEqual(b);
	expect(usage?.equippedTurns["short-sword"]).toBe(55);
	expect(tracked.usage?.equippedTurns).toEqual({});
});
it("round-trips usage and continues exactly once across save/load; absent usage stays absent", () => {
	const saved = savedAdventure();
	const state = restoreSave(saved).state;
	const before = act(state, { type: "wait" });
	const document = tacticalSnapshot(before);
	const parsed = parseSave(serializeSave(document));
	expect(parsed.ok).toBe(true);
	if (!parsed.ok) return;
	expect(act(restoreSave(parsed.value).state, { type: "wait" })).toEqual(
		act(before, { type: "wait" }),
	);
	delete document.state.usage;
	const old = parseSave(serializeSave(document));
	expect(old.ok).toBe(true);
	if (!old.ok) return;
	expect(
		act(restoreSave(old.value).state, { type: "wait" }).usage,
	).toBeUndefined();
});
it("rejects unknown kinds, unsafe/negative/fractional counts and impossible equipped/cast totals", () => {
	const saved = savedAdventure();
	for (const usage of [
		{ casts: { unknown: 1 }, consumables: {}, equippedTurns: {} },
		{ casts: {}, consumables: { "iron-sword": 1 }, equippedTurns: {} },
		{ casts: {}, consumables: {}, equippedTurns: { "healing-potion": 1 } },
		...[-1, 0.5, Number.MAX_SAFE_INTEGER + 1].map((n) => ({
			casts: {},
			consumables: { "healing-potion": n },
			equippedTurns: {},
		})),
		{
			casts: { protection: saved.state.turn + 1 },
			consumables: {},
			equippedTurns: {},
		},
		{
			casts: {},
			consumables: {},
			equippedTurns: { "iron-sword": saved.state.turn + 1 },
		},
	])
		expect(
			parseSave(JSON.stringify({ ...saved, state: { ...saved.state, usage } }))
				.ok,
		).toBe(false);
});
it("bounds usage to catalog keys even with the largest safe counters", () => {
	const counts = (keys: readonly string[]) =>
		Object.fromEntries(keys.map((key) => [key, Number.MAX_SAFE_INTEGER]));
	const usage = {
		casts: counts(Object.keys(SPELL_DEFINITIONS)),
		consumables: counts(USAGE_CONSUMABLE_KINDS),
		equippedTurns: counts(USAGE_EQUIPMENT_KINDS),
	};
	expect(
		new TextEncoder().encode(JSON.stringify(usage)).byteLength,
	).toBeLessThan(8 * 1024);
});
it("counts a successful cast and equipped time on the lethal retaliation turn, then stops", () => {
	const start = {
		...game(),
		knownSpells: ["protection"] as const,
		player: { health: 1, maxHealth: 10 },
		monsters: [
			{
				id: "1:1",
				kind: "orc" as const,
				health: 7,
				floorNumber: 1,
				coordinate: { row: 1, col: 2 },
				intent: { type: "idle" as const },
			},
		],
	};
	const died = act(start, { type: "cast", spell: "protection" });
	expect(died.player.health).toBe(0);
	expect(died.usage?.casts).toEqual({ protection: 1 });
	expect(died.usage?.equippedTurns["short-sword"]).toBe(1);
	expect(act(died, { type: "cast", spell: "protection" }).usage).toBe(
		died.usage,
	);
});
