import type { GameState } from "../game/GameState";
import { TOWN } from "./TownDefinition";
import { isTownLocation } from "./TownLocation";

// Services open from the building's entry tile or an orthogonal neighbor.
export const canReachOpenBuilding = (
	state: Pick<GameState, "town">,
	id: string,
): boolean => {
	const building = TOWN.buildings.find((b) => b.id === id);
	return (
		building?.status === "open" &&
		isTownLocation(state.town) &&
		Math.abs(state.town.coordinate.row - building.entry.row) +
			Math.abs(state.town.coordinate.col - building.entry.col) <=
			1
	);
};
