import {
	ENTRANCE,
	FLOOR,
	PLAYER,
	STAIRS_DOWN,
	STAIRS_UP,
	WALL,
} from "../../domain/dungeon/Tiles.ts";
import { type FullColorIcon, fullColor } from "../icons/FullColorIcon";
import { EntranceDark, EntranceLight } from "./art/EntranceArt";
import { PlayerDark, PlayerLight } from "./art/PlayerArt";
import { StairsDownDark, StairsDownLight } from "./art/StairsDownArt";
import { StairsUpDark, StairsUpLight } from "./art/StairsUpArt";

export const TILE_ICONS: Partial<Record<string, FullColorIcon>> = {
	[ENTRANCE]: fullColor(EntranceLight, EntranceDark),
	[PLAYER]: fullColor(PlayerLight, PlayerDark),
	[STAIRS_UP]: fullColor(StairsUpLight, StairsUpDark),
	[STAIRS_DOWN]: fullColor(StairsDownLight, StairsDownDark),
};

export const TILE_LABELS: Partial<Record<string, string>> = {
	[WALL]: "wall",
	[ENTRANCE]: "entrance",
	[FLOOR]: "floor",
	[PLAYER]: "player",
	[STAIRS_UP]: "stairs up",
	[STAIRS_DOWN]: "stairs down",
};

// Wall/floor backgrounds are now supplied by the terrain CSS classes.
// Retained as the baseline surface for wall tiles beneath fog styling.
export const TILE_BACKGROUNDS: Partial<Record<string, string>> = {
	[WALL]: "bg-wall-tile",
};

// One of four wall drawings, fixed by position so a wall never shuffles between
// renders; the hash keeps the variations from lining up in stripes.
export const terrainTexture = (tile: string, row: number, col: number) => {
	const texture = TILE_TERRAIN_CLASSES[tile];
	if (tile !== WALL || !texture) return texture;
	const variant =
		(Math.imul(row + 1, 73856093) ^ Math.imul(col + 1, 19349663)) >>> 0;
	return variant % 4 === 0
		? texture
		: `${texture} dungeon-wall-${(variant % 4) + 1}`;
};

export const TILE_TERRAIN_CLASSES: Partial<Record<string, string>> = {
	[WALL]: "dungeon-stone-wall",
	[FLOOR]: "dungeon-flagstone",
	[PLAYER]: "dungeon-flagstone",
	[ENTRANCE]: "dungeon-flagstone",
	[STAIRS_UP]: "dungeon-flagstone",
	[STAIRS_DOWN]: "dungeon-flagstone",
};
