import type { Coordinate } from "../dungeon/DungeonTypes";
import { FLOOR } from "../dungeon/Tiles";
import { appendActivityEvents } from "../game/ActivityHistory";
import type { GameState } from "../game/GameState";
import { navigationRun } from "../objects/NavigationTerrain";
import { TOWN } from "./TownDefinition";

export type TownPortal = { floorNumber: number; coordinate: Coordinate };
export type ReturnTownPortalAction = { type: "return-town-portal" };
export const DORMANT_PORTAL_MESSAGE =
	"The portal circle is dormant. Read a town portal scroll in the dungeon to awaken it.";
export const atTownPortal = (state: GameState): boolean =>
	!!state.town && same(state.town.coordinate, TOWN.portal);
const same = (a: Coordinate, b: Coordinate) =>
	a.row === b.row && a.col === b.col;
export const townPortalMessage = (portal: TownPortal | null): string =>
	portal
		? `Town portal to floor ${portal.floorNumber}. Stand on the circle and press Enter to return. The portal closes after use.`
		: DORMANT_PORTAL_MESSAGE;

// Bound fallback to three walkable steps, in stable north/east/south/west order.
export const portalReturnArrival = (
	state: GameState,
): Coordinate | undefined => {
	const anchor = state.townPortal;
	if (!anchor) return;
	const floor = navigationRun(state).floors[anchor.floorNumber - 1];
	if (!floor) return;
	const safe = (point: Coordinate) => {
		if (
			floor.terrain[point.row]?.[point.col] !== FLOOR ||
			state.monsters.some(
				(actor) =>
					actor.floorNumber === anchor.floorNumber &&
					actor.health > 0 &&
					same(actor.coordinate, point),
			)
		)
			return false;
		// Exact return can safely share stairs/loot or harmless fixtures: no move/arrival action runs.
		if (same(point, anchor.coordinate))
			return !state.objects.some(
				(object) =>
					object.floorNumber === anchor.floorNumber &&
					same(object.coordinate, point) &&
					object.kind === "trap" &&
					!object.activated,
			);
		return (
			![floor.upStair?.coordinate, floor.downStair?.coordinate].some(
				(stair) => stair && same(stair, point),
			) &&
			!state.objects.some(
				(object) =>
					object.floorNumber === anchor.floorNumber &&
					same(object.coordinate, point),
			) &&
			!state.floorItems.some(
				(item) =>
					item.floorNumber === anchor.floorNumber &&
					same(item.coordinate, point),
			)
		);
	};
	const queue = [{ point: anchor.coordinate, steps: 0 }];
	const visited = new Set([
		`${anchor.coordinate.row},${anchor.coordinate.col}`,
	]);
	for (let index = 0; index < queue.length; index++) {
		const { point, steps } = queue[index];
		if (safe(point)) return { ...point };
		if (steps >= 3) continue;
		for (const [row, col] of [
			[-1, 0],
			[0, 1],
			[1, 0],
			[0, -1],
		]) {
			const next = { row: point.row + row, col: point.col + col };
			const key = `${next.row},${next.col}`;
			if (!visited.has(key) && floor.terrain[next.row]?.[next.col] === FLOOR) {
				visited.add(key);
				queue.push({ point: next, steps: steps + 1 });
			}
		}
	}
};
export const returnThroughTownPortal = (state: GameState) => {
	const reject = (error: string) => ({
		state,
		turnAdvanced: false as const,
		error,
	});
	if (!atTownPortal(state))
		return reject("Stand on the town portal circle and press Enter to return.");
	if (!state.townPortal) return reject(DORMANT_PORTAL_MESSAGE);
	if (
		state.player.health <= 0 ||
		state.quest.victory ||
		state.quest.cureRecovered ||
		state.bag.items.some((item) => item.kind === "cure")
	)
		return reject("The portal cannot bypass the Warden's Flame's homecoming.");
	const arrival = portalReturnArrival(state);
	if (!arrival)
		return reject(
			"No safe return tile is available near your portal. It remains open; you can also leave by the south gate.",
		);
	return {
		state: {
			...state,
			town: null,
			townPortal: null,
			run: {
				...state.run,
				activeFloor: state.townPortal.floorNumber,
				playerCoordinate: arrival,
			},
			activityHistory: appendActivityEvents(state.activityHistory, [
				{
					type: "town-portal-returned",
					toFloor: state.townPortal.floorNumber,
					turn: state.turn,
				},
			]),
		},
		turnAdvanced: false as const,
	};
};
