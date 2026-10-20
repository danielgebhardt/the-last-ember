import { type DungeonRun, hashStringToUint32 } from "../dungeon/DungeonRun";
import { createSeededRandom } from "../dungeon/Seed";
import { appendActivityEvents } from "../game/ActivityHistory";
import type { GameState } from "../game/GameState";
import {
	createKnownSpells,
	SPELL_DEFINITIONS,
	type SpellKind,
} from "../game/Spells";
import { ITEM_DEFINITIONS, type ItemKind } from "../items/Item";
import { selectedRunSpellbooks } from "../items/SpellbookPlacement";
import { canReachOpenBuilding } from "./TownServices";

export const LIBRARY_PRICE = 1000;
export const LIBRARY_OFFER_COUNT = 3;
type Spellbook = Readonly<{ book: ItemKind; spell: SpellKind }>;
const SPELLBOOKS: readonly Spellbook[] = (
	Object.keys(ITEM_DEFINITIONS) as ItemKind[]
).flatMap((book) => {
	const definition = ITEM_DEFINITIONS[book];
	return definition.type === "spellbook"
		? [{ book, spell: definition.teaches }]
		: [];
});

// Never a book this seed's dungeon can offer, and never a starting spell. Derived from the
// seed on every read; visits, purchases and loads cannot reroll it.
export const libraryOffers = (run: DungeonRun): readonly Spellbook[] => {
	const dungeon = selectedRunSpellbooks(run);
	const starting = createKnownSpells();
	const pool = SPELLBOOKS.filter(
		({ book, spell }) => !dungeon.includes(book) && !starting.includes(spell),
	);
	const random = createSeededRandom(
		hashStringToUint32(`${run.seed}:library:selection`),
	);
	return Array.from(
		{ length: Math.min(LIBRARY_OFFER_COUNT, pool.length) },
		() => pool.splice(Math.floor(random() * pool.length), 1)[0],
	);
};

// Plain facts drawn from the definition, so the shelf never overstates a spell.
export const spellFacts = (spell: SpellKind): string => {
	const definition = SPELL_DEFINITIONS[spell];
	return [
		`${definition.cost} mana`,
		definition.mode === "self" ? "Self" : "Targeted",
		"range" in definition ? `Range ${definition.range}` : null,
		"radius" in definition ? `Radius ${definition.radius}` : null,
		"element" in definition && definition.element
			? `${definition.element[0].toUpperCase()}${definition.element.slice(1)}`
			: null,
		"minimumDamage" in definition
			? `${definition.minimumDamage}–${definition.maximumDamage} damage`
			: null,
	]
		.filter(Boolean)
		.join(" · ");
};

export type LibraryLearnAction = { type: "library-learn"; book: ItemKind };
export const canReachTownLibrary = (state: GameState): boolean =>
	canReachOpenBuilding(state, "library");

export const libraryRefusal = (
	state: GameState,
	spell: SpellKind,
): string | null =>
	state.knownSpells.includes(spell)
		? "Already known"
		: state.gold < LIBRARY_PRICE
			? "Not enough gold"
			: null;

export const learnAtLibrary = (
	state: GameState,
	action: LibraryLearnAction,
) => {
	const reject = (error: string) => ({
		state,
		turnAdvanced: false as const,
		error,
	});
	if (
		!canReachTownLibrary(state) ||
		state.player.health <= 0 ||
		state.quest.victory
	)
		return reject("Stand beside the open library during an active adventure.");
	const offer = libraryOffers(state.run).find((o) => o.book === action.book);
	if (!offer) return reject("The library does not stock that book.");
	const refusal = libraryRefusal(state, offer.spell);
	if (refusal === "Already known")
		return reject("You already know that spell.");
	if (refusal) return reject("You do not have enough gold.");
	return {
		state: {
			...state,
			gold: state.gold - LIBRARY_PRICE,
			knownSpells: [...state.knownSpells, offer.spell],
			activityHistory: appendActivityEvents(state.activityHistory, [
				{
					type: "library-learned",
					spell: offer.spell,
					gold: LIBRARY_PRICE,
					turn: state.turn,
				},
			]),
		},
		turnAdvanced: false as const,
	};
};
