import type { DungeonRun } from "../dungeon/DungeonRun";
import type { Coordinate } from "../dungeon/DungeonTypes";
import { WALL } from "../dungeon/Tiles";
import { migrateLegacyTownLocation } from "./LegacyTownLocation";
import { isTownWalkable, TOWN, TOWN_LAYOUT_ID } from "./TownDefinition";

export type TownLocation = {
	kind: "town";
	layoutId: typeof TOWN_LAYOUT_ID;
	coordinate: Coordinate;
};
export type DungeonLocation = {
	kind: "dungeon";
	floorNumber: number;
	coordinate: Coordinate;
};
export type AdventureLocation = TownLocation | DungeonLocation;

const record = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;
const coordinate = (value: unknown): value is Coordinate =>
	record(value) &&
	typeof value.row === "number" &&
	Number.isInteger(value.row) &&
	typeof value.col === "number" &&
	Number.isInteger(value.col);

export const createTownLocation = (): TownLocation => ({
	kind: "town",
	layoutId: TOWN_LAYOUT_ID,
	coordinate: { ...TOWN.arrival },
});

export const isTownLocation = (value: unknown): value is TownLocation =>
	record(value) &&
	value.kind === "town" &&
	value.layoutId === TOWN_LAYOUT_ID &&
	coordinate(value.coordinate) &&
	isTownWalkable(value.coordinate);

// A dungeon location is derived from its existing run, never stored as floor zero.
export const isAdventureLocation = (
	value: unknown,
	run?: DungeonRun,
): value is AdventureLocation => {
	if (isTownLocation(value)) return true;
	if (
		!record(value) ||
		value.kind !== "dungeon" ||
		!run ||
		typeof value.floorNumber !== "number" ||
		!Number.isInteger(value.floorNumber) ||
		value.floorNumber < 1 ||
		!coordinate(value.coordinate)
	)
		return false;
	const floor = run.floors.find(
		(floor) => floor.floorNumber === value.floorNumber,
	);
	const tile = floor?.terrain[value.coordinate.row]?.[value.coordinate.col];
	return tile !== undefined && tile !== WALL;
};
export const dungeonLocation = (run: DungeonRun): DungeonLocation => {
	const location: DungeonLocation = {
		kind: "dungeon",
		floorNumber: run.activeFloor,
		coordinate: { ...run.playerCoordinate },
	};
	if (!isAdventureLocation(location, run))
		throw new RangeError("Invalid dungeon location");
	return location;
};

export type TownLocationSnapshot = { version: 1; location: TownLocation };
const copyTownLocation = (location: TownLocation): TownLocation => ({
	kind: "town",
	layoutId: location.layoutId,
	coordinate: { ...location.coordinate },
});
// This contract is ready for live travel persistence; the Catalog owns only its preview.
export const snapshotTownLocation = (
	location: TownLocation,
): TownLocationSnapshot => {
	if (!isTownLocation(location)) throw new RangeError("Invalid town location");
	return { version: 1, location: copyTownLocation(location) };
};

export const restoreTownLocation = (snapshot: unknown): TownLocation | null => {
	if (!record(snapshot) || snapshot.version !== 1) return null;
	return isTownLocation(snapshot.location)
		? copyTownLocation(snapshot.location)
		: migrateLegacyTownLocation(snapshot.location);
};
