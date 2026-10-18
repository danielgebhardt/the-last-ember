import type { Coordinate } from "../dungeon/DungeonTypes";
import { levelForExperience } from "../game/Progression";
import type { SaveSourceDocument } from "./SaveSource";

export const savedLevel = (document: SaveSourceDocument) =>
	document.version < 3
		? Math.min(5, levelForExperience(document.state.progression.experience))
		: levelForExperience(document.state.progression.experience);
export const sameCoordinate = (a: Coordinate, b: Coordinate) =>
	a.row === b.row && a.col === b.col;
export const unique = (values: readonly unknown[]) =>
	new Set(values).size === values.length;
export const savedLocations = (document: SaveSourceDocument) => {
	const floorAt = (number: number) => document.state.run.floors[number - 1];
	const walkable = (number: number, point: Coordinate) =>
		floorAt(number)?.terrain[point.row]?.[point.col] === ".";
	return { floorAt, walkable };
};

export const savedDifficulty = (document: SaveSourceDocument) =>
	document.version === 20 ||
	document.version === 21 ||
	document.version === 22 ||
	document.version === 23 ||
	document.version === 24 ||
	document.version === 25 ||
	document.version === 26 ||
	document.version === 27
		? document.configuration.difficulty
		: 1;
