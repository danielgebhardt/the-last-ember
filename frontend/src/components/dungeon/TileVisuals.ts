import {
	ENTRANCE,
	FLOOR,
	PLAYER,
	STAIRS_DOWN,
	STAIRS_UP,
	WALL,
} from "../../domain/dungeon/Tiles.ts";
import { fullColor, type RegisteredIcon } from "../icons/FullColorIcon";
import { EntranceDark, EntranceLight } from "./art/EntranceArt";
import { StairsDownIcon, StairsUpIcon } from "./StairIcons.tsx";

// The player is drawn as the adventurer chosen in Settings (see Adventurers).
export const TILE_ICONS: Partial<Record<string, RegisteredIcon>> = {
	[ENTRANCE]: fullColor(EntranceLight, EntranceDark),
	[STAIRS_UP]: StairsUpIcon,
	[STAIRS_DOWN]: StairsDownIcon,
};

// Single-colour tile icons take their theme colour from these tokens.
export const TILE_ICON_COLORS: Partial<Record<string, string>> = {
	[STAIRS_UP]: "text-stairs",
	[STAIRS_DOWN]: "text-stairs",
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

// Walls and floors each have four drawings. A tile's drawing is fixed by its
// position, so it never shuffles between renders, and a floor stays the same
// under the player, the entrance and the stairs; the hash keeps the
// variations from lining up in stripes.
const TERRAIN_VARIANTS: Partial<Record<string, string>> = {
	"dungeon-stone-wall": "dungeon-wall",
	"dungeon-flagstone": "dungeon-floor",
};

export const terrainTexture = (tile: string, row: number, col: number) => {
	const texture = TILE_TERRAIN_CLASSES[tile];
	const variants = texture && TERRAIN_VARIANTS[texture];
	if (!variants) return texture;
	let hash = Math.imul(row + 1, 73856093) ^ Math.imul(col + 1, 19349663);
	// Fold the high bits down before keeping the low two: on their own, the low
	// bits of the products repeat every 4 rows and columns.
	hash ^= hash >>> 16;
	hash = Math.imul(hash, 0x45d9f3b);
	hash ^= hash >>> 16;
	const variant = hash >>> 0;
	return variant % 4 === 0
		? texture
		: `${texture} ${variants}-${(variant % 4) + 1}`;
};

export const TILE_TERRAIN_CLASSES: Partial<Record<string, string>> = {
	[WALL]: "dungeon-stone-wall",
	[FLOOR]: "dungeon-flagstone",
	[PLAYER]: "dungeon-flagstone",
	[ENTRANCE]: "dungeon-flagstone",
	[STAIRS_UP]: "dungeon-flagstone",
	[STAIRS_DOWN]: "dungeon-flagstone",
};
