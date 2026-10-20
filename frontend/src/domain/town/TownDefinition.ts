import type { Coordinate } from "../dungeon/DungeonTypes";

// New layout version because building positions and entrances changed.
export const TOWN_LAYOUT_ID = "beacon-town:v2";

export type TownBuilding = Readonly<{
	id: string;
	name: string;
	sign: string;
	district: string;
	mark: string;
	row: number;
	col: number;
	width: number;
	height: number;
	entry: Readonly<Coordinate>;
	status: "open" | "closed";
}>;

const buildings: readonly TownBuilding[] = Object.freeze(
	[
		{
			id: "library",
			name: "Library",
			sign: "Library — the books outlast the librarians. Three rare spellbooks, at scholars' prices.",
			district: "Quiet Lane",
			mark: "L",
			row: 2,
			col: 2,
			width: 3,
			height: 3,
			entry: { row: 4, col: 3 },
		},
		{
			id: "sanctuary",
			name: "Sanctuary",
			sign: "Sanctuary — mercy has a price. Paid healing and condition treatment.",
			district: "Quiet Lane",
			mark: "H",
			row: 2,
			col: 6,
			width: 3,
			height: 3,
			entry: { row: 4, col: 7 },
		},
		{
			id: "storage",
			name: "Storage courtyard",
			sign: "Storage — yours, once there is a lock worth trusting.",
			district: "Forge Court",
			mark: "C",
			row: 2,
			col: 15,
			width: 3,
			height: 3,
			entry: { row: 4, col: 16 },
		},
		{
			id: "forge",
			name: "Forge",
			sign: "Forge — the smith improves what you own, never what you hope to own. Paid reforging.",
			district: "Forge Court",
			mark: "F",
			row: 2,
			col: 19,
			width: 3,
			height: 3,
			entry: { row: 4, col: 20 },
		},
		{
			id: "potions",
			name: "Potion store",
			sign: "Potions — the apothecary returned. The prices survived.",
			district: "Market Street",
			mark: "P",
			row: 14,
			col: 2,
			width: 3,
			height: 3,
			entry: { row: 14, col: 3 },
		},
		{
			id: "armor",
			name: "Armor store",
			sign: "Armor — protection sold separately from confidence.",
			district: "Market Street",
			mark: "A",
			row: 14,
			col: 6,
			width: 3,
			height: 3,
			entry: { row: 14, col: 7 },
		},
		{
			id: "weapons",
			name: "Weapon store",
			sign: "Weapons — every edge has a price.",
			district: "Market Street",
			mark: "W",
			row: 14,
			col: 15,
			width: 3,
			height: 3,
			entry: { row: 14, col: 16 },
		},
		{
			id: "scrolls",
			name: "Scroll shop",
			sign: "Scrolls — please do not test the stock near the beacon.",
			district: "Market Street",
			mark: "S",
			row: 14,
			col: 19,
			width: 3,
			height: 3,
			entry: { row: 14, col: 20 },
		},
		{
			id: "vault-plot",
			name: "Reserved vault plot",
			sign: "Reserved plot — a vault is proposed. Optimistic of them.",
			district: "South Approach",
			mark: "V",
			row: 18,
			col: 2,
			width: 3,
			height: 2,
			entry: { row: 18, col: 3 },
		},
		{
			id: "rag-and-bone",
			name: "The Rag & Bone",
			sign: "The Rag & Bone — we buy what the ruins failed to keep. Carried equipment only; sentiment has no resale value.",
			district: "South Approach",
			mark: "R",
			row: 18,
			col: 19,
			width: 3,
			height: 2,
			entry: { row: 18, col: 20 },
		},
	].map((building) =>
		Object.freeze({
			...building,
			entry: Object.freeze(building.entry),
			status: [
				"potions",
				"armor",
				"weapons",
				"rag-and-bone",
				"sanctuary",
				"forge",
				"library",
			].includes(building.id)
				? ("open" as const)
				: ("closed" as const),
		}),
	),
);

// Authored map, independent of dungeon seeds and random streams.
// # wall, . ground, = paving, R roof,
// D threshold, B beacon, G dungeon gate.
const terrain = Object.freeze([
	"#########################",
	"#...........=...........#",
	"#.RRR.RRR...=..RRR.RRR..#",
	"#.RRR.RRR...=..RRR.RRR..#",
	"#.RDR.RDR...=..RDR.RDR..#",
	"#..=...=....=...=...=...#",
	"#.=====================.#",
	"#.=.......=====.......=.#",
	"#.=.......==B==.......=.#",
	"#.=.......=====.......=.#",
	"#.=.......=====.......=.#",
	"#.=.........=.........=.#",
	"#.=====================.#",
	"#..=...=....=...=...=...#",
	"#.RDR.RDR...=..RDR.RDR..#",
	"#.RRR.RRR...=..RRR.RRR..#",
	"#.RRR.RRR...=..RRR.RRR..#",
	"#.=====================.#",
	"#.RDR.......=......RDR..#",
	"#.RRR.......G......RRR..#",
	"#########################",
]);

export const TOWN = Object.freeze({
	layoutId: TOWN_LAYOUT_ID,
	level: 0 as const,
	width: 25,
	height: 21,
	terrain,
	buildings,
	arrival: Object.freeze({ row: 17, col: 12 }),
	portal: Object.freeze({ row: 8, col: 9 }),
	beacon: Object.freeze({ row: 8, col: 12 }),
	gate: Object.freeze({ row: 19, col: 12 }),
});

export const townTileAt = ({ row, col }: Coordinate): string | undefined =>
	Number.isInteger(row) && Number.isInteger(col) && row >= 0 && col >= 0
		? TOWN.terrain[row]?.[col]
		: undefined;

export const isTownWalkable = (coordinate: Coordinate): boolean => {
	const tile = townTileAt(coordinate);
	return tile !== undefined && [".", "=", "D", "G"].includes(tile);
};
