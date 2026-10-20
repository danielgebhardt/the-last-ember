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

const adventure = () =>
	applyPlayerAffliction(
		applyPlayerAffliction(
			{
				...restoreSave(savedAdventure()).state,
				gold: 1000,
				town: { ...createTownLocation(), coordinate: { row: 5, col: 7 } },
				player: { health: 5, maxHealth: 10 },
			},
			"curse",
			"hexweaver",
		),
		"mana-burn",
		"leech",
	);
const treat = (
	state: ReturnType<typeof adventure>,
	service: "curse" | "cleanse",
) =>
	resolvePlayerAction(state, {
		type: "sanctuary-treatment",
		quote: sanctuaryQuote(state, service),
	});

it("quotes Curse at 250 gold, after Mana Burn in the fee order", () => {
	const state = adventure();
	expect(sanctuaryQuote(state, "curse")).toMatchObject({
		cost: 250,
		conditions: ["curse"],
		health: 0,
	});
	expect(sanctuaryQuote(state, "cleanse")).toMatchObject({
		cost: 325,
		conditions: ["mana-burn", "curse"],
	});
	expect(sanctuaryQuote({ ...state, afflictions: [] }, "curse").cost).toBe(0);
});

it("lifts only Curse without a turn, HP or mana, and saves", () => {
	const state = adventure();
	const result = treat(state, "curse");
	expect(result.turnAdvanced).toBe(false);
	expect(result.state.gold).toBe(750);
	expect(result.state.afflictions?.map((a) => a.kind)).toEqual(["mana-burn"]);
	expect(result.state.player).toEqual(state.player);
	expect(result.state.mana).toBe(state.mana);
	const last = result.state.activityHistory.entries.at(-1)?.event;
	if (last?.type !== "sanctuary-treated") throw new Error("Expected treatment");
	expect(formatActivityEvent(last)).toContain("removes Curse");
	expect(parseSave(serializeSave(tacticalSnapshot(result.state))).ok).toBe(
		true,
	);
	expect(treat(state, "cleanse").state.afflictions).toEqual([]);
});
