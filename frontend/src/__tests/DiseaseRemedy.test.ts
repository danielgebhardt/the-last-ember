// @vitest-environment node
import { expect, it } from "vitest";
import { applyDisease } from "../domain/game/Disease";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { createBag } from "../domain/items/Bag";
import { lootWeights } from "../domain/items/LootWeights";
import { chestReward } from "../domain/objects/TreasureChests";
import {
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { savedAdventure } from "./SaveTestHelpers";
import { tacticalSnapshot } from "./TacticalReplayTestHelpers";

const adventure = () => ({
	...restoreSave(savedAdventure()).state,
	monsters: [],
	player: { health: 10, maxHealth: 10 },
	bag: createBag([{ id: "review:remedy", kind: "cure-disease-potion" }]),
});
it("uses one remedy and one turn, restoring capacity before poison without curing poison", () => {
	const initial = {
		...applyDisease(adventure(), "Plague Rat"),
		effects: [
			{ actorId: "player", floorNumber: null, kind: "poisoned", remaining: 3 },
		] as const,
	};
	const result = resolvePlayerAction(initial, {
		type: "consume",
		itemId: "review:remedy",
	});
	expect(result.turnAdvanced).toBe(true);
	expect(result.state.turn).toBe(initial.turn + 1);
	expect(result.state.player).toEqual({ health: 7, maxHealth: 10 });
	expect(result.state.afflictions).toEqual([]);
	expect(result.state.effects).toMatchObject([
		{ kind: "poisoned", remaining: 2 },
	]);
	expect(result.state.bag.items).toEqual([]);
	const doc = tacticalSnapshot(result.state);
	expect(parseSave(serializeSave(doc)).ok).toBe(true);
});
it("healthy, wrong-item and ended uses cost no bottle, turn or HP", () => {
	const initial = adventure();
	for (const state of [
		initial,
		{ ...initial, player: { health: 0, maxHealth: 10 } },
	]) {
		const result = resolvePlayerAction(state, {
			type: "consume",
			itemId: "review:remedy",
		});
		expect(result.state).toBe(state);
		expect(result.turnAdvanced).toBe(false);
	}
});
it("offers low-weight remedies only in the source band and preserves old chest reward sequences", () => {
	for (const floor of [1, 7])
		expect(
			lootWeights(floor, "found").find(
				(e) => e.value === "cure-disease-potion",
			),
		).toBeUndefined();
	expect(
		lootWeights(3, "found").find((e) => e.value === "cure-disease-potion")
			?.weight,
	).toBe(0.25);
	const chest = {
		id: "3:object:chest:1",
		kind: "chest",
		floorNumber: 3,
		coordinate: { row: 1, col: 1 },
		activated: false,
	} as const;
	let count = 0;
	for (let seed = 0; seed < 256; seed++) {
		const reward = chestReward(seed, chest, ["cure-disease-potion"]);
		expect(reward).toEqual(chestReward(seed, chest, ["cure-disease-potion"]));
		if (reward.item.kind === "cure-disease-potion") count++;
		expect(chestReward(seed, chest).item.kind).not.toBe("cure-disease-potion");
	}
	expect(count).toBeGreaterThan(0);
	expect(count).toBeLessThan(20);
});
