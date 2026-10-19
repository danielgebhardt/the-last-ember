// @vitest-environment node
import { expect, it } from "vitest";
import { applyDisease, removeDisease } from "../domain/game/Disease";
import { awardExperience } from "../domain/game/ExperienceRewards";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { createBag } from "../domain/items/Bag";
import { compareEquipment } from "../domain/items/EquipmentComparison";
import { resourcesAfterEquipmentChange } from "../domain/items/EquipmentResources";
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
	effects: [],
	player: { health: 10, maxHealth: 10 },
});
it("reduces capacity once, clamps HP, persists until cured and never heals on cure", () => {
	const initial = adventure();
	const diseased = applyDisease(initial, "Plague Rat");
	expect(diseased.player).toEqual({ health: 8, maxHealth: 8 });
	expect(applyDisease(diseased, "Plague Rat")).toBe(diseased);
	let next = diseased;
	for (let i = 0; i < 12; i++)
		next = resolvePlayerAction(next, { type: "wait" }).state;
	expect(next.afflictions).toEqual(diseased.afflictions);
	const cured = removeDisease(next, "test treatment");
	expect(cured.player).toEqual({ health: 8, maxHealth: 10 });
	expect(removeDisease(cured, "test treatment")).toBe(cured);
});
it("recomputes equipment previews, swaps and level capacity without compounding", () => {
	let state = applyDisease(adventure(), "Plague Rat");
	const ring = { id: "review:ring", kind: "ring-vitality" } as const;
	expect(compareEquipment(ring, state)?.after.maxHealth).toBe(11);
	const equipped = { ...state.equipment, leftRing: ring };
	state = {
		...state,
		equipment: equipped,
		...resourcesAfterEquipmentChange(state, equipped),
	};
	expect(state.player).toEqual({ health: 8, maxHealth: 11 });
	state = awardExperience(state, 10);
	expect(state.player).toEqual({ health: 9, maxHealth: 12 });
	expect(removeDisease(state, "test").player).toEqual({
		health: 9,
		maxHealth: 16,
	});
});
it("ordinary healing and poison preserve Disease, and lethal poison cannot be reversed by Renewal", () => {
	let state = applyDisease(adventure(), "Plague Rat");
	state = {
		...state,
		player: { health: 1, maxHealth: 8 },
		bag: createBag([{ id: "review:heal", kind: "healing-potion" }]),
	};
	const healed = resolvePlayerAction(state, {
		type: "consume",
		itemId: "review:heal",
	}).state;
	expect(healed.player).toEqual({ health: 6, maxHealth: 8 });
	expect(healed.afflictions).toEqual(state.afflictions);
	const lethal = resolvePlayerAction(
		{
			...state,
			effects: [
				{
					actorId: "player",
					floorNumber: null,
					kind: "poisoned",
					remaining: 2,
				},
				{
					actorId: "player",
					floorNumber: null,
					kind: "renewing",
					remaining: 2,
				},
			],
		},
		{ type: "wait" },
	).state;
	expect(lethal.player.health).toBe(0);
});
it("round trips actual Disease and rejects unsupported, duplicate and impossible saved effects", () => {
	const state = applyDisease(adventure(), "Plague Rat");
	const doc = tacticalSnapshot(state);
	const parsed = parseSave(serializeSave(doc));
	expect(parsed.ok).toBe(true);
	if (!parsed.ok) throw Error(parsed.error);
	const restored = restoreSave(parsed.value).state;
	expect(restored.player).toEqual(state.player);
	expect(resolvePlayerAction(restored, { type: "wait" }).state).toEqual(
		resolvePlayerAction(state, { type: "wait" }).state,
	);
	for (const afflictions of [
		[{ kind: "curse", remaining: null, source: "test" }],
		[{ kind: "disease", remaining: 10, source: "test" }],
		[...(state.afflictions ?? []), ...(state.afflictions ?? [])],
	])
		expect(
			parseSave(
				JSON.stringify({ ...doc, state: { ...doc.state, afflictions } }),
			).ok,
		).toBe(false);
	expect(
		parseSave(
			JSON.stringify({
				...doc,
				state: { ...doc.state, player: { health: 8, maxHealth: 10 } },
			}),
		).ok,
	).toBe(false);
});
