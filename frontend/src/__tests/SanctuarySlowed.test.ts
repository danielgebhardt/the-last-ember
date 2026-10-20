// @vitest-environment node
import { expect, it } from "vitest";
import { formatActivityEvent } from "../components/game/ActivityMessages";
import { applyPlayerAffliction } from "../domain/game/Afflictions";
import { deriveAccuracy } from "../domain/game/MeleeRules";
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
const adventure = (withDisease = true) => {
	const base = {
		...restoreSave(savedAdventure()).state,
		gold: 1000,
		town: { ...createTownLocation(), coordinate: { row: 5, col: 7 } },
		player: { health: 5, maxHealth: 10 },
		effects: [poisoned],
	};
	return applyPlayerAffliction(
		withDisease ? applyPlayerAffliction(base, "disease", "rat") : base,
		"slowed",
		"web",
	);
};
const treat = (
	state: ReturnType<typeof adventure>,
	service: "slowed" | "cleanse",
) =>
	resolvePlayerAction(state, {
		type: "sanctuary-treatment",
		quote: sanctuaryQuote(state, service),
	});

it("quotes Slowed at 50 gold and a complete cleanse of all three at 240", () => {
	const state = adventure();
	expect(sanctuaryQuote(state, "slowed")).toMatchObject({
		cost: 50,
		conditions: ["slowed"],
		health: 0,
		maximumHealth: 8,
	});
	expect(sanctuaryQuote(state, "cleanse")).toMatchObject({
		cost: 240,
		conditions: ["poisoned", "disease", "slowed"],
		maximumHealth: 10,
	});
	expect(sanctuaryQuote(adventure(false), "slowed").maximumHealth).toBe(10);
	const healthy = { ...state, afflictions: [], effects: [] };
	expect(sanctuaryQuote(healthy, "slowed").cost).toBe(0);
});

it("cures only Slowed, restoring evasion without a turn, HP or other cures", () => {
	const state = adventure();
	const result = treat(state, "slowed");
	expect(result.turnAdvanced).toBe(false);
	expect(result.state.turn).toBe(state.turn);
	expect(result.state.gold).toBe(950);
	expect(result.state.afflictions?.map((a) => a.kind)).toEqual(["disease"]);
	expect(result.state.effects).toEqual([poisoned]);
	expect(result.state.player).toEqual(state.player);
	expect(
		deriveAccuracy(
			result.state.progression,
			result.state.effects,
			result.state.equipment,
			result.state.afflictions,
		).evadeChance,
	).toBe(20);
	expect(parseSave(serializeSave(tacticalSnapshot(result.state))).ok).toBe(
		true,
	);
	const last = result.state.activityHistory.entries.at(-1)?.event;
	if (last?.type !== "sanctuary-treated") throw new Error("Expected treatment");
	expect(formatActivityEvent(last)).toContain("removes Slowed");
});

it("cleanses all three for 240, restoring capacity but not HP", () => {
	const result = treat(adventure(), "cleanse");
	expect(result.state.gold).toBe(760);
	expect(result.state.afflictions).toEqual([]);
	expect(result.state.effects).toEqual([]);
	expect(result.state.player).toEqual({ health: 5, maxHealth: 10 });
});

it("rejects a stale Slowed quote after it expires, charging nothing", () => {
	const state = adventure(false);
	const stale = sanctuaryQuote(state, "slowed");
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
