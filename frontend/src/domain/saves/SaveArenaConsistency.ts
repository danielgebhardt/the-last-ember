import {
	ARENA_REWARD_KINDS,
	ARENA_REWARD_TILES,
	arenaDoorId,
	arenaEntryId,
	arenaFloorFor,
	arenaGateId,
	arenaGoldId,
	arenaRackId,
	arenaRewardId,
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

// An arena stands where this seed and depth put it, with its fixed floor, objects and
// miniboss; nothing on it but what the arena brought, and its exit open only once the
// hall is clear. Saves from before arenas have none.
export const hasConsistentArenas = ({ state }: SaveDocument): boolean => {
	const { run } = state;
	const arenas = state.arenas ?? [];
	const arenaObjects = state.objects.filter(
		(o) => o.kind === "arena-gate" || o.kind === "arena-door",
	);
	if (!arenas.length)
		return (
			!arenaObjects.length &&
			!state.monsters.some((m) => isMinibossKind(m.kind)) &&
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
				),
		) ||
		(exit?.activated && gate && !gate.activated) ||
		(exit?.activated &&
			state.monsters.some((m) => m.floorNumber === floorNumber && m.health > 0))
	)
		return false;
	// The miniboss owns its reserved identity; only its second phase calls salamanders.
	const boss = state.monsters.find((m) => m.id === minibossId(floorNumber));
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
