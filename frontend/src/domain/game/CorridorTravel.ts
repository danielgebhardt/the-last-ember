import {
	MOVEMENT_OFFSETS,
	type MovementDirection,
} from "../dungeon/DungeonRun";
import type { Coordinate } from "../dungeon/DungeonTypes";
import type { ExplorationState } from "../dungeon/Exploration";
import { FLOOR, WALL } from "../dungeon/Tiles";
import { navigationRun } from "../objects/NavigationTerrain";
import type { GameState } from "./GameState";

export const CORRIDOR_STOP_TEXT = {
	ended: "The adventure has ended.",
	condition: "Resolve your harmful condition before running.",
	damage: "You took damage.",
	threat: "A creature is visible.",
	unexplored: "The route is not fully known.",
	blocked: "The route is blocked or ends here.",
	junction: "A junction needs your choice.",
	room: "A room needs your attention.",
	object: "An object or door needs your attention.",
	loot: "Loot needs your attention.",
	landmark: "Stairs or the entrance need your attention.",
	discovery: "Something new needs your attention.",
	floor: "Your location changed.",
} as const;
export type CorridorStop = keyof typeof CORRIDOR_STOP_TEXT;
export type CorridorView = Readonly<{
	position: Coordinate;
	floorNumber: number;
	turn: number;
	health: number;
	ended: boolean;
	harmful: boolean;
	afflictions: readonly string[];
	damaged: boolean;
	terrain: readonly (readonly (string | undefined)[])[];
	objects: readonly Coordinate[];
	items: readonly Coordinate[];
	landmarks: readonly Coordinate[];
	visiblePoints: readonly Coordinate[];
	threat: boolean;
}>;
const same = (a: Coordinate, b: Coordinate) =>
	a.row === b.row && a.col === b.col;
const contains = (points: readonly Coordinate[], point: Coordinate) =>
	points.some((p) => same(p, point));
const damageTypes = new Set([
	"monster-hit",
	"monster-shot-hit",
	"monster-heavy-hit",
	"monster-charge-hit",
	"monster-spell-hit",
	"monster-area-hit",
	"player-condition-hit",
	"trap-sprung",
	"throne-wound",
	"fountain-poisoned",
	"discovery-opened",
]);

// Project exactly the map's knowledge before asking about a route. No room
// metadata, hidden actors, future rolls or unseen terrain enter the policy.
export const corridorView = (
	state: GameState,
	exploration: ExplorationState,
	fogEnabled: boolean,
): CorridorView => {
	const { run } = state;
	const floor = navigationRun(state).floors[run.activeFloor - 1];
	const visible = (p: Coordinate) =>
		!fogEnabled || !!exploration.visible[p.row]?.[p.col];
	const known = (p: Coordinate) =>
		visible(p) || !!exploration.explored.get(run.activeFloor)?.[p.row]?.[p.col];
	const onFloor = (x: { floorNumber: number }) =>
		x.floorNumber === run.activeFloor;
	const objects = state.objects.filter(
		(x) =>
			onFloor(x) && known(x.coordinate) && !(x.kind === "gold" && x.activated),
	);
	const items = state.floorItems.filter(
		(x) => onFloor(x) && visible(x.coordinate),
	);
	const landmarks = [
		floor.upStair?.coordinate,
		floor.downStair?.coordinate,
		run.activeFloor === 1 ? state.quest.entrance : undefined,
	].filter((p): p is Coordinate => !!p && known(p));
	return {
		position: run.playerCoordinate,
		floorNumber: run.activeFloor,
		turn: state.turn,
		health: state.player.health,
		ended: state.player.health <= 0 || state.quest.victory !== null,
		// Temporary harm blocks running like poison; lingering afflictions stop it only on onset.
		harmful:
			state.effects.some(
				(x) =>
					x.actorId === "player" && x.kind === "poisoned" && x.remaining > 0,
			) || (state.afflictions ?? []).some((a) => a.remaining !== null),
		afflictions: (state.afflictions ?? []).map((a) => a.kind),
		damaged: state.activityHistory.entries.some(
			({ event }) =>
				event.turn === state.turn &&
				damageTypes.has(event.type) &&
				"damage" in event &&
				event.damage > 0,
		),
		terrain: floor.terrain.map((row, r) =>
			row.map((tile, c) => (known({ row: r, col: c }) ? tile : undefined)),
		),
		objects: objects.map((x) => x.coordinate),
		items: items.map((x) => x.coordinate),
		landmarks,
		visiblePoints: [
			...objects.map((x) => x.coordinate).filter(visible),
			...items.map((x) => x.coordinate),
			...landmarks.filter(visible),
		],
		threat: state.monsters.some(
			(x) => onFloor(x) && x.health > 0 && visible(x.coordinate),
		),
	};
};
const neighbors = (point: Coordinate) =>
	Object.entries(MOVEMENT_OFFSETS).map(([direction, offset]) => ({
		direction: direction as MovementDirection,
		coordinate: { row: point.row + offset.row, col: point.col + offset.col },
	}));
const tileAt = (view: CorridorView, p: Coordinate) => {
	// Outside the rectangular map is a known boundary, not unexplored space.
	if (
		p.row < 0 ||
		p.col < 0 ||
		p.row >= view.terrain.length ||
		p.col >= (view.terrain[p.row]?.length ?? 0)
	)
		return WALL;
	return view.terrain[p.row][p.col];
};
const inRoom = (view: CorridorView, p: Coordinate) =>
	tileAt(view, p) === FLOOR &&
	[-1, 1].some((dr) =>
		[-1, 1].some((dc) =>
			[
				{ row: p.row + dr, col: p.col },
				{ row: p.row, col: p.col + dc },
				{ row: p.row + dr, col: p.col + dc },
			].every((q) => tileAt(view, q) === FLOOR),
		),
	);
const pointStop = (
	view: CorridorView,
	p: Coordinate,
	crossingRoom = false,
): CorridorStop | undefined => {
	if (contains(view.objects, p)) return "object";
	if (contains(view.items, p)) return "loot";
	if (contains(view.landmarks, p)) return "landmark";
	const room = inRoom(view, p);
	if (room && !crossingRoom) return "room";
	const adjacent = neighbors(p);
	if (adjacent.some((x) => tileAt(view, x.coordinate) === undefined))
		return "unexplored";
	if (
		!room &&
		adjacent.filter((x) => tileAt(view, x.coordinate) === FLOOR).length > 2
	)
		return "junction";
};
export const corridorStep = (
	view: CorridorView,
	requested: MovementDirection,
	previous?: Coordinate,
): { direction: MovementDirection } | { stop: CorridorStop } => {
	if (view.ended) return { stop: "ended" };
	if (view.harmful) return { stop: "condition" };
	if (view.threat) return { stop: "threat" };
	// In a room, follow the explicitly chosen heading instead of treating every
	// open neighboring tile as a corridor junction. Corridor entry into another
	// room still stops, and all object/knowledge checks apply to both modes.
	const crossingRoom = inRoom(view, view.position);
	const here = pointStop(view, view.position, crossingRoom);
	if (here) return { stop: here };
	let direction = requested;
	if (previous && !crossingRoom) {
		const onward = neighbors(view.position).filter(
			(x) =>
				!same(x.coordinate, previous) && tileAt(view, x.coordinate) === FLOOR,
		);
		if (onward.length !== 1)
			return { stop: onward.length ? "junction" : "blocked" };
		direction = onward[0].direction;
	}
	const offset = MOVEMENT_OFFSETS[direction];
	const next = {
		row: view.position.row + offset.row,
		col: view.position.col + offset.col,
	};
	// A closed door looks like a wall to navigation, but is a visible decision.
	const nextStop = pointStop(view, next, crossingRoom);
	if (nextStop) return { stop: nextStop };
	const tile = tileAt(view, next);
	if (tile === undefined) return { stop: "unexplored" };
	if (tile !== FLOOR) return { stop: "blocked" };
	return { direction };
};
export const corridorStopAfterStep = (
	before: CorridorView,
	after: CorridorView,
): CorridorStop | undefined => {
	if (after.ended) return "ended";
	if (after.floorNumber !== before.floorNumber) return "floor";
	if (
		after.health < before.health ||
		(after.turn > before.turn && after.damaged)
	)
		return "damage";
	if (
		after.harmful ||
		after.afflictions.some((kind) => !before.afflictions.includes(kind))
	)
		return "condition";
	if (after.threat) return "threat";
	if (after.visiblePoints.some((p) => !contains(before.visiblePoints, p)))
		return "discovery";
	if (
		after.terrain.some((row, r) =>
			row.some((tile, c) => {
				const point = { row: r, col: c };
				return (
					tile === FLOOR &&
					before.terrain[r]?.[c] === undefined &&
					(inRoom(after, point) ||
						neighbors(point).filter(
							(next) => tileAt(after, next.coordinate) === FLOOR,
						).length > 2)
				);
			}),
		)
	)
		return "discovery";
};
