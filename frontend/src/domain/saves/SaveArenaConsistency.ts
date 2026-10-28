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
	minibossId,
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

const isEggSac = (
	object: {
		id: string;
		kind: string;
		coordinate: { row: number; col: number };
	},
	floorNumber: number,
	miniboss: string,
) =>
	miniboss === "broodmother" &&
	object.kind === "egg-sac" &&
	EGG_SAC_TILES.some(
		(tile, index) =>
			object.id === eggSacId(floorNumber, index) &&
			sameCoordinate(object.coordinate, tile),
	);

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
			!state.objects.some((o) => o.kind === "egg-sac") &&
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
				!isEggSac(o, floorNumber, arena.miniboss),
		) ||
		// The Broodmother's hall keeps all four of its sacs, broken or not.
		(arena.miniboss === "broodmother" &&
			!EGG_SAC_TILES.every((_, index) =>
				state.objects.some((o) => o.id === eggSacId(floorNumber, index)),
			)) ||
		state.objects.some(
			(o) => o.kind === "egg-sac" && !isEggSac(o, floorNumber, arena.miniboss),
		) ||
		(exit?.activated && gate && !gate.activated) ||
		(exit?.activated &&
			state.monsters.some((m) => m.floorNumber === floorNumber && m.health > 0))
	)
		return false;
	// The miniboss owns its reserved identity; only its second phase calls salamanders,
	// and only the Broodmother's sacs hatch spiderlings, each numbered by her count.
	const boss = state.monsters.find((m) => m.id === minibossId(floorNumber));
	const hatchling = (m: (typeof state.monsters)[number]) =>
		m.floorNumber === floorNumber &&
		arena.miniboss === "broodmother" &&
		isArenaSpawnId(m.id) &&
		m.summonedBy === minibossId(floorNumber) &&
		(!boss ||
			Number(m.id.split(":")[1]) - ARENA_SPAWN_ID_BASE <=
				(boss.summons?.count ?? 0));
	if (
		state.monsters.some(
			(m) =>
				(m.kind === "spiderling") !== isArenaSpawnId(m.id) ||
				(m.kind === "spiderling" && !hatchling(m)),
		) ||
		(boss?.summons && arena.miniboss !== "broodmother")
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
