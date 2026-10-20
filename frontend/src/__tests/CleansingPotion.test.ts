// @vitest-environment node
import { expect, it } from "vitest";
import { applyPlayerAffliction } from "../domain/game/Afflictions";
import { createGameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { createBag } from "../domain/items/Bag";
import { lootWeights } from "../domain/items/LootWeights";
import { enabledRemedies } from "../domain/items/Remedies";
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

it("uses one bottle and one turn, removing only Slowed before monsters act", () => {
	const initial = {
		...applyPlayerAffliction(
			applyPlayerAffliction(adventure(), "disease", "rat"),
			"slowed",
			"web",
		),
		effects: [
			{ actorId: "player", floorNumber: null, kind: "poisoned", remaining: 3 },
		] as const,
	};
	const result = resolvePlayerAction(initial, drink);
	expect(result.turnAdvanced).toBe(true);
	expect(result.state.turn).toBe(initial.turn + 1);
	expect(result.state.afflictions?.map((a) => a.kind)).toEqual(["disease"]);
	expect(result.state.effects).toMatchObject([
		{ kind: "poisoned", remaining: 2 },
	]);
	expect(result.state.bag.items).toEqual([]);
	expect(parseSave(serializeSave(tacticalSnapshot(result.state))).ok).toBe(
		true,
	);
});

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

it("costs nothing without Slowed, including while only diseased or poisoned", () => {
	const initial = adventure();
	for (const state of [
		initial,
		applyPlayerAffliction(initial, "disease", "rat"),
		{
			...initial,
			effects: [
				{
					actorId: "player",
					floorNumber: null,
					kind: "poisoned",
					remaining: 3,
				} as const,
			],
		},
		applyPlayerAffliction(
			{ ...initial, player: { health: 0, maxHealth: 10 } },
			"slowed",
			"web",
		),
	]) {
		const result = resolvePlayerAction(state, drink);
		expect(result.state).toBe(state);
		expect(result.turnAdvanced).toBe(false);
	}
	expect(resolvePlayerAction(initial, drink).error).toBe("You are not Slowed.");
});

it("joins loot only on floors 3–12 in adventures marked for it, leaving older pools unchanged", () => {
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
	for (let seed = 0; seed < 512; seed++) {
		const both = chestReward(seed, chest, [
			"cure-disease-potion",
			"cleansing-potion",
		]);
		if (both.item.kind === "cleansing-potion") found++;
		// A Disease-era adventure keeps exactly its earlier reward.
		expect(
			chestReward(seed, chest, ["cure-disease-potion"]).item.kind,
		).not.toBe("cleansing-potion");
	}
	expect(found).toBeGreaterThan(0);
	expect(found).toBeLessThan(40);

	const fresh = createGameState(createCorridorEncounter());
	expect(enabledRemedies(fresh)).toEqual([
		"cure-disease-potion",
		"cleansing-potion",
	]);
	const legacy = savedAdventure();
	delete legacy.state.cleansingRemedies;
	const parsed = parseSave(serializeSave(legacy));
	if (!parsed.ok) throw new Error(parsed.error);
	expect(enabledRemedies(restoreSave(parsed.value).state)).toEqual([
		"cure-disease-potion",
	]);
});
