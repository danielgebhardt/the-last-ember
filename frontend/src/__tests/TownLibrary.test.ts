// @vitest-environment node
import { expect, it } from "vitest";
import { formatActivityEvent } from "../components/game/ActivityMessages";
import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import type { GameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { createKnownSpells } from "../domain/game/Spells";
import { selectedRunSpellbooks } from "../domain/items/SpellbookPlacement";
import {
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import {
	LIBRARY_PRICE,
	libraryOffers,
	spellFacts,
} from "../domain/town/TownLibrary";
import { createTownLocation } from "../domain/town/TownLocation";
import { savedAdventure } from "./SaveTestHelpers";
import { tacticalSnapshot } from "./TacticalReplayTestHelpers";
import { COMPACT_TEST_CONFIGURATION } from "./TestRunConfiguration";

const atLibrary = (): GameState => ({
	...restoreSave(savedAdventure()).state,
	gold: 2500,
	town: { ...createTownLocation(), coordinate: { row: 5, col: 3 } },
});

it("offers three distinct books per seed, never a dungeon book or starting spell", () => {
	const seen = new Set<string>();
	for (let seed = 0; seed < 60; seed++) {
		for (const floors of [5, 20]) {
			const run = connectDungeonFloors(
				generateDungeonRun(seed, floors, COMPACT_TEST_CONFIGURATION),
			);
			const offers = libraryOffers(run);
			expect(offers).toHaveLength(3);
			expect(new Set(offers.map((o) => o.book)).size).toBe(3);
			const dungeon = selectedRunSpellbooks(run);
			for (const { book, spell } of offers) {
				expect(dungeon).not.toContain(book);
				expect(createKnownSpells()).not.toContain(spell);
				seen.add(book);
			}
			expect(libraryOffers(run)).toEqual(offers);
		}
	}
	// Seeds vary the shelf.
	expect(seen.size).toBeGreaterThan(8);
	expect(spellFacts("ember-bolt")).toBe(
		"4 mana · Targeted · Range 4 · Fire · 8–12 damage",
	);
	// The buyer's perks adjust cost and range.
	expect(
		spellFacts("ember-bolt", {
			experience: 30,
			perks: [{ level: 3, perk: "efficient-casting" }],
		}),
	).toBe("3 mana · Targeted · Range 4 · Fire · 8–12 damage");
	expect(
		spellFacts("ember-bolt", {
			experience: 30,
			perks: [{ level: 3, perk: "long-reach" }],
		}),
	).toBe("4 mana · Targeted · Range 5 · Fire · 8–12 damage");
});

it("teaches an offered spell for 1000 gold and no turn, then saves and restores it", () => {
	const state = atLibrary();
	const [offer] = libraryOffers(state.run);
	const result = resolvePlayerAction(state, {
		type: "library-learn",
		book: offer.book,
	});
	expect(result.turnAdvanced).toBe(false);
	expect(result.state.turn).toBe(state.turn);
	expect(result.state.gold).toBe(2500 - LIBRARY_PRICE);
	expect(result.state.knownSpells).toEqual([...state.knownSpells, offer.spell]);
	expect(result.state.bag).toEqual(state.bag);
	const event = result.state.activityHistory.entries.at(-1)?.event;
	if (event?.type !== "library-learned") throw new Error("Expected event");
	expect(formatActivityEvent(event)).toContain("for 1000 gold");
	const parsed = parseSave(serializeSave(tacticalSnapshot(result.state)));
	if (!parsed.ok) throw new Error(parsed.error);
	const restored = restoreSave(parsed.value).state;
	expect(restored.knownSpells).toEqual(result.state.knownSpells);
	expect(libraryOffers(restored.run)).toEqual(libraryOffers(state.run));
});

it("rejects free: known spell, unstocked book, gold, ended run and away from the library", () => {
	const state = atLibrary();
	const [offer] = libraryOffers(state.run);
	const unstocked = selectedRunSpellbooks(state.run)[0];
	const learned = resolvePlayerAction(state, {
		type: "library-learn",
		book: offer.book,
	}).state;
	const cases: [GameState, string][] = [
		[learned, offer.book],
		[state, unstocked],
		[{ ...state, gold: 999 }, offer.book],
		[{ ...state, player: { ...state.player, health: 0 } }, offer.book],
		[{ ...state, town: createTownLocation() }, offer.book],
	];
	for (const [current, book] of cases) {
		const result = resolvePlayerAction(current, {
			type: "library-learn",
			book: book as typeof offer.book,
		});
		expect(result.state).toBe(current);
		expect(result.turnAdvanced).toBe(false);
		expect(result.error).toBeTruthy();
	}
});
