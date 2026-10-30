import type { Coordinate } from "../dungeon/DungeonTypes";

// The arena is drawn by hand and identical in every run: an antechamber, the hall
// with its pillars, and the reward room, joined by two doorways. Each doorway is two
// tiles tall, so a 2×2 miniboss can pass through it.
export const ARENA_LAYOUT = [
	"###########################################",
	"##########.......................##########",
	"##########.......................##########",
	"##########.......................##########",
	"##########....##...........##....##########",
	"##########....##...........##....##########",
	"##.......#.......................#.......##",
	"##.......#...........#...........#.......##",
	"##...................#...................##",
	"##...................#...................##",
	"##.......#.......................#.......##",
	"##########....##...........##....##########",
	"##########....##...........##....##########",
	"##########.......................##########",
	"##########.......................##########",
	"##########.......................##########",
	"###########################################",
] as const;
export const ARENA_ROWS = ARENA_LAYOUT.length;
export const ARENA_COLS = ARENA_LAYOUT[0].length;
export const ARENA_POINTS = {
	arrival: { row: 8, col: 4 },
	entryDoor: { row: 8, col: 9 },
	entryDoorLower: { row: 9, col: 9 },
	miniboss: { row: 8, col: 28 },
	exitDoor: { row: 8, col: 33 },
	exitDoorLower: { row: 9, col: 33 },
	reward: { row: 8, col: 37 },
	exitPortal: { row: 8, col: 39 },
} as const satisfies Record<string, Coordinate>;
export const ARENA_ROOMS = {
	antechamber: { startRow: 6, endRow: 10, startCol: 2, endCol: 8 },
	hall: { startRow: 1, endRow: 15, startCol: 10, endCol: 32 },
	reward: { startRow: 6, endRow: 10, startCol: 34, endCol: 40 },
} as const;
