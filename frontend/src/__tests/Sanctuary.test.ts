// @vitest-environment node
import { expect, it } from "vitest";
import { applyDisease } from "../domain/game/Disease";
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

const adventure = () => ({
	...restoreSave(savedAdventure()).state,
	town: { ...createTownLocation(), coordinate: { row: 5, col: 7 } },
	gold: 1000,
	mana: 1,
	player: { health: 4, maxHealth: 10 },
});
it("quotes actual health at 10 gold/HP capped at 150, heals only after a valid confirmation and pauses time", () => {
	const state = adventure();
	const quote = sanctuaryQuote(state, "health");
	expect(quote).toMatchObject({ cost: 60, health: 6 });
	const result = resolvePlayerAction(state, {
		type: "sanctuary-treatment",
		quote,
	});
	expect(result.turnAdvanced).toBe(false);
	expect(result.state.player.health).toBe(10);
	expect(result.state.gold).toBe(940);
	expect(result.state.mana).toBe(1);
	expect(result.state.effects).toBe(state.effects);
	expect(result.state.turn).toBe(state.turn);
	expect(
		sanctuaryQuote(
			{ ...state, player: { health: 1, maxHealth: 30 } },
			"health",
		),
	).toMatchObject({ cost: 150, health: 29 });
	expect(parseSave(serializeSave(tacticalSnapshot(result.state))).ok).toBe(
		true,
	);
});
it("rejects healthy, unaffordable, stale, distant and ended transactions without partial changes", () => {
	const initial = adventure();
	const quote = sanctuaryQuote(initial, "health");
	for (const state of [
		{ ...initial, player: { health: 10, maxHealth: 10 } },
		{ ...initial, gold: 0 },
		{ ...initial, player: { health: 3, maxHealth: 10 } },
		{ ...initial, town: createTownLocation() },
		{ ...initial, player: { health: 0, maxHealth: 10 } },
		{ ...initial, quest: { ...initial.quest, cureRecovered: true } },
	]) {
		const result = resolvePlayerAction(state, {
			type: "sanctuary-treatment",
			quote,
		});
		expect(result.state).toBe(state);
		expect(result.turnAdvanced).toBe(false);
	}
});
it("heals only to diseased capacity and does not cleanse poison or Disease", () => {
	const state = {
		...applyDisease(adventure(), "Plague Rat"),
		effects: [
			{ actorId: "player", floorNumber: null, kind: "poisoned", remaining: 3 },
		] as const,
	};
	const quote = sanctuaryQuote(state, "health");
	expect(quote).toMatchObject({ cost: 40, health: 4, maximumHealth: 8 });
	const result = resolvePlayerAction(state, {
		type: "sanctuary-treatment",
		quote,
	});
	expect(result.state.player).toEqual({ health: 8, maxHealth: 8 });
	expect(result.state.afflictions).toBe(state.afflictions);
	expect(result.state.effects).toBe(state.effects);
});
