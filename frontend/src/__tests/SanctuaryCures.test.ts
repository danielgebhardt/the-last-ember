// @vitest-environment node
import { expect, it } from "vitest";
import { applyPlayerAffliction } from "../domain/game/Afflictions";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import {
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { sanctuaryQuote } from "../domain/town/Sanctuary";
import { createTownLocation } from "../domain/town/TownLocation";
import { savedAdventure } from "./SaveTestHelpers";
import { tacticalSnapshot } from "./TacticalReplayTestHelpers";

const adventure = () =>
	applyPlayerAffliction(
		{
			...restoreSave(savedAdventure()).state,
			gold: 1000,
			town: { ...createTownLocation(), coordinate: { row: 5, col: 7 } },
			player: { health: 5, maxHealth: 10 },
			mana: 1,
			effects: [
				{
					actorId: "player",
					floorNumber: null,
					kind: "poisoned",
					remaining: 4,
				},
				{
					actorId: "player",
					floorNumber: null,
					kind: "protected",
					remaining: 5,
				},
			],
		},
		"disease",
		"Plague Rat",
	);
it("quotes independent cure fees and complete cleansing without bundling health or mana", () => {
	const state = adventure();
	expect(sanctuaryQuote(state, "poison")).toMatchObject({
		cost: 40,
		conditions: ["poisoned"],
		health: 0,
		maximumHealth: 8,
	});
	expect(sanctuaryQuote(state, "disease")).toMatchObject({
		cost: 150,
		conditions: ["disease"],
		health: 0,
		maximumHealth: 10,
	});
	const quote = sanctuaryQuote(state, "cleanse");
	expect(quote).toMatchObject({
		cost: 190,
		conditions: ["poisoned", "disease"],
		health: 0,
		maximumHealth: 10,
	});
	const result = resolvePlayerAction(state, {
		type: "sanctuary-treatment",
		quote,
	});
	expect(result.state.gold).toBe(810);
	expect(result.state.player).toEqual({ health: 5, maxHealth: 10 });
	expect(result.state.mana).toBe(1);
	expect(result.state.afflictions).toEqual([]);
	expect(result.state.effects).toEqual([
		{ actorId: "player", floorNumber: null, kind: "protected", remaining: 5 },
	]);
	expect(result.state.turn).toBe(state.turn);
	expect(parseSave(serializeSave(tacticalSnapshot(result.state))).ok).toBe(
		true,
	);
	expect(
		resolvePlayerAction(result.state, { type: "sanctuary-treatment", quote })
			.state,
	).toBe(result.state);
});
it("cures only the requested condition and rejects stale or unaffordable treatment", () => {
	const state = adventure();
	const quote = sanctuaryQuote(state, "disease");
	const cured = resolvePlayerAction(state, {
		type: "sanctuary-treatment",
		quote,
	}).state;
	expect(cured.afflictions).toEqual([]);
	expect(cured.effects).toBe(state.effects);
	expect(cured.player.health).toBe(5);
	for (const altered of [
		{ ...state, gold: 149 },
		{ ...state, afflictions: [], player: { health: 5, maxHealth: 10 } },
	])
		expect(
			resolvePlayerAction(altered, { type: "sanctuary-treatment", quote })
				.state,
		).toBe(altered);
	const poison = resolvePlayerAction(state, {
		type: "sanctuary-treatment",
		quote: sanctuaryQuote(state, "poison"),
	}).state;
	expect(poison.afflictions).toBe(state.afflictions);
	expect(poison.effects.every((e) => e.kind !== "poisoned")).toBe(true);
});
