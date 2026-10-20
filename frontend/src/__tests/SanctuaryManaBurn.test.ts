// @vitest-environment node
import { expect, it } from "vitest";
import { formatActivityEvent } from "../components/game/ActivityMessages";
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

const poisoned = {
	actorId: "player",
	floorNumber: null,
	kind: "poisoned",
	remaining: 4,
} as const;
const adventure = (withSlowed = true) => {
	const base = {
		...restoreSave(savedAdventure()).state,
		gold: 1000,
		mana: 2,
		town: { ...createTownLocation(), coordinate: { row: 5, col: 7 } },
		player: { health: 5, maxHealth: 10 },
		effects: [poisoned],
	};
	const burned = applyPlayerAffliction(base, "mana-burn", "leech");
	return withSlowed ? applyPlayerAffliction(burned, "slowed", "web") : burned;
};
const treat = (
	state: ReturnType<typeof adventure>,
	service: "mana-burn" | "cleanse",
) =>
	resolvePlayerAction(state, {
		type: "sanctuary-treatment",
		quote: sanctuaryQuote(state, service),
	});

it("quotes Mana Burn at 75 gold and a cleanse with Slowed and poison at 165", () => {
	const state = adventure();
	expect(sanctuaryQuote(state, "mana-burn")).toMatchObject({
		cost: 75,
		conditions: ["mana-burn"],
		health: 0,
		maximumHealth: 10,
	});
	expect(sanctuaryQuote(state, "cleanse")).toMatchObject({
		cost: 165,
		conditions: ["poisoned", "slowed", "mana-burn"],
	});
	expect(sanctuaryQuote({ ...state, afflictions: [] }, "mana-burn").cost).toBe(
		0,
	);
});

it("cures only Mana Burn without a turn, mana, HP or other cures", () => {
	const state = adventure();
	const result = treat(state, "mana-burn");
	expect(result.turnAdvanced).toBe(false);
	expect(result.state.turn).toBe(state.turn);
	expect(result.state.gold).toBe(925);
	expect(result.state.mana).toBe(2);
	expect(result.state.afflictions?.map((a) => a.kind)).toEqual(["slowed"]);
	expect(result.state.effects).toEqual([poisoned]);
	expect(result.state.player).toEqual(state.player);
	expect(parseSave(serializeSave(tacticalSnapshot(result.state))).ok).toBe(
		true,
	);
	const last = result.state.activityHistory.entries.at(-1)?.event;
	if (last?.type !== "sanctuary-treated") throw new Error("Expected treatment");
	expect(formatActivityEvent(last)).toContain("removes Mana Burn");
});

it("cleanses every active condition and rejects a stale quote free", () => {
	const cleansed = treat(adventure(), "cleanse").state;
	expect(cleansed.gold).toBe(835);
	expect(cleansed.afflictions).toEqual([]);
	expect(cleansed.effects).toEqual([]);
	expect(parseSave(serializeSave(tacticalSnapshot(cleansed))).ok).toBe(true);

	const state = adventure(false);
	const stale = sanctuaryQuote(state, "mana-burn");
	const expired = { ...state, afflictions: [] };
	const result = resolvePlayerAction(expired, {
		type: "sanctuary-treatment",
		quote: stale,
	});
	expect(result.state).toBe(expired);
	expect(result.error).toBe(
		"The treatment changed. Review the quote and confirm again.",
	);
});
