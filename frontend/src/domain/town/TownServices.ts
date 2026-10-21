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

// Open services in priority order, with the E-key label. Each dialog opens only for its own
// building, so the shared "service open" flag in Home needs no per-service branches.
const SERVICES = [
	["sanctuary", "Sanctuary"],
	["forge", "Forge"],
	["library", "Library"],
	["potions", "Potion store"],
	["scrolls", "Scroll shop"],
	["armor", "Equipment store"],
	["weapons", "Equipment store"],
	["rag-and-bone", "The Rag & Bone"],
] as const;
export const reachableTownService = (
	state: Pick<GameState, "town">,
): { id: (typeof SERVICES)[number][0]; label: string } | null => {
	const found = SERVICES.find(([id]) => canReachOpenBuilding(state, id));
	return found ? { id: found[0], label: found[1] } : null;
};
