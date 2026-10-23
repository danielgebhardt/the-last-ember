import { type DungeonRun, hashStringToUint32 } from "../dungeon/DungeonRun";
import type { Coordinate } from "../dungeon/DungeonTypes";
import { createSeededRandom } from "../dungeon/Seed";
import type { FloorItem } from "../items/FloorItems";
import type { ItemKind } from "../items/Item";
import { selectLootKind } from "../items/Loot";
import type { Monster, MonsterKind } from "../monsters/Monster";
import {
	coordinateKey,
	protectedFloorLocations,
} from "../monsters/MonsterLocations";
import { maximumMonsterHealth } from "../monsters/MonsterStats";
import { EXTRA_THIEF_IDS } from "../monsters/TreasureThief";
import type {
	DungeonObject,
	DungeonObjectKind,
} from "../objects/DungeonObject";
import { reachableRoomTiles } from "../objects/RareDiscoveryPlacement";
import { vaultSites } from "../objects/SecretVaults";
import type { Difficulty } from "./Difficulty";

// Some floors carry an omen: a rule or a gathering that changes how that floor plays.
// Chosen once at adventure creation and saved, so older adventures have none.
export const OMEN_CHANCE = 0.3;
export const OMEN_MIN_FLOOR = 3;

type OmenContext = Readonly<{
	floor: DungeonRun["floors"][number];
	depth: number;
	objects: readonly DungeonObject[];
	merchants: boolean;
}>;
type OmenDefinition = Readonly<{
	name: string;
	// What the arrival notice and Help say.
	description: string;
	minFloor?: number;
	eligible?: (context: OmenContext) => boolean;
}>;
const noneOf = (kind: DungeonObjectKind) => (context: OmenContext) =>
	!context.objects.some((object) => object.kind === kind);

export const OMEN_DEFINITIONS = {
	dark: {
		name: "Dark",
		description: "Your sight is halved here, but two extra finds lie about.",
	},
	infested: {
		name: "Infested",
		description: "Rats swarm this floor, led by plague rats.",
	},
	"thieves-den": {
		name: "Thieves' den",
		description: "Two treasure thieves prowl here. Guard your purse.",
	},
	hoard: {
		name: "Hoard",
		description:
			"Two extra finds lie about, and this floor's chest is a mimic.",
		// Mimics live from floor 4.
		minFloor: 4,
	},
	"restless-dead": {
		name: "Restless dead",
		description: "The dead walk this floor in numbers.",
	},
	quiet: {
		name: "Quiet",
		description: "Half the usual creatures, but an alarm sentry keeps watch.",
	},
	unstable: {
		name: "Unstable",
		description: "Extra traps line the floor; disarming one gives double XP.",
	},
	cracked: {
		name: "Cracked",
		description: "Somewhere here a cracked wall hides a secret vault.",
		eligible: (context) => vaultSites(context.floor).length > 0,
	},
	"merchants-rest": {
		name: "Merchant's rest",
		description: "A wandering merchant has set up here, and its room is clear.",
		eligible: (context) =>
			context.merchants &&
			context.floor.floorNumber % 5 !== 0 &&
			context.floor.floorNumber < context.depth,
	},
	bloodied: {
		name: "Bloodied",
		description:
			"Creatures here hit a quarter harder, and every kill gives half again the XP.",
	},
	"ember-lit": {
		name: "Ember-lit",
		description:
			"The whole floor is revealed, but every creature notices you from 2 tiles farther.",
	},
	"plague-ridden": {
		name: "Plague-ridden",
		description:
			"Disease carriers lurk here; a Cure Disease potion lies nearby.",
	},
	webbed: {
		name: "Webbed",
		description: "Spiders nest here; a Cleansing potion lies nearby.",
	},
	"echoing-halls": {
		name: "Echoing halls",
		description:
			"Every blow you land echoes: creatures within 8 tiles come running.",
	},
	hallowed: {
		name: "Hallowed",
		description:
			"A shrine and a fountain stand here, and the dead deal 1 less damage.",
	},
	gilded: {
		name: "Gilded",
		description: "Twice the gold lies here, and a thief has noticed.",
	},
	"forge-fire": {
		name: "Forge-fire",
		description: "A Forgotten Forge burns here, guarded by salamanders.",
		minFloor: 6,
		eligible: noneOf("forge"),
	},
	lair: {
		name: "Lair",
		description:
			"An iron champion roams this floor. It always drops equipment for its depth.",
		minFloor: 8,
	},
	"fortunes-floor": {
		name: "Fortune's floor",
		description: "A Wishing Well stands here, and it favors offerings.",
		eligible: noneOf("well"),
	},
	"time-worn": {
		name: "Time-worn",
		description:
			"An Hourglass of Ages stands here, and creatures recover 1 health each phase they are left alone.",
		minFloor: 8,
		eligible: noneOf("hourglass"),
	},
	"arcane-surge": {
		name: "Arcane surge",
		description: "Spells hit 30% harder here, yours and theirs.",
	},
	"forgotten-library": {
		name: "Forgotten library",
		description:
			"Two extra scrolls lie about, and an abandoned spell archive waits to be searched.",
	},
} as const satisfies Record<string, OmenDefinition>;
export type OmenKind = keyof typeof OMEN_DEFINITIONS;
export const OMEN_KINDS = Object.keys(OMEN_DEFINITIONS) as OmenKind[];
export type FloorOmen = Readonly<{ floorNumber: number; kind: OmenKind }>;

export const omenAt = (
	state: { omens?: readonly FloorOmen[] },
	floorNumber: number,
): OmenKind | undefined =>
	state.omens?.find((omen) => omen.floorNumber === floorNumber)?.kind;

// The floors between the omen floor and the Warden's each roll once on their own stream,
// choosing among omens they can hold that no earlier floor took.
export const selectFloorOmens = (
	run: DungeonRun,
	objects: readonly DungeonObject[],
	merchants: boolean,
): readonly FloorOmen[] => {
	const omens: FloorOmen[] = [];
	for (const floor of run.floors) {
		if (
			floor.floorNumber < OMEN_MIN_FLOOR ||
			floor.floorNumber >= run.floors.length
		)
			continue;
		const random = createSeededRandom(
			hashStringToUint32(`${run.seed}:${floor.floorNumber}:omen`),
		);
		if (random() >= OMEN_CHANCE) continue;
		const context = { floor, depth: run.floors.length, objects, merchants };
		const choices = OMEN_KINDS.filter((kind) => {
			const definition: OmenDefinition = OMEN_DEFINITIONS[kind];
			return (
				floor.floorNumber >= (definition.minFloor ?? OMEN_MIN_FLOOR) &&
				!omens.some((omen) => omen.kind === kind) &&
				(definition.eligible?.(context) ?? true)
			);
		});
		if (choices.length)
			omens.push({
				floorNumber: floor.floorNumber,
				kind: choices[Math.floor(random() * choices.length)],
			});
	}
	return omens;
};

// Omen creatures take reserved identities between the discovery IDs and the sentry
// reinforcements, so neither rule mistakes them.
export const OMEN_SPAWN_ID = 1500000;
// An omen's gathering brings its own remedy, so its creatures stay out of the ordinary
// affliction budget and first-remedy guarantee.
export const isOmenSpawn = (monster: Pick<Monster, "id">) => {
	const index = Number(monster.id.split(":")[1]);
	return index >= OMEN_SPAWN_ID && index < OMEN_SPAWN_ID + 1000;
};
const GATHERINGS: Partial<Record<OmenKind, readonly MonsterKind[]>> = {
	infested: ["giant-rat", "giant-rat", "giant-rat", "plague-rat"],
	"restless-dead": ["skeleton", "skeleton", "zombie", "wraith"],
	"plague-ridden": ["plague-rat", "plague-rat"],
	webbed: ["spider", "spider", "spider"],
	"forge-fire": ["salamander", "salamander"],
	lair: ["iron-champion"],
	quiet: ["alarm-sentry"],
};
const FINDS: Partial<Record<OmenKind, readonly (ItemKind | "loot")[]>> = {
	dark: ["loot", "loot"],
	hoard: ["loot", "loot"],
	"plague-ridden": ["cure-disease-potion"],
	webbed: ["cleansing-potion"],
	"forgotten-library": ["enchantment-scroll", "remove-curse-scroll"],
};
const FEATURES: Partial<Record<OmenKind, readonly DungeonObjectKind[]>> = {
	unstable: ["trap", "trap", "trap"],
	hallowed: ["shrine", "fountain"],
	"forge-fire": ["forge"],
	"fortunes-floor": ["well"],
	"time-worn": ["hourglass"],
	"forgotten-library": ["archive"],
};
type Placed = Readonly<{
	monsters: readonly Monster[];
	objects: readonly DungeonObject[];
	floorItems: readonly FloorItem[];
}>;
// Each omen's gathering, features and finds land on free room tiles reachable from the
// floor's arrival, on the omen's own stream; quiet floors first lose half their creatures.
export const applyOmenGatherings = (
	run: DungeonRun,
	omens: readonly FloorOmen[],
	placed: Placed,
	difficulty: Difficulty,
): Placed => {
	let monsters = [...placed.monsters];
	const objects = [...placed.objects];
	const floorItems = [...placed.floorItems];
	for (const { floorNumber, kind } of omens) {
		const floor = run.floors[floorNumber - 1];
		const origin = floor.upStair?.coordinate;
		if (!origin) continue;
		const random = createSeededRandom(
			hashStringToUint32(`${run.seed}:${floorNumber}:omen:${kind}`),
		);
		if (kind === "quiet") {
			let ordinary = 0;
			monsters = monsters.filter(
				(m) =>
					m.floorNumber !== floorNumber ||
					Number(m.id.split(":")[1]) >= 1000000 ||
					ordinary++ % 2 === 0,
			);
		}
		const gates = objects.filter((o) => o.kind === "elite-door");
		const taken = new Set(
			[
				...protectedFloorLocations(run, floorNumber),
				...[...monsters, ...objects, ...floorItems]
					.filter((entry) => entry.floorNumber === floorNumber)
					.map((entry) => entry.coordinate),
			].map(coordinateKey),
		);
		const free = reachableRoomTiles(run, floorNumber, origin, gates).filter(
			(tile) => !taken.has(coordinateKey(tile)),
		);
		const take = (): Coordinate | undefined => {
			if (!free.length) return undefined;
			const [tile] = free.splice(Math.floor(random() * free.length), 1);
			return tile;
		};
		(GATHERINGS[kind] ?? []).forEach((monster, index) => {
			const coordinate = take();
			if (coordinate)
				monsters.push({
					id: `${floorNumber}:${OMEN_SPAWN_ID + index}`,
					kind: monster,
					floorNumber,
					coordinate,
					health: maximumMonsterHealth(monster, difficulty, floorNumber),
					intent: { type: "idle" },
					lastDamagedTurn: null,
				});
		});
		const thieves = kind === "thieves-den" ? 2 : kind === "gilded" ? 1 : 0;
		for (let index = 0; index < thieves; index++) {
			const id = `${floorNumber}:${EXTRA_THIEF_IDS[index]}`;
			const coordinate = take();
			if (coordinate && !monsters.some((m) => m.id === id))
				monsters.push({
					id,
					kind: "treasure-thief",
					floorNumber,
					coordinate,
					health: maximumMonsterHealth("treasure-thief", difficulty),
					intent: { type: "idle" },
					lastDamagedTurn: null,
				});
		}
		const features = [
			...(FEATURES[kind] ?? []),
			// Gilded doubles the gold already lying here.
			...(kind === "gilded"
				? objects
						.filter((o) => o.floorNumber === floorNumber && o.kind === "gold")
						.map(() => "gold" as const)
				: []),
		];
		features.forEach((feature, index) => {
			const coordinate = take();
			if (coordinate)
				objects.push({
					id: `floor:${floorNumber}:object:${feature}:omen-${index + 1}`,
					kind: feature,
					floorNumber,
					coordinate,
					activated: false,
				});
		});
		if (kind === "hoard") {
			// The floor's one chest becomes a mimic, or one appears if it had none.
			const chest = objects.findIndex(
				(o) => o.floorNumber === floorNumber && o.kind === "chest",
			);
			const coordinate = chest >= 0 ? objects[chest].coordinate : take();
			if (chest >= 0) objects.splice(chest, 1);
			if (coordinate)
				objects.push({
					id: `floor:${floorNumber}:object:chest:mimic`,
					kind: "chest",
					floorNumber,
					coordinate,
					activated: false,
				});
		}
		(FINDS[kind] ?? []).forEach((find, index) => {
			const coordinate = take();
			const item =
				find === "loot"
					? (selectLootKind(floorNumber, "found", random) ?? "healing-potion")
					: find;
			if (coordinate)
				floorItems.push({
					item: { id: `floor:${floorNumber}:omen:${index + 1}`, kind: item },
					floorNumber,
					coordinate,
				});
		});
	}
	return { monsters, objects, floorItems };
};

// A merchant's rest keeps the merchant's room clear of creatures.
export const clearMerchantRooms = (
	run: DungeonRun,
	placed: Placed,
	floors: readonly number[],
): Placed => {
	const rooms = placed.objects.flatMap((object) => {
		if (object.kind !== "merchant" || !floors.includes(object.floorNumber))
			return [];
		const room = run.floors[object.floorNumber - 1].rooms.find(
			(r) =>
				object.coordinate.row >= r.startRow &&
				object.coordinate.row <= r.endRow &&
				object.coordinate.col >= r.startCol &&
				object.coordinate.col <= r.endCol,
		);
		return room ? [{ floorNumber: object.floorNumber, room }] : [];
	});
	return {
		...placed,
		monsters: placed.monsters.filter(
			(monster) =>
				monster.kind === "ember-warden" ||
				!rooms.some(
					({ floorNumber, room }) =>
						monster.floorNumber === floorNumber &&
						monster.coordinate.row >= room.startRow &&
						monster.coordinate.row <= room.endRow &&
						monster.coordinate.col >= room.startCol &&
						monster.coordinate.col <= room.endCol,
				),
		),
	};
};

const omenHere = (
	state: { omens?: readonly FloorOmen[]; run: { activeFloor: number } },
	kind: OmenKind,
) => omenAt(state, state.run.activeFloor) === kind;

// Dark halves your sight on its floor.
export const omenSightRadius = (
	state: { omens?: readonly FloorOmen[]; run: { activeFloor: number } },
	radius: number,
) => (omenHere(state, "dark") ? Math.max(1, Math.ceil(radius / 2)) : radius);
// Ember-lit floors are revealed and make creatures notice you from 2 tiles farther.
export const EMBER_LIT_DETECTION = 2;
export const omenRevealsFloor = (
	state: { omens?: readonly FloorOmen[] },
	floorNumber: number,
) => omenAt(state, floorNumber) === "ember-lit";
export const omenDetectionBonus = (state: {
	omens?: readonly FloorOmen[];
	run?: { activeFloor: number };
}) =>
	state.run && omenAt(state, state.run.activeFloor) === "ember-lit"
		? EMBER_LIT_DETECTION
		: 0;

// Unstable floors double trap-disarm XP; Bloodied floors give half again the XP per kill
// while their creatures hit a quarter harder.
export const omenDisarmExperience = (
	state: { omens?: readonly FloorOmen[]; run: { activeFloor: number } },
	experience: number,
) => (omenHere(state, "unstable") ? experience * 2 : experience);
export const omenKillExperience = (
	state: { omens?: readonly FloorOmen[] },
	floorNumber: number,
	experience: number,
) =>
	omenAt(state, floorNumber) === "bloodied"
		? Math.ceil(experience * 1.5)
		: experience;
const UNDEAD: readonly MonsterKind[] = [
	"skeleton",
	"zombie",
	"wraith",
	"soul-wraith",
];
// Melee damage that reaches you after armor: Bloodied adds a quarter, Hallowed takes 1
// from the dead, never below 1.
export const omenMeleeDamage = (
	state: { omens?: readonly FloorOmen[]; run: { activeFloor: number } },
	monster: Pick<Monster, "kind">,
	damage: number,
) => {
	if (omenHere(state, "bloodied")) return Math.ceil(damage * 1.25);
	if (omenHere(state, "hallowed") && UNDEAD.includes(monster.kind))
		return Math.max(1, damage - 1);
	return damage;
};
// Time-worn creatures recover 1 health each phase they are left alone.
export const omenRegeneration = (
	state: { omens?: readonly FloorOmen[] },
	monster: Pick<Monster, "floorNumber">,
) => (omenAt(state, monster.floorNumber) === "time-worn" ? 1 : 0);
// Arcane surge: spells hit 30% harder on its floor, yours and theirs.
export const ARCANE_SURGE = 1.3;
export const omenSpellDamage = (
	state: { omens?: readonly FloorOmen[]; run: { activeFloor: number } },
	damage: number,
) =>
	omenHere(state, "arcane-surge") ? Math.round(damage * ARCANE_SURGE) : damage;
// Echoing halls: every blow you land calls creatures within 8 tiles to your position.
export const ECHO_RADIUS = 8;
export const echoBlow = <
	S extends {
		omens?: readonly FloorOmen[];
		run: { activeFloor: number; playerCoordinate: Coordinate };
		monsters: readonly Monster[];
	},
>(
	state: S,
	memoryPhases: number,
): S => {
	if (!omenHere(state, "echoing-halls")) return state;
	const target = state.run.playerCoordinate;
	return {
		...state,
		monsters: state.monsters.map((monster) =>
			monster.floorNumber === state.run.activeFloor &&
			monster.health > 0 &&
			Math.hypot(
				monster.coordinate.row - target.row,
				monster.coordinate.col - target.col,
			) <= ECHO_RADIUS
				? {
						...monster,
						awareness: {
							type: "pursuing" as const,
							target: { ...target },
							remaining: memoryPhases,
							blocked: 0,
						},
					}
				: monster,
		),
	};
};
// Fortune's floor favors well offerings: more rewards and fewer creatures.
export const WELL_FAVOR = { positive: 0.15, negative: -0.1 } as const;
export const omenFavorsWell = (
	state: { omens?: readonly FloorOmen[] },
	floorNumber: number,
) => omenAt(state, floorNumber) === "fortunes-floor";
