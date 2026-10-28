import {
	ARENA_REWARD_KINDS,
	ARENA_REWARD_TILES,
	ARENA_SPAWN_ID_BASE,
	arenaDoorId,
	arenaEntryId,
	arenaFloorFor,
	arenaGateId,
	arenaGoldId,
	arenaRackId,
	arenaRewardId,
	EGG_SAC_TILES,
	eggSacId,
	isArenaSpawnId,
	isArenaTerrain,
	isMinibossKind,
	MINIBOSS_SUMMON_IDS,
	type MinibossKind,
	minibossId,
	PHYLACTERY_TILE,
	phylacteryId,
	selectMiniboss,
} from "../arena/Arena";
import { ARENA_POINTS } from "../arena/ArenaLayout";
import { ownedItems } from "../items/OwnedItems";
import { sameCoordinate } from "./SaveConsistencyHelpers";
import type { SaveDocument } from "./SaveDocument";

const ARENA_OBJECTS = {
	door: ARENA_POINTS.entryDoor,
	"arena-door": ARENA_POINTS.exitDoor,
	"arena-reward": ARENA_REWARD_TILES.rack,
	gold: ARENA_REWARD_TILES.gold,
} as const;

// What a miniboss's hall holds besides the arena itself, each on its fixed tile.
const hallFeatures = (floorNumber: number, miniboss: MinibossKind) =>
	miniboss === "broodmother"
		? EGG_SAC_TILES.map((tile, index) => ({
				id: eggSacId(floorNumber, index),
				kind: "egg-sac",
				tile,
			}))
		: miniboss === "bone-lich"
			? [
					{
						id: phylacteryId(floorNumber),
						kind: "phylactery",
						tile: PHYLACTERY_TILE,
					},
				]
			: [];
// The creatures a miniboss calls over the fight, numbered by its summons count.
const ARENA_SPAWN_KINDS: Partial<Record<MinibossKind, readonly string[]>> = {
	broodmother: ["spiderling"],
	"bone-lich": ["skeleton", "zombie"],
};
const HALL_FEATURE_KINDS = ["egg-sac", "phylactery"];

// An arena stands where this seed and depth put it, with its fixed floor, objects and
// miniboss; nothing on it but what the arena brought, and its exit open only once the
// hall is clear. Adventures shorter than ten floors have none.
export const hasConsistentArenas = ({ state }: SaveDocument): boolean => {
	const { run } = state;
	const arenas = state.arenas ?? [];
	const arenaObjects = state.objects.filter(
		(o) => o.kind === "arena-gate" || o.kind === "arena-door",
	);
	if (!arenas.length)
		return (
			!arenaObjects.length &&
			!state.objects.some((o) => HALL_FEATURE_KINDS.includes(o.kind)) &&
			!state.monsters.some(
				(m) => isMinibossKind(m.kind) || m.kind === "spiderling",
			) &&
			!ownedItems(state).some((i) => i.id.startsWith("arena-reward:"))
		);
	const [arena] = arenas;
	const { floorNumber } = arena;
	const floor = run.floors[floorNumber - 1];
	if (
		arenas.length !== 1 ||
		floorNumber !== arenaFloorFor(run.floors.length) ||
		arena.miniboss !== selectMiniboss(run.seed) ||
		!floor ||
		!isArenaTerrain(floor.terrain)
	)
		return false;
	// The gate, both doors and the gold, each where the arena put it.
	const features = hallFeatures(floorNumber, arena.miniboss);
	const gate = state.objects.find((o) => o.id === arenaGateId(floorNumber));
	const exit = state.objects.find((o) => o.id === arenaDoorId(floorNumber));
	if (
		arenaObjects.some(
			(o) =>
				o.id !== arenaGateId(floorNumber) && o.id !== arenaDoorId(floorNumber),
		) ||
		state.objects.some(
			(o) =>
				o.floorNumber === floorNumber &&
				!(
					(o.id === arenaEntryId(floorNumber) ||
						o.id === arenaDoorId(floorNumber) ||
						o.id === arenaRackId(floorNumber) ||
						o.id === arenaGoldId(floorNumber)) &&
					sameCoordinate(
						o.coordinate,
						ARENA_OBJECTS[o.kind as keyof typeof ARENA_OBJECTS],
					)
				) &&
				!features.some((f) => f.id === o.id),
		) ||
		// Like the arena's own objects, each hall feature stands as its kind on its tile;
		// a phylactery's landed blows stay only while it stands.
		state.objects.some((o) =>
			features.some(
				(f) =>
					f.id === o.id &&
					(o.kind !== f.kind ||
						o.floorNumber !== floorNumber ||
						!sameCoordinate(o.coordinate, f.tile)),
			),
		) ||
		state.objects.some(
			(o) =>
				(HALL_FEATURE_KINDS.includes(o.kind) &&
					!features.some((f) => f.id === o.id)) ||
				(o.blows !== undefined && (o.kind !== "phylactery" || o.activated)),
		) ||
		(exit?.activated && gate && !gate.activated) ||
		(exit?.activated &&
			state.monsters.some((m) => m.floorNumber === floorNumber && m.health > 0))
	)
		return false;
	// The miniboss owns its reserved identity; only its second phase calls salamanders,
	// and only the Broodmother and the Bone Lich call more, each numbered by their count.
	const boss = state.monsters.find((m) => m.id === minibossId(floorNumber));
	const spawnKinds = ARENA_SPAWN_KINDS[arena.miniboss];
	const called = (m: (typeof state.monsters)[number]) =>
		m.floorNumber === floorNumber &&
		!!spawnKinds?.includes(m.kind) &&
		m.summonedBy === minibossId(floorNumber) &&
		(!boss ||
			Number(m.id.split(":")[1]) - ARENA_SPAWN_ID_BASE <=
				(boss.summons?.count ?? 0));
	if (
		state.monsters.some(
			(m) =>
				(m.kind === "spiderling" && !isArenaSpawnId(m.id)) ||
				(isArenaSpawnId(m.id) && !called(m)),
		) ||
		(boss?.summons && !spawnKinds)
	)
		return false;
	if (
		!state.monsters.every(
			(m) =>
				isMinibossKind(m.kind) === (m.id === minibossId(floorNumber)) &&
				(m.kind !== arena.miniboss || m.floorNumber === floorNumber) &&
				(!isMinibossKind(m.kind) || m.kind === arena.miniboss) &&
				(m.minibossPhase === undefined || isMinibossKind(m.kind)) &&
				(!MINIBOSS_SUMMON_IDS.some((id) => m.id.endsWith(`:${id}`)) ||
					(m.floorNumber === floorNumber &&
						m.kind === "salamander" &&
						arena.miniboss === "pyre-lord" &&
						(!boss || boss.minibossPhase === 2))),
		)
	)
		return false;
	// At most the one piece taken from the rack, and only once the hall was won.
	const rack = state.objects.find((o) => o.id === arenaRackId(floorNumber));
	const rewards = ownedItems(state).filter((i) =>
		i.id.startsWith("arena-reward:"),
	);
	return (
		rewards.length <= 1 &&
		rewards.every(
			(i) =>
				i.id === arenaRewardId(floorNumber) &&
				(ARENA_REWARD_KINDS as readonly string[]).includes(i.kind) &&
				rack?.activated === true,
		) &&
		(!rack?.activated || exit?.activated === true)
	);
};
