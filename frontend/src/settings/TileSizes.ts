import { useSyncExternalStore } from "react";

// The map tile sizes Settings offers, smallest first, in CSS pixels. Each row
// also sets what has to grow with the tiles; add a row to offer another size.
export const TILE_SIZES = [
	{
		tile: 24,
		// Combat feedback: damage numbers, MISS/LOOT/DEATH labels, and how far
		// a mark rises and stacks above the last one.
		feedbackText: 14,
		feedbackLabel: 11,
		feedbackRise: 14,
		// The warning triangle on a threatened tile, and a loot pile's count.
		threatMarker: 10,
		pileCount: 9,
	},
	{
		tile: 32,
		feedbackText: 16,
		feedbackLabel: 12,
		feedbackRise: 18,
		threatMarker: 12,
		pileCount: 11,
	},
	{
		tile: 36,
		feedbackText: 18,
		feedbackLabel: 13,
		feedbackRise: 20,
		threatMarker: 14,
		pileCount: 12,
	},
] as const;

export type TileSize = (typeof TILE_SIZES)[number]["tile"];
export const DEFAULT_TILE_SIZE: TileSize = 32;

const storageKey = "larn-tile-size";

const sizing = (tile: TileSize) =>
	TILE_SIZES.find((size) => size.tile === tile) ?? TILE_SIZES[0];

// The CSS variables the map, its markers and combat feedback read.
export const tileSizeVariables = (tile: TileSize) => {
	const size = sizing(tile);
	return {
		"--dungeon-tile-size": `${size.tile}px`,
		"--tile-feedback-text": `${size.feedbackText}px`,
		"--tile-feedback-label": `${size.feedbackLabel}px`,
		"--tile-feedback-rise": `${size.feedbackRise}px`,
		"--tile-threat-marker": `${size.threatMarker}px`,
		"--tile-pile-count": `${size.pileCount}px`,
	};
};

const readTileSize = (): TileSize => {
	try {
		const saved = Number(localStorage.getItem(storageKey));
		const known = TILE_SIZES.find((size) => size.tile === saved);
		if (known) return known.tile;
	} catch {
		// The map still sizes itself when browser storage is unavailable.
	}
	return DEFAULT_TILE_SIZE;
};

let current: TileSize = readTileSize();
const listeners = new Set<() => void>();

const apply = () => {
	for (const [name, value] of Object.entries(tileSizeVariables(current)))
		document.documentElement.style.setProperty(name, value);
};
apply();

export const setTileSize = (tile: TileSize) => {
	current = sizing(tile).tile;
	try {
		localStorage.setItem(storageKey, String(current));
	} catch {
		// Keep the session preference even if it cannot be saved.
	}
	apply();
	for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
};

export const useTileSize = () => useSyncExternalStore(subscribe, () => current);
