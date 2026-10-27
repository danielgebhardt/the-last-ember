import { isTownLocation } from "../town/TownLocation";
import { hasConsistentActors } from "./SaveActorConsistency";
import { hasConsistentArenas } from "./SaveArenaConsistency";
import type { SaveDocument } from "./SaveDocument";
import { hasConsistentFloorTelemetry } from "./SaveFloorTelemetryConsistency";
import { hasConsistentGeometry } from "./SaveGeometryConsistency";
import { hasConsistentHistory } from "./SaveHistoryConsistency";
import { hasConsistentInventory } from "./SaveInventoryConsistency";
import { hasConsistentResources } from "./SaveResourceConsistency";

// Shape validation precedes these cross-field invariants. Validate equipment
// ownership first, before resource calculations consult catalog bonuses.
export const isConsistentSave = (document: SaveDocument): boolean =>
	hasConsistentInventory(document) &&
	hasConsistentResources(document) &&
	hasConsistentGeometry(document) &&
	hasConsistentArenas(document) &&
	hasConsistentActors(document) &&
	hasConsistentHistory(document) &&
	hasConsistentFloorTelemetry(document) &&
	hasConsistentTown(document) &&
	hasConsistentEscape(document);

const hasConsistentTown = (document: SaveDocument): boolean => {
	const { state } = document;
	const portal = state.townPortal;
	if (state.town === null) return !portal;
	const atEntrance =
		state.run.activeFloor === 1 &&
		state.run.playerCoordinate.row === state.quest.entrance.row &&
		state.run.playerCoordinate.col === state.quest.entrance.col;
	const atPortalAnchor =
		!!portal &&
		portal.floorNumber <= state.run.floors.length &&
		portal.floorNumber === state.run.activeFloor &&
		portal.coordinate.row === state.run.playerCoordinate.row &&
		portal.coordinate.col === state.run.playerCoordinate.col;

	return (
		isTownLocation(state.town) &&
		state.player.health > 0 &&
		!state.quest.victory &&
		!state.quest.cureRecovered &&
		!state.bag.items.some((item) => item.kind === "cure") &&
		(portal ? atPortalAnchor : atEntrance)
	);
};

const hasConsistentEscape = ({ state }: SaveDocument): boolean => {
	const escapeState = state.escape;
	if (escapeState === null)
		return !state.quest.cureRecovered || state.quest.victory !== null;
	return (
		state.quest.cureRecovered &&
		escapeState.startedTurn <= state.turn &&
		new Set(escapeState.activatedFloors).size ===
			escapeState.activatedFloors.length &&
		escapeState.activatedFloors.every((floor) => floor < state.quest.goalFloor)
	);
};
