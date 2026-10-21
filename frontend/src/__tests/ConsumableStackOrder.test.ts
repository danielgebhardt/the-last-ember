// @vitest-environment node
import { expect, it } from "vitest";
import { createGameState, type GameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { bagSlots, createBag } from "../domain/items/Bag";
import type { PotionKind } from "../domain/items/PotionHotbar";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import { savedAdventure } from "./SaveTestHelpers";

it("keeps an interleaved scroll stack and unrelated gear in place through three enchantments", () => {
	const original = {
		...createGameState(createCorridorEncounter()),
		monsters: [],
		objects: [],
		bag: createBag([
			{ id: "scroll:1", kind: "enchantment-scroll" },
			{ id: "sword", kind: "iron-sword", enchantment: 1 },
			{ id: "scroll:2", kind: "enchantment-scroll" },
			{ id: "shield", kind: "tower-shield" },
			{ id: "scroll:3", kind: "enchantment-scroll" },
		]),
	};
	let state: GameState = original;
	for (const [index, scrollId] of [
		"scroll:1",
		"scroll:2",
		"scroll:3",
	].entries()) {
		const result = resolvePlayerAction(state, {
			type: "enchant",
			scrollId,
			targetItemId: "starting:main-hand",
		});
		expect(result.turnAdvanced).toBe(true);
		state = result.state;
		const slots = bagSlots(state.bag);
		expect(slots.map(({ item }) => item.kind)).toEqual(
			index < 2
				? ["enchantment-scroll", "iron-sword", "tower-shield"]
				: ["iron-sword", "tower-shield"],
		);
		if (index < 2) expect(slots[0].count).toBe(2 - index);
		expect(
			state.bag.items.find((item) => item.id === "sword")?.enchantment,
		).toBe(1);
		expect(state.equipment.mainHand?.enchantment).toBe(index + 1);
		expect(state.bag.items.some((item) => item.id === scrollId)).toBe(false);
	}
	expect(state.turn).toBe(3);
	expect(original.bag.items).toHaveLength(5);
});

const potionKinds: readonly PotionKind[] = [
	"healing-potion",
	"greater-healing-potion",
	"mana-potion",
	"greater-mana-potion",
	"antidote",
	"strength-potion",
	"dexterity-potion",
	"intelligence-potion",
];

it.each(potionKinds)(
	"keeps an interleaved %s stack in place when used from its shortcut",
	(kind) => {
		const fresh = createGameState(createCorridorEncounter());
		const before = {
			...fresh,
			monsters: [],
			objects: [],
			mana: 0,
			player: { ...fresh.player, health: 4 },
			effects: [] as const,
			afflictions: [
				{ kind: "poisoned" as const, remaining: 3, source: "test" },
			],
			potionHotbar: [kind, null, null, null] as const,
			bag: createBag([
				{ id: "potion:1", kind },
				{ id: "sword", kind: "iron-sword" },
				{ id: "potion:2", kind },
				{ id: "shield", kind: "tower-shield" },
				{ id: "potion:3", kind },
			]),
		};
		const result = resolvePlayerAction(before, { type: "use-hotbar", slot: 1 });
		expect(result.turnAdvanced).toBe(true);
		expect(
			bagSlots(result.state.bag).map(({ item, count }) => [item.id, count]),
		).toEqual([
			["potion:2", 2],
			["sword", 1],
			["shield", 1],
		]);
		expect(result.state.potionHotbar).toEqual(before.potionHotbar);
		expect(before.bag.items).toHaveLength(5);
	},
);

it("keeps partial drops in place, compacts final removal, and appends a newly reacquired stack", () => {
	let state: GameState = {
		...createGameState(createCorridorEncounter()),
		monsters: [],
		objects: [],
		floorItems: [],
		bag: createBag([
			{ id: "potion:1", kind: "mana-potion" },
			{ id: "sword", kind: "iron-sword" },
			{ id: "potion:2", kind: "mana-potion" },
			{ id: "shield", kind: "tower-shield" },
		]),
	};
	state = resolvePlayerAction(state, {
		type: "drop",
		itemId: "potion:1",
	}).state;
	expect(bagSlots(state.bag).map(({ item }) => item.id)).toEqual([
		"potion:2",
		"sword",
		"shield",
	]);
	state = resolvePlayerAction(state, {
		type: "pickup",
		itemId: "potion:1",
	}).state;
	expect(bagSlots(state.bag)[0].count).toBe(2);
	// Removing a nonrepresentative copy also preserves order.
	state = resolvePlayerAction(state, {
		type: "drop",
		itemId: "potion:1",
	}).state;
	state = resolvePlayerAction(state, {
		type: "drop",
		itemId: "potion:2",
	}).state;
	expect(bagSlots(state.bag).map(({ item }) => item.id)).toEqual([
		"sword",
		"shield",
	]);
	state = resolvePlayerAction(state, {
		type: "pickup",
		itemId: "potion:2",
	}).state;
	expect(bagSlots(state.bag).map(({ item }) => item.id)).toEqual([
		"sword",
		"shield",
		"potion:2",
	]);
});

it("retains the promoted stack order and deterministic next enchantment through a save", () => {
	const saved = restoreSave(savedAdventure());
	const initial = {
		...saved.state,
		monsters: [],
		objects: [],
		bag: createBag([
			{ id: "scroll:1", kind: "enchantment-scroll" },
			{ id: "sword", kind: "iron-sword", enchantment: 2 },
			{ id: "scroll:2", kind: "enchantment-scroll" },
			{ id: "shield", kind: "tower-shield" },
			{ id: "scroll:3", kind: "enchantment-scroll" },
		]),
	};
	const state = resolvePlayerAction(initial, {
		type: "enchant",
		scrollId: "scroll:1",
		targetItemId: "sword",
	}).state;
	const document = createSaveDocument(
		state,
		saved.exploration,
		saved.configuration,
		saved.fog,
	);
	const parsed = parseSave(serializeSave(document));
	if (!parsed.ok) throw new Error(parsed.error);
	expect(parsed.value.version).toBe(31);
	const loaded = restoreSave(parsed.value).state;
	expect(loaded).toEqual(state);
	expect(bagSlots(loaded.bag).map(({ item }) => item.id)).toEqual([
		"scroll:2",
		"sword",
		"shield",
	]);
	const action = {
		type: "enchant",
		scrollId: "scroll:2",
		targetItemId: "starting:main-hand",
	} as const;
	expect(resolvePlayerAction(loaded, action)).toEqual(
		resolvePlayerAction(state, action),
	);
});
