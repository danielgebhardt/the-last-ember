import type { Coordinate } from "../dungeon/DungeonTypes";
import { levelForExperience } from "../game/Progression";
import type { SaveDocument } from "./SaveDocument";

export const savedLevel = (document: SaveDocument) =>
	levelForExperience(document.state.progression.experience);
export const sameCoordinate = (a: Coordinate, b: Coordinate) =>
	a.row === b.row && a.col === b.col;
export const unique = (values: readonly unknown[]) =>
	new Set(values).size === values.length;
export const savedLocations = (document: SaveDocument) => {
	const floorAt = (number: number) => document.state.run.floors[number - 1];
	const walkable = (number: number, point: Coordinate) =>
		floorAt(number)?.terrain[point.row]?.[point.col] === ".";
	return { floorAt, walkable };
};

export const savedDifficulty = (document: SaveDocument) =>
	document.configuration.difficulty;
