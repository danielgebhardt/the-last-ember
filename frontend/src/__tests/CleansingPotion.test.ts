// @vitest-environment node
import { expect, it } from "vitest";
import { formatActivityEvent } from "../components/game/ActivityMessages";
import { applyPlayerAffliction } from "../domain/game/Afflictions";
import { createGameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { createBag } from "../domain/items/Bag";
import { lootWeights } from "../domain/items/LootWeights";
import { chestReward } from "../domain/objects/TreasureChests";
import {
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import { savedAdventure } from "./SaveTestHelpers";
import { tacticalSnapshot } from "./TacticalReplayTestHelpers";

const adventure = () => ({
	...restoreSave(savedAdventure()).state,
	monsters: [],
	player: { health: 10, maxHealth: 10 },
	bag: createBag([{ id: "review:cleansing", kind: "cleansing-potion" }]),
});
const drink = { type: "consume", itemId: "review:cleansing" } as const;

it("restores evasion before the ensuing monster attack", () => {
	const encounter = {
		...createGameState(createCorridorEncounter()),
		bag: createBag([{ id: "review:cleansing", kind: "cleansing-potion" }]),
		monsters: [
			{
				id: "1:1",
				kind: "goblin" as const,
				floorNumber: 1,
				coordinate: { row: 1, col: 2 },
				health: 4,
				intent: { type: "idle" as const },
			},
		],
	};
	// A d20 of 4 lands only against the Slowed threshold.
	const rolls = () => ({ d20: () => 4, damage: (min: number) => min });
	const slowed = applyPlayerAffliction(encounter, "slowed", "web");
	const cured = resolvePlayerAction(slowed, drink, rolls).state;
	expect(cured.player.health).toBe(10);
	expect(cured.afflictions).toEqual([]);
});

it("removes Mana Burn too, alone or with Slowed, and names what it removed", () => {
	const burned = applyPlayerAffliction(adventure(), "mana-burn", "leech");
	const alone = resolvePlayerAction(burned, drink).state;
	expect(alone.afflictions).toEqual([]);
	expect(alone.bag.items).toEqual([]);
	const both = resolvePlayerAction(
		applyPlayerAffliction(burned, "slowed", "web"),
		drink,
	).state;
	expect(both.afflictions).toEqual([]);
	const event = both.activityHistory.entries.at(-1)?.event;
	expect(event).toMatchObject({
		type: "item-cleansed",
		conditions: ["mana-burn", "slowed"],
	});
	if (event)
		expect(formatActivityEvent(event)).toContain(
			"remove Mana Burn and Slowed. Passive mana recovery resumes. Evasion restored.",
		);
	expect(parseSave(serializeSave(tacticalSnapshot(both))).ok).toBe(true);
});

it("joins floor, chest and drop loot on floors 3–12", () => {
	for (const floor of [2, 13])
		expect(
			lootWeights(floor, "found").find((e) => e.value === "cleansing-potion"),
		).toBeUndefined();
	expect(
		lootWeights(8, "drop").find((e) => e.value === "cleansing-potion")?.weight,
	).toBe(0.25);
	const chest = {
		id: "8:object:chest:1",
		kind: "chest",
		floorNumber: 8,
		coordinate: { row: 1, col: 1 },
		activated: false,
	} as const;
	let found = 0;
	for (let seed = 0; seed < 512; seed++)
		if (chestReward(seed, chest).item.kind === "cleansing-potion") found++;
	expect(found).toBeGreaterThan(0);
	expect(found).toBeLessThan(40);
});
