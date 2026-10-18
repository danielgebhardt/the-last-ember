import { isTownLocation } from "../town/TownLocation";
import { hasConsistentActors } from "./SaveActorConsistency";
import { hasConsistentGeometry } from "./SaveGeometryConsistency";
import { hasConsistentHistory } from "./SaveHistoryConsistency";
import { hasConsistentInventory } from "./SaveInventoryConsistency";
import { hasConsistentResources } from "./SaveResourceConsistency";
import type { SaveSourceDocument } from "./SaveSource";

// Shape validation precedes these cross-field invariants. Validate equipment
// ownership first, before resource calculations consult catalog bonuses.
export const isConsistentSave = (document: SaveSourceDocument): boolean =>
	hasConsistentInventory(document) &&
	hasConsistentResources(document) &&
	hasConsistentGeometry(document) &&
	hasConsistentActors(document) &&
	hasConsistentHistory(document) &&
	hasConsistentTown(document);

const hasConsistentTown = (document: SaveSourceDocument): boolean => {
	const { state } = document;
	const portal = "townPortal" in state ? state.townPortal : null;
	if (!("town" in state) || state.town === null) return !portal;
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
