// @vitest-environment node

import { describe, expect, it } from "vitest";
import { createGameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { createBag } from "../domain/items/Bag";
import type { ItemKind } from "../domain/items/Item";
import { eligibleLootKinds } from "../domain/items/Item";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import { savedAdventure } from "./SaveTestHelpers";

const carrying = (kind: ItemKind) => ({
	...createGameState(createCorridorEncounter()),
	monsters: [],
	bag: createBag([{ id: "drink", kind }]),
});
const drink = { type: "consume", itemId: "drink" } as const;

describe("Utility potions", () => {
	it.each([
		{
			kind: "greater-healing-potion",
			health: 1,
			mana: 0,
			expectedHealth: 10,
			expectedMana: 0,
		},
		{
			kind: "greater-mana-potion",
			health: 10,
			mana: 0,
			expectedHealth: 10,
			expectedMana: 10,
		},
	] as const)(
		"caps $kind recovery at capacity",
		({ kind, health, mana, expectedHealth, expectedMana }) => {
			const before = {
				...carrying(kind),
				player: { health, maxHealth: 10 },
				mana,
			};
			const result = resolvePlayerAction(before, drink);
			expect(result.turnAdvanced).toBe(true);
			expect(result.state.player.health).toBe(expectedHealth);
			expect(result.state.mana).toBe(expectedMana);
			expect(result.state.bag.items).toEqual([]);
		},
	);
	it("uses depth bands for stronger supplies and antidotes", () => {
		expect(eligibleLootKinds(1, "found")).not.toContain("antidote");
		expect(eligibleLootKinds(2, "drop")).toContain("antidote");
		expect(eligibleLootKinds(7, "found")).not.toContain(
			"greater-healing-potion",
		);
		expect(eligibleLootKinds(8, "found")).toContain("greater-healing-potion");
		expect(eligibleLootKinds(20, "drop")).toContain("greater-mana-potion");
	});
	it("retains new potions, shortcuts and the cleansing log in a save", () => {
		const document = savedAdventure();
		const adventure = restoreSave(document);
		adventure.state = {
			...adventure.state,
			monsters: [],
			player: { health: 10, maxHealth: 10 },
			bag: createBag([
				{ id: "drink", kind: "antidote" },
				{ id: "greater", kind: "greater-mana-potion" },
			]),
			potionHotbar: ["antidote", "greater-mana-potion", null, null],
			effects: [],
			afflictions: [
				{ kind: "poisoned" as const, remaining: 3, source: "test" },
			],
		};
		adventure.state = resolvePlayerAction(adventure.state, drink).state;
		const parsed = parseSave(
			serializeSave(
				createSaveDocument(
					adventure.state,
					adventure.exploration,
					adventure.configuration,
					adventure.fog,
				),
			),
		);
		expect(parsed.ok).toBe(true);
		if (!parsed.ok) throw new Error(parsed.error);
		expect(restoreSave(parsed.value).state).toEqual(adventure.state);
	});
});
