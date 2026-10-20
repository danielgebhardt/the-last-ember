// @vitest-environment node
import { describe, expect, it } from "vitest";
import { formatActivityEvent } from "../components/game/ActivityMessages";
import {
	AFFLICTION_DEFINITIONS,
	type AfflictionKind,
} from "../domain/game/AfflictionDefinitions";
import { applyPlayerAffliction } from "../domain/game/Afflictions";
import type { GameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { maximumHealth } from "../domain/game/PlayerHealth";
import {
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import {
	SANCTUARY_SERVICE_NAMES,
	type SanctuaryService,
	sanctuaryQuote,
} from "../domain/town/Sanctuary";
import { createTownLocation } from "../domain/town/TownLocation";
import { savedAdventure } from "./SaveTestHelpers";
import { tacticalSnapshot } from "./TacticalReplayTestHelpers";

const KINDS = Object.keys(AFFLICTION_DEFINITIONS) as AfflictionKind[];
const protectedBuff = {
	actorId: "player",
	floorNumber: null,
	kind: "protected",
	remaining: 5,
} as const;
// At the sanctuary door, wounded, with a buff that treatment must keep.
const atSanctuary = (...kinds: AfflictionKind[]): GameState =>
	kinds.reduce((state, kind) => applyPlayerAffliction(state, kind, "test"), {
		...restoreSave(savedAdventure()).state,
		gold: 1000,
		mana: 2,
		town: { ...createTownLocation(), coordinate: { row: 5, col: 7 } },
		player: { health: 5, maxHealth: 10 },
		effects: [protectedBuff],
	} as GameState);
const treat = (state: GameState, service: SanctuaryService) =>
	resolvePlayerAction(state, {
		type: "sanctuary-treatment",
		quote: sanctuaryQuote(state, service),
	});

describe.each(KINDS)("Cure %s", (kind) => {
	const { name, sanctuaryFee } = AFFLICTION_DEFINITIONS[kind];
	const other = KINDS.find((k) => k !== kind) as AfflictionKind;

	it("quotes its definition fee, and nothing when absent", () => {
		const state = atSanctuary(kind, other);
		expect(SANCTUARY_SERVICE_NAMES[kind]).toBe(`Cure ${name}`);
		expect(sanctuaryQuote(state, kind)).toMatchObject({
			cost: sanctuaryFee,
			conditions: [kind],
			health: 0,
			maximumHealth: maximumHealth(
				state.progression,
				state.equipment,
				state.afflictions.filter((a) => a.kind !== kind),
			),
		});
		expect(sanctuaryQuote(atSanctuary(other), kind).cost).toBe(0);
	});

	it("removes only that condition, keeping HP, mana, buffs and the turn", () => {
		const state = atSanctuary(kind, other);
		const result = treat(state, kind);
		expect(result.turnAdvanced).toBe(false);
		expect(result.state.turn).toBe(state.turn);
		expect(result.state.gold).toBe(1000 - sanctuaryFee);
		expect(result.state.afflictions.map((a) => a.kind)).toEqual([other]);
		expect(result.state.player.health).toBe(state.player.health);
		expect(result.state.mana).toBe(2);
		expect(result.state.effects).toEqual([protectedBuff]);
		const event = result.state.activityHistory.entries.at(-1)?.event;
		if (event?.type !== "sanctuary-treated") throw new Error("Expected event");
		expect(formatActivityEvent(event)).toContain(`removes ${name}`);
		expect(parseSave(serializeSave(tacticalSnapshot(result.state))).ok).toBe(
			true,
		);
	});
});

it("cleanses every active condition in definition order for min(600, total fees)", () => {
	const kinds = KINDS.slice(0, 3);
	const state = atSanctuary(...[...kinds].reverse());
	const total = kinds.reduce(
		(sum, k) => sum + AFFLICTION_DEFINITIONS[k].sanctuaryFee,
		0,
	);
	expect(sanctuaryQuote(state, "cleanse")).toMatchObject({
		cost: Math.min(600, total),
		conditions: kinds,
	});
	const cleansed = treat(state, "cleanse").state;
	expect(cleansed.afflictions).toEqual([]);
	expect(cleansed.gold).toBe(1000 - Math.min(600, total));
	expect(cleansed.player.health).toBe(state.player.health);
});

it("rejects stale, unaffordable and unneeded treatment without charging", () => {
	const state = atSanctuary("slowed");
	const stale = sanctuaryQuote(state, "slowed");
	const expired = { ...state, afflictions: [] };
	const staleResult = resolvePlayerAction(expired, {
		type: "sanctuary-treatment",
		quote: stale,
	});
	expect(staleResult.state).toBe(expired);
	expect(staleResult.error).toBe(
		"The treatment changed. Review the quote and confirm again.",
	);
	const poor = { ...state, gold: 10 };
	expect(treat(poor, "slowed").state).toBe(poor);
	const healthy = atSanctuary();
	expect(treat(healthy, "slowed").error).toBe("No treatment is needed.");
});
