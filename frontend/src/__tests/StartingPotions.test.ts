// @vitest-environment node

import { expect, it } from "vitest";
import { createGameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { bagSlots } from "../domain/items/Bag";
import {
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import { savedAdventure } from "./SaveTestHelpers";

it("starts freely with one healing potion on 1 and one mana potion on 2", () => {
	const state = createGameState(createCorridorEncounter());
	expect(state.bag.items).toEqual([
		{ id: "starting:healing-potion", kind: "healing-potion" },
		{ id: "starting:mana-potion", kind: "mana-potion" },
	]);
	expect(state.potionHotbar).toEqual([
		"healing-potion",
		"mana-potion",
		null,
		null,
	]);
	expect(state.turn).toBe(0);
	expect(state.activityHistory.entries).toEqual([]);
	expect(bagSlots(state.bag)).toHaveLength(2);
});

it("stacks mana-first pickups without displacing defaults or restoring manually cleared shortcuts", () => {
	const fresh = createGameState(createCorridorEncounter());
	const before = {
		...fresh,
		monsters: [],
		objects: [],
		floorItems: [
			{
				item: { id: "found:mana", kind: "mana-potion" as const },
				floorNumber: 1,
				coordinate: fresh.run.playerCoordinate,
			},
			{
				item: { id: "found:healing", kind: "healing-potion" as const },
				floorNumber: 1,
				coordinate: fresh.run.playerCoordinate,
			},
		],
	};
	const mana = resolvePlayerAction(before, {
		type: "pickup",
		itemId: "found:mana",
	}).state;
	const healing = resolvePlayerAction(mana, {
		type: "pickup",
		itemId: "found:healing",
	}).state;
	expect(
		bagSlots(healing.bag).map(({ item, count }) => [item.kind, count]),
	).toEqual([
		["healing-potion", 2],
		["mana-potion", 2],
	]);
	expect(healing.potionHotbar).toBe(before.potionHotbar);
	const reassigned = resolvePlayerAction(healing, {
		type: "assign-hotbar",
		slot: 4,
		itemId: "starting:healing-potion",
	}).state;
	const cleared = resolvePlayerAction(reassigned, {
		type: "clear-hotbar",
		slot: 2,
	}).state;
	expect(cleared.potionHotbar).toEqual([null, null, null, "healing-potion"]);
	expect(cleared.turn).toBe(2);
	const extra = {
		...cleared,
		floorItems: [
			{
				item: { id: "found:extra-mana", kind: "mana-potion" as const },
				floorNumber: 1,
				coordinate: fresh.run.playerCoordinate,
			},
		],
	};
	const picked = resolvePlayerAction(extra, {
		type: "pickup",
		itemId: "found:extra-mana",
	}).state;
	expect(picked.potionHotbar).toBe(cleared.potionHotbar);
	expect(bagSlots(picked.bag)[1].count).toBe(3);
});

it("uses the starter copies through ordinary shortcuts and leaves exhausted assignments available for later pickups", () => {
	const fresh = createGameState(createCorridorEncounter());
	const before = {
		...fresh,
		monsters: [],
		objects: [],
		mana: 0,
		player: { ...fresh.player, health: 1 },
	};
	const mana = resolvePlayerAction(before, {
		type: "use-hotbar",
		slot: 2,
	}).state;
	expect(mana.turn).toBe(1);
	expect(mana.mana).toBe(5);
	expect(mana.bag.items.map((item) => item.id)).toEqual([
		"starting:healing-potion",
	]);
	const healed = resolvePlayerAction(mana, {
		type: "use-hotbar",
		slot: 1,
	}).state;
	expect(healed.turn).toBe(2);
	expect(healed.player.health).toBe(6);
	expect(healed.bag.items).toEqual([]);
	expect(healed.potionHotbar).toEqual(before.potionHotbar);
	expect(before.bag.items).toHaveLength(2);
	const replay = createGameState(healed.run);
	expect(replay.bag).toEqual(fresh.bag);
	expect(replay.bag.items[0]).not.toBe(fresh.bag.items[0]);
	expect(replay.potionHotbar).toEqual(fresh.potionHotbar);
	expect(replay.turn).toBe(0);
});

it("loads a v%i empty bag and custom shortcuts without granting or assigning starter potions", () => {
	const document = savedAdventure();
	const old = {
		...document,
		version: 31,
		state: {
			...document.state,
			bag: { items: [] },
			potionHotbar: [null, null, "mana-potion", null],
		},
	};
	const parsed = parseSave(JSON.stringify(old));
	if (!parsed.ok) throw new Error(parsed.error);
	const loaded = restoreSave(parsed.value).state;
	expect(loaded.bag.items).toEqual([]);
	expect(loaded.potionHotbar).toEqual(old.state.potionHotbar);
	expect(loaded.turn).toBe(document.state.turn);
});

it("round-trips new starter ownership without duplicating bottles", () => {
	const document = savedAdventure();
	const parsed = parseSave(serializeSave(document));
	if (!parsed.ok) throw new Error(parsed.error);
	const loaded = restoreSave(parsed.value).state;
	expect(loaded.bag).toEqual(document.state.bag);
	expect(loaded.bag.items).toHaveLength(2);
	expect(loaded.potionHotbar).toEqual([
		"healing-potion",
		"mana-potion",
		null,
		null,
	]);
});
