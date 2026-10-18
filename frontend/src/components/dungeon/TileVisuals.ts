import { DoorOpen } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import {
	ENTRANCE,
	FLOOR,
	PLAYER,
	STAIRS_DOWN,
	STAIRS_UP,
	WALL,
} from "../../domain/dungeon/Tiles.ts";
import { StairsDownIcon, StairsUpIcon } from "./StairIcons.tsx";

export const TILE_ICONS: Partial<
	Record<string, ComponentType<SVGProps<SVGSVGElement>>>
> = {
	[ENTRANCE]: DoorOpen,
	[STAIRS_UP]: StairsUpIcon,
	[STAIRS_DOWN]: StairsDownIcon,
};

export const TILE_LABELS: Partial<Record<string, string>> = {
	[WALL]: "wall",
	[ENTRANCE]: "entrance",
	[FLOOR]: "floor",
	[PLAYER]: "player",
	[STAIRS_UP]: "stairs up",
	[STAIRS_DOWN]: "stairs down",
};

export const TILE_ICON_COLORS: Partial<Record<string, string>> = {
	[ENTRANCE]: "text-item-cure",
	[PLAYER]: "text-player",
	[STAIRS_UP]: "text-stairs",
	[STAIRS_DOWN]: "text-stairs",
};

// Wall/floor backgrounds are now supplied by the terrain CSS classes.
// Retained as the baseline surface for wall tiles beneath fog styling.
export const TILE_BACKGROUNDS: Partial<Record<string, string>> = {
	[WALL]: "bg-wall-tile",
};

export const TILE_TERRAIN_CLASSES: Partial<Record<string, string>> = {
	[WALL]: "dungeon-stone-wall",
	[FLOOR]: "dungeon-flagstone",
	[PLAYER]: "dungeon-flagstone",
	[ENTRANCE]: "dungeon-flagstone",
	[STAIRS_UP]: "dungeon-flagstone",
	[STAIRS_DOWN]: "dungeon-flagstone",
};
