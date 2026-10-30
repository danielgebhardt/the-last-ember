import type { Coordinate, Dungeon } from "../dungeon/DungeonTypes";
import { FLOOR } from "../dungeon/Tiles";
import { hasLineOfSight } from "../dungeon/Visibility";
import { MONSTER_DEFINITIONS, type Monster } from "./Monster";

// Arena minibosses stand on a 2×2 block of tiles; every other creature on one.
// A monster's coordinate is the top-left tile of its body, so saves and
// identities keep a single position.
export const bodySpan = ({ kind }: Pick<Monster, "kind">): 1 | 2 =>
	MONSTER_DEFINITIONS[kind].miniboss ? 2 : 1;

// The tiles a body would cover with its top-left tile at `anchor`.
export const bodyTilesAt = (
	monster: Pick<Monster, "kind">,
	anchor: Coordinate,
): Coordinate[] => {
	const span = bodySpan(monster);
	const tiles: Coordinate[] = [];
	for (let row = 0; row < span; row += 1)
		for (let col = 0; col < span; col += 1)
			tiles.push({ row: anchor.row + row, col: anchor.col + col });
	return tiles;
};

export const bodyTiles = (
	monster: Pick<Monster, "kind" | "coordinate">,
): Coordinate[] => bodyTilesAt(monster, monster.coordinate);

export const occupies = (
	monster: Pick<Monster, "kind" | "coordinate">,
	point: Coordinate,
): boolean => {
	const span = bodySpan(monster);
	const row = point.row - monster.coordinate.row;
	const col = point.col - monster.coordinate.col;
	return row >= 0 && row < span && col >= 0 && col < span;
};

// Steps from the nearest tile of the body to `point`: 0 on it, 1 beside an edge.
// Diagonal to a corner is 2, as for any one-tile creature.
export const bodyDistance = (
	monster: Pick<Monster, "kind" | "coordinate">,
	point: Coordinate,
): number => {
	const span = bodySpan(monster);
	const { row, col } = monster.coordinate;
	const rowGap = Math.max(row - point.row, 0, point.row - (row + span - 1));
	const colGap = Math.max(col - point.col, 0, point.col - (col + span - 1));
	return rowGap + colGap;
};

// The body tile nearest `point`, for measuring sight and range from the body.
export const nearestBodyTile = (
	monster: Pick<Monster, "kind" | "coordinate">,
	point: Coordinate,
): Coordinate => {
	const span = bodySpan(monster);
	const { row, col } = monster.coordinate;
	return {
		row: Math.min(Math.max(point.row, row), row + span - 1),
		col: Math.min(Math.max(point.col, col), col + span - 1),
	};
};

// Whether any tile of the body has a clear line to `point`.
export const bodyHasLineOfSight = (
	terrain: Dungeon,
	monster: Pick<Monster, "kind" | "coordinate">,
	point: Coordinate,
): boolean =>
	bodyTiles(monster).some((tile) => hasLineOfSight(terrain, tile, point));

// Whether the whole body fits on open floor with its top-left tile at `anchor`.
export const bodyFitsAt = (
	terrain: Dungeon,
	monster: Pick<Monster, "kind">,
	anchor: Coordinate,
	blocked: (point: Coordinate) => boolean = () => false,
): boolean =>
	bodyTilesAt(monster, anchor).every(
		(tile) => terrain[tile.row]?.[tile.col] === FLOOR && !blocked(tile),
	);

// The tiles ringing a body, edges first and then corners, in a fixed order. For a
// one-tile creature: up, right, down, left, then the four diagonals.
export const bodyRing = (
	monster: Pick<Monster, "kind" | "coordinate">,
): Coordinate[] => {
	const span = bodySpan(monster);
	const { row, col } = monster.coordinate;
	const across = Array.from({ length: span }, (_, step) => step);
	return [
		...across.map((step) => ({ row: row - 1, col: col + step })),
		...across.map((step) => ({ row: row + step, col: col + span })),
		...across.map((step) => ({ row: row + span, col: col + step })),
		...across.map((step) => ({ row: row + step, col: col - 1 })),
		{ row: row - 1, col: col - 1 },
		{ row: row - 1, col: col + span },
		{ row: row + span, col: col + span },
		{ row: row + span, col: col - 1 },
	];
};
