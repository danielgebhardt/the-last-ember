import { TOWN } from "./TownDefinition";
import type { TownLocation } from "./TownLocation";

// Retain the original authored geometry only to validate old saved positions.
const LEGACY_TERRAIN = Object.freeze([
	"#############################",
	"#.............=.............#",
	"#.RRRRR.RRRRR.=...RRRRR.RRR.#",
	"#.RRRRR.RRRRR.=...RRRRR.RRR.#",
	"#.RRDRR.RRDRR.=...RRDRR.RDR.#",
	"#...=.....=...=.....=....=..#",
	"#.=========================.#",
	"#.=........=======........=.#",
	"#.=........===B===........=.#",
	"#.=........=======........=.#",
	"#.=........=======........=.#",
	"#.=...........=...........=.#",
	"#.=========================.#",
	"#...=.....=...=...=.....=...#",
	"#.RRDRR.RRDRR.=.RRDRR.RRDRR.#",
	"#.RRRRR.RRRRR.=.RRRRR.RRRRR.#",
	"#.RRRRR.RRRRR.=.RRRRR.RRRRR.#",
	"#.=========================.#",
	"#.RRDRR.......=.......RRDRR.#",
	"#.RRRRR.......G.......RRRRR.#",
	"#############################",
]);

export const migrateLegacyTownLocation = (
	value: unknown,
): TownLocation | null => {
	if (
		typeof value !== "object" ||
		value === null ||
		!("kind" in value) ||
		value.kind !== "town" ||
		!("layoutId" in value) ||
		value.layoutId !== "beacon-town:v1" ||
		!("coordinate" in value)
	)
		return null;
	const coordinate = value.coordinate;
	if (
		typeof coordinate !== "object" ||
		coordinate === null ||
		!("row" in coordinate) ||
		!("col" in coordinate) ||
		typeof coordinate.row !== "number" ||
		typeof coordinate.col !== "number" ||
		!Number.isInteger(coordinate.row) ||
		!Number.isInteger(coordinate.col)
	)
		return null;
	const tile = LEGACY_TERRAIN[coordinate.row]?.[coordinate.col];
	if (!tile || ![".", "=", "D", "G"].includes(tile)) return null;
	// Streets and entrances moved: resume at the safe arrival square rather
	// than interpreting old coordinates against a different map. Ownership,
	// dungeon state, resources and time are not part of this migration.
	return {
		kind: "town",
		layoutId: TOWN.layoutId,
		coordinate: { ...TOWN.arrival },
	};
};
