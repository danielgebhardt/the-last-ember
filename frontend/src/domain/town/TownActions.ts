import {
	MOVEMENT_OFFSETS,
	type MovementDirection,
} from "../dungeon/DungeonRun";
import type { Coordinate } from "../dungeon/DungeonTypes";
import { isTownWalkable, TOWN } from "./TownDefinition";
import { type AdventureLocation, isTownLocation } from "./TownLocation";
import { DORMANT_PORTAL_MESSAGE } from "./TownPortal";

export type TownAction =
	| { type: "move"; direction: MovementDirection }
	| { type: "inspect" };
export type TownActionResult = {
	location: AdventureLocation;
	turnAdvanced: false;
	message: string;
	error?: string;
};
const distance = (a: Coordinate, b: Coordinate) =>
	Math.abs(a.row - b.row) + Math.abs(a.col - b.col);

// Owns town-only changes. No combat, recovery, effects, inventory or dungeon turn ticking.
export const resolveTownAction = (
	location: AdventureLocation,
	action: unknown,
	gateMessage = "Dungeon entrance — travel is not connected in this preview.",
	portalMessage = DORMANT_PORTAL_MESSAGE,
): TownActionResult => {
	const unchanged = (message: string, error?: string): TownActionResult => ({
		location,
		turnAdvanced: false,
		message,
		...(error ? { error } : {}),
	});
	if (!isTownLocation(location))
		return unchanged(
			"Town actions require a valid town location.",
			"invalid-location",
		);
	if (typeof action !== "object" || action === null || !("type" in action))
		return unchanged("Unknown town action.", "invalid-action");
	if (action.type === "inspect") {
		const building = TOWN.buildings.find(
			(building) => distance(location.coordinate, building.entry) <= 1,
		);
		if (building)
			return unchanged(
				`${building.sign} ${building.status === "open" ? "Open. Press E beside the door to browse." : "Closed."}`,
			);
		if (distance(location.coordinate, TOWN.portal) <= 1)
			return unchanged(portalMessage);
		if (distance(location.coordinate, TOWN.beacon) <= 1)
			return unchanged(
				"The beacon is dying. No one has volunteered to tell it.",
			);
		if (distance(location.coordinate, TOWN.gate) <= 1)
			return unchanged(gateMessage);
		return unchanged(
			"Quiet streets. Walk beside a doorway, the beacon or the dungeon gate and inspect again.",
		);
	}
	if (
		action.type !== "move" ||
		!("direction" in action) ||
		typeof action.direction !== "string" ||
		!Object.hasOwn(MOVEMENT_OFFSETS, action.direction)
	)
		return unchanged("Unknown town action.", "invalid-action");
	const direction = action.direction as MovementDirection;
	const offset = MOVEMENT_OFFSETS[direction];
	const coordinate = {
		row: location.coordinate.row + offset.row,
		col: location.coordinate.col + offset.col,
	};
	if (!isTownWalkable(coordinate)) return unchanged("The way is blocked.");
	return {
		location: { ...location, coordinate },
		turnAdvanced: false,
		message: "",
	};
};
