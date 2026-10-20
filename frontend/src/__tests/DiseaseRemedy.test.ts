// @vitest-environment node
import { expect, it } from "vitest";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { createBag } from "../domain/items/Bag";
import { lootWeights } from "../domain/items/LootWeights";
import { chestReward } from "../domain/objects/TreasureChests";
import { restoreSave } from "../domain/saves/SaveFormat";
import { savedAdventure } from "./SaveTestHelpers";

const adventure = () => ({
	...restoreSave(savedAdventure()).state,
	monsters: [],
	player: { health: 10, maxHealth: 10 },
	bag: createBag([{ id: "review:remedy", kind: "cure-disease-potion" }]),
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
		const reward = chestReward(seed, chest);
		expect(reward).toEqual(chestReward(seed, chest));
		if (reward.item.kind === "cure-disease-potion") count++;
	}
	expect(count).toBeGreaterThan(0);
	expect(count).toBeLessThan(20);
});
