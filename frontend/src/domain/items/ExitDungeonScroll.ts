import { ARENA_SCROLL_REFUSAL, inStandingArena } from "../arena/ArenaRules";
import { hasLineOfSight } from "../dungeon/Visibility";
import { appendActivityEvents } from "../game/ActivityHistory";
import type { GameState } from "../game/GameState";
import { navigationRun } from "../objects/NavigationTerrain";
import { TOWN } from "../town/TownDefinition";
import { createTownLocation } from "../town/TownLocation";
import { removeBagItem } from "./Bag";

export type ExitDungeonAction = { type: "exit-dungeon"; itemId: string };
export const EXIT_SCROLL_EMBER_RESTRICTION =
	"Town portal scrolls cannot be used while carrying the Warden's Flame.";
export const PORTAL_SAFETY_RADIUS = 8;
export const exitScrollRestriction = (state: GameState): string | null => {
	if (state.player.health <= 0 || state.quest.victory)
		return "The adventure has ended.";
	if (
		state.quest.cureRecovered ||
		state.bag.items.some((item) => item.kind === "cure")
	)
		return EXIT_SCROLL_EMBER_RESTRICTION;
	if (state.town || state.townPortal)
		return "Return through or abandon your existing portal before reading another scroll.";
	if (inStandingArena(state)) return ARENA_SCROLL_REFUSAL;
	const terrain =
		navigationRun(state).floors[state.run.activeFloor - 1]?.terrain;
	if (!terrain) return "There is no dungeon here to anchor a portal.";
	const origin = state.run.playerCoordinate;
	if (
		state.monsters.some(
			(actor) =>
				actor.floorNumber === state.run.activeFloor &&
				actor.health > 0 &&
				(actor.intent.type.startsWith("preparing-") ||
					((actor.coordinate.row - origin.row) ** 2 +
						(actor.coordinate.col - origin.col) ** 2 <=
						PORTAL_SAFETY_RADIUS ** 2 &&
						hasLineOfSight(terrain, origin, actor.coordinate))),
		)
	)
		return "Clear nearby enemies and prepared attacks before opening a town portal.";
	return null;
};
export const readExitScroll = (
	state: GameState,
	action: ExitDungeonAction,
): GameState | { error: string } => {
	const restriction = exitScrollRestriction(state);
	if (restriction) return { error: restriction };
	const scroll = state.bag.items.find((item) => item.id === action.itemId);
	if (scroll?.kind !== "exit-scroll")
		return { error: "Choose a town portal scroll in your bag." };
	return {
		...state,
		town: { ...createTownLocation(), coordinate: { ...TOWN.portal } },
		townPortal: {
			floorNumber: state.run.activeFloor,
			coordinate: { ...state.run.playerCoordinate },
		},
		bag: removeBagItem(state.bag, scroll.id),
		activityHistory: appendActivityEvents(state.activityHistory, [
			{
				type: "exit-scroll-used",
				fromFloor: state.run.activeFloor,
				destination: "town",
				turn: state.turn,
			},
		]),
	};
};
