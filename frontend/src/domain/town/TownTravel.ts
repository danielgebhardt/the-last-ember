import { FLOOR } from "../dungeon/Tiles";
import type { GameState } from "../game/GameState";
import { navigationRun } from "../objects/NavigationTerrain";
import { TOWN } from "./TownDefinition";
import { createTownLocation, isTownLocation } from "./TownLocation";

export type TownTravelAction = {
	type: "travel";
	destination: "town" | "dungeon";
};
const same = (
	a: { row: number; col: number },
	b: { row: number; col: number },
) => a.row === b.row && a.col === b.col;
export const atDungeonEntrance = (state: GameState): boolean =>
	!state.town &&
	state.run.activeFloor === 1 &&
	same(state.run.playerCoordinate, state.quest.entrance);
export const atTownGate = (state: GameState): boolean =>
	isTownLocation(state.town) && same(state.town.coordinate, TOWN.gate);

export const travelBetweenTownAndDungeon = (
	state: GameState,
	action: TownTravelAction,
): {
	state: GameState;
	turnAdvanced: false;
	error?: string;
	message?: string;
} => {
	const reject = (error: string) => ({
		state,
		turnAdvanced: false as const,
		error,
	});
	if (state.player.health <= 0 || state.quest.victory)
		return reject("This adventure has ended.");
	if (
		state.quest.cureRecovered ||
		state.bag.items.some((item) => item.kind === "cure")
	)
		return reject(
			"The flame must be returned through the floor-1 entrance. Town travel cannot bypass the ascent.",
		);
	if (action.destination === "town") {
		if (!atDungeonEntrance(state))
			return reject("Stand on the floor-1 entrance to return to town.");
		return {
			state: { ...state, town: createTownLocation(), townPortal: null },
			turnAdvanced: false,
			message:
				"You return to Beacon town. The dungeon waits exactly as you left it.",
		};
	}
	if (action.destination !== "dungeon" || !atTownGate(state))
		return reject("Stand on the town dungeon gate to descend.");
	const coordinate = state.quest.entrance;
	const tile =
		navigationRun(state).floors[0]?.terrain[coordinate.row]?.[coordinate.col];
	if (
		(!state.townPortal &&
			(state.run.activeFloor !== 1 ||
				!same(state.run.playerCoordinate, coordinate))) ||
		tile !== FLOOR ||
		state.monsters.some(
			(monster) =>
				monster.floorNumber === 1 &&
				monster.health > 0 &&
				same(monster.coordinate, coordinate),
		)
	)
		return reject("The dungeon arrival is blocked. Travel was canceled.");
	return {
		state: {
			...state,
			town: null,
			townPortal: null,
			run: {
				...state.run,
				activeFloor: 1,
				playerCoordinate: { ...coordinate },
			},
		},
		turnAdvanced: false,
		message: state.townPortal
			? "You leave by the south gate. Your portal closes; you enter floor 1."
			: "You enter floor 1 at the dungeon entrance.",
	};
};
