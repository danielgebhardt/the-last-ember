import {
	MOVEMENT_OFFSETS,
	type MovementDirection,
	moveDungeonRun,
} from "../dungeon/DungeonRun";
import type { Coordinate } from "../dungeon/DungeonTypes";
import { appendActivityEvents } from "../game/ActivityHistory";
import type { GameState } from "../game/GameState";
import { maximumMana } from "../game/Mana";
import { orthogonalDistance } from "../monsters/MonsterLocations";
import type { DungeonObject } from "../objects/DungeonObject";
import { navigationRun } from "../objects/NavigationTerrain";
import type { ObjectChoice } from "../objects/ObjectInteraction";
import {
	arenaCleared,
	arenaDoorId,
	arenaOn,
	minibossId,
	standingArena,
} from "./Arena";

export const SEALED_STAIR_REFUSAL =
	"The way back is sealed until the arena is won.";
export const GATE_REFUSAL = "The arena gate bars the stair. Press E beside it.";
export const EXIT_REFUSAL =
	"The exit stays sealed while anything in the hall stands.";
export const ARENA_SCROLL_REFUSAL = "No scroll carries you out of the arena.";

const same = (a: Coordinate, b: Coordinate) =>
	a.row === b.row && a.col === b.col;

// Why a step is refused: a gate or sealed exit in the way, or the way back up from an
// arena still standing.
export const arenaMoveRefusal = (
	state: GameState,
	destination: Coordinate,
): string | undefined => {
	const floor = state.run.activeFloor;
	const barrier = state.objects.find(
		(o) =>
			o.floorNumber === floor &&
			!o.activated &&
			(o.kind === "arena-gate" || o.kind === "arena-door") &&
			same(o.coordinate, destination),
	);
	if (barrier)
		return barrier.kind === "arena-gate" ? GATE_REFUSAL : EXIT_REFUSAL;
	const arena = arenaOn(state, floor);
	const upStair = state.run.floors[floor - 1]?.upStair?.coordinate;
	return arena &&
		!arenaCleared(state, arena) &&
		upStair &&
		same(upStair, destination)
		? SEALED_STAIR_REFUSAL
		: undefined;
};

// A standing arena keeps everything below it out of reach.
export const deepestReachableFloor = (
	state: Pick<GameState, "arenas" | "objects" | "run">,
): number => standingArena(state)?.floorNumber ?? state.run.floors.length;

export const inStandingArena = (
	state: Pick<GameState, "arenas" | "objects" | "run">,
): boolean => {
	const arena = arenaOn(state, state.run.activeFloor);
	return !!arena && !arenaCleared(state, arena);
};

// Confirming at the gate opens it and takes the stair down in the same step.
export const enterArena = (
	state: GameState,
	gate: DungeonObject,
	choice: ObjectChoice | undefined,
): GameState | { error: string } => {
	if (choice !== "enter-arena")
		return { error: "Review the arena gate first." };
	const player = state.run.playerCoordinate;
	const direction = (
		Object.entries(MOVEMENT_OFFSETS) as [MovementDirection, Coordinate][]
	).find(([, offset]) =>
		same(
			{ row: player.row + offset.row, col: player.col + offset.col },
			gate.coordinate,
		),
	)?.[0];
	if (!direction || orthogonalDistance(player, gate.coordinate) !== 1)
		return { error: "Stand beside the arena gate to enter." };
	const objects = state.objects.map((o) =>
		o.id === gate.id ? { ...o, activated: true } : o,
	);
	const moved = moveDungeonRun(navigationRun({ ...state, objects }), direction);
	const arena = arenaOn(state, moved.activeFloor);
	if (!arena || moved.activeFloor === state.run.activeFloor)
		return { error: "The arena gate will not open." };
	return {
		...state,
		objects,
		run: {
			...state.run,
			activeFloor: moved.activeFloor,
			playerCoordinate: moved.playerCoordinate,
		},
		activityHistory: appendActivityEvents(state.activityHistory, [
			{
				type: "floor-changed",
				fromFloor: state.run.activeFloor,
				toFloor: moved.activeFloor,
				turn: state.turn,
			},
			{ type: "arena-entered", miniboss: arena.miniboss, turn: state.turn },
		]),
	};
};

// When nothing in the arena you stand in is left alive, its exit opens and you are
// restored.
export const resolveArenas = (state: GameState): GameState => {
	if (state.player.health <= 0) return state;
	let next = state;
	for (const arena of state.arenas ?? []) {
		// Won only while you stand in it.
		if (arenaCleared(next, arena) || next.run.activeFloor !== arena.floorNumber)
			continue;
		const standing = next.monsters.some(
			(m) => m.floorNumber === arena.floorNumber && m.health > 0,
		);
		if (standing) continue;
		const maxMana = maximumMana(
			next.progression,
			next.equipment,
			next.effects,
			next.afflictions,
		);
		next = {
			...next,
			objects: next.objects.map((o) =>
				o.id === arenaDoorId(arena.floorNumber) ? { ...o, activated: true } : o,
			),
			player: { ...next.player, health: next.player.maxHealth },
			mana: maxMana,
			activityHistory: appendActivityEvents(next.activityHistory, [
				{
					type: "arena-cleared",
					miniboss: arena.miniboss,
					turn: next.turn,
				},
			]),
		};
	}
	return next;
};

export const isMinibossOf = (
	state: Pick<GameState, "arenas">,
	monster: { id: string; floorNumber: number },
) =>
	!!arenaOn(state, monster.floorNumber) &&
	monster.id === minibossId(monster.floorNumber);
