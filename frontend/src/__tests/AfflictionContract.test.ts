// @vitest-environment node
// Rules every affliction shares. Per-kind files test only each condition's own mechanic.
import { describe, expect, it } from "vitest";
import { formatActivityEvent } from "../components/game/ActivityMessages";
import {
	AFFLICTION_DEFINITIONS,
	type AfflictionKind,
} from "../domain/game/AfflictionDefinitions";
import {
	advancePlayerAfflictions,
	applyPlayerAffliction,
} from "../domain/game/Afflictions";
import { createGameState, type GameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { PLAYER_AFFLICTION_LIMIT } from "../domain/game/PlayerAfflictions";
import { createBag } from "../domain/items/Bag";
import type { ItemKind } from "../domain/items/Item";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import { savedAdventure } from "./SaveTestHelpers";

const KINDS = Object.keys(AFFLICTION_DEFINITIONS) as AfflictionKind[];
const quiet = (): GameState => ({
	...createGameState(createCorridorEncounter()),
	monsters: [],
	player: { health: 30, maxHealth: 30 },
});
const changes = (state: GameState) =>
	state.activityHistory.entries.flatMap(({ event }) =>
		event.type === "affliction-changed" ? [event.change] : [],
	);

describe.each(KINDS)("%s", (kind) => {
	const definition = AFFLICTION_DEFINITIONS[kind];
	const duration =
		definition.lifetime.type === "phases" ? definition.lifetime.duration : null;
	const others = KINDS.filter((k) => k !== kind);

	it("applies once with its full lifetime and explains itself in Activity", () => {
		const state = applyPlayerAffliction(quiet(), kind, "test source");
		expect(state.afflictions).toEqual([
			{ kind, remaining: duration, source: "test source" },
		]);
		const event = state.activityHistory.entries.at(-1)?.event;
		if (event?.type !== "affliction-changed") throw new Error("Expected event");
		expect(formatActivityEvent(event)).toContain(definition.appliedText);
		// A repeat at full strength changes nothing and logs nothing.
		expect(applyPlayerAffliction(state, kind, "again")).toBe(state);
	});

	it("refreshes a timed lifetime and is rejected once the cap is full", () => {
		const applied = applyPlayerAffliction(quiet(), kind, "first");
		if (duration !== null) {
			const later = advancePlayerAfflictions(applied);
			const refreshed = applyPlayerAffliction(later, kind, "second");
			expect(refreshed.afflictions).toEqual([
				{ kind, remaining: duration, source: "second" },
			]);
			expect(changes(refreshed)).toEqual(["applied", "refreshed"]);
		}
		const full = others
			.slice(0, PLAYER_AFFLICTION_LIMIT)
			.reduce((s, other) => applyPlayerAffliction(s, other, "cap"), quiet());
		const rejected = applyPlayerAffliction(full, kind, "over");
		expect(rejected.afflictions).toEqual(full.afflictions);
		expect(changes(rejected).at(-1)).toBe("rejected");
	});

	it("is removed by its own remedy for one item and one turn, free when absent", () => {
		const cure = definition.cure as ItemKind;
		const other = others.find(
			(k) => AFFLICTION_DEFINITIONS[k].cure !== definition.cure,
		) as AfflictionKind;
		const withRemedy = (state: GameState) => ({
			...state,
			bag: createBag([{ id: "test:remedy", kind: cure }]),
		});
		const use = { type: "consume", itemId: "test:remedy" } as const;
		const sick = withRemedy(
			applyPlayerAffliction(
				applyPlayerAffliction(quiet(), kind, "test"),
				other,
				"test",
			),
		);
		const cured = resolvePlayerAction(sick, use);
		expect(cured.turnAdvanced).toBe(true);
		expect(cured.state.bag.items).toEqual([]);
		expect(cured.state.afflictions.map((a) => a.kind)).toEqual([other]);
		const absent = withRemedy(applyPlayerAffliction(quiet(), other, "test"));
		const free = resolvePlayerAction(absent, use);
		expect(free.state).toBe(absent);
		expect(free.error).toContain(definition.absentText);
	});

	it.skipIf(duration === null)(
		"expires after its phases, logging the expiry once",
		() => {
			let state = applyPlayerAffliction(quiet(), kind, "test");
			for (let phase = 0; phase < (duration ?? 0); phase++)
				state = advancePlayerAfflictions(state);
			expect(state.afflictions).toEqual([]);
			expect(changes(state)).toEqual(["applied", "expired"]);
			expect(advancePlayerAfflictions(state)).toBe(state);
		},
	);

	it("saves only lifetimes its definition allows", () => {
		const original = restoreSave(savedAdventure());
		const save = (remaining: number | null) =>
			parseSave(
				serializeSave(
					createSaveDocument(
						{
							// Apply for real so derived capacity matches, then set the lifetime.
							...applyPlayerAffliction(
								{ ...original.state, monsters: [] },
								kind,
								"test",
							),
							afflictions: [{ kind, remaining, source: "test" }],
						},
						original.exploration,
						original.configuration,
						original.fog,
					),
				),
			).ok;
		if (duration === null) {
			expect(save(null)).toBe(true);
			expect(save(3)).toBe(false);
		} else {
			expect(save(duration)).toBe(true);
			expect(save(1)).toBe(true);
			expect(save(duration + 1)).toBe(false);
			expect(save(null)).toBe(false);
		}
	});
});

it("caps active conditions at three", () => {
	expect(PLAYER_AFFLICTION_LIMIT).toBe(3);
});
