import type { Difficulty } from "../game/Difficulty";
// Floors larger than 40×40 are too big to play well and to save (#419).
export const MAX_SIZE = 40;
export const MAX_FLOORS = 20;

export type RoomConfiguration = {
	minRoomSize: number;
	maxRoomAspectRatio: number;
};

export type DungeonConfig = {
	rows: number;
	cols: number;
	minPartitionSize: number;
	roomPadding: number;
} & Partial<RoomConfiguration>;

export type RunConfiguration = Required<DungeonConfig> & {
	floorCount: number;
	difficulty?: Difficulty;
};

export const DEFAULT_RUN_CONFIGURATION: RunConfiguration = {
	rows: 40,
	cols: 40,
	floorCount: 20,
	difficulty: 1,
	minPartitionSize: 8,
	roomPadding: 1,
	minRoomSize: 3,
	maxRoomAspectRatio: 3,
};
export const CONFIGURATION_LIMITS = {
	rows: { min: 10, max: MAX_SIZE },
	cols: { min: 10, max: MAX_SIZE },
	floorCount: { min: 5, max: MAX_FLOORS },
};

export type FogConfiguration = { enabled: boolean; radius: number };
export const DEFAULT_FOG_CONFIGURATION: FogConfiguration = {
	enabled: true,
	radius: 8,
};
export const FOG_RADIUS_LIMITS = { min: 1, max: 20 };

// Internal generation rules; settings and saved configuration fields are unchanged.
export const LOOP_CORRIDOR_RULES = {
	maxLength: 18,
	roomsPerLoop: 12,
	maxPerFloor: 6,
	minSavedSteps: 5,
	minDetourRatio: 1.4,
	nearestRooms: 3,
	candidateJitter: 8,
} as const;

// The standard dungeon every ranked adventure uses; balance is tuned for it.
export const isStandardDungeon = (
	configuration: Pick<RunConfiguration, "rows" | "cols" | "floorCount">,
) =>
	configuration.rows === DEFAULT_RUN_CONFIGURATION.rows &&
	configuration.cols === DEFAULT_RUN_CONFIGURATION.cols &&
	configuration.floorCount === DEFAULT_RUN_CONFIGURATION.floorCount;
