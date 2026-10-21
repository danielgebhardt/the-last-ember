import { hashStringToUint32 } from "../dungeon/DungeonRun";
import type { Coordinate } from "../dungeon/DungeonTypes";
import { createSeededRandom } from "../dungeon/Seed";
import { appendActivityEvents } from "../game/ActivityHistory";
import type { GameState } from "../game/GameState";
import { sarcophagusSpawn } from "./AncientSarcophagi";
import type { DungeonObject } from "./DungeonObject";
import { spendObject } from "./ObjectEffects";
import type { ObjectChoice } from "./ObjectInteraction";

// The portal leads beside a down stair on its own floor or up to this many floors deeper.
export const PORTAL_FLOOR_SPAN = 4;
export type PortalDestination = Readonly<{
	floorNumber: number;
	coordinate: Coordinate;
}>;

// Floors whose down stair the portal can lead to, in order. The final floor has none.
// Saved floors share these fields, so save validation can call the same rule.
type PortalFloors = Readonly<{
	floors: readonly Readonly<{ floorNumber: number; downStair?: unknown }>[];
}>;
export const portalFloors = (
	run: PortalFloors,
	portal: Pick<DungeonObject, "floorNumber">,
): number[] =>
	run.floors
		.filter(
			(f) =>
				f.floorNumber >= portal.floorNumber &&
				f.floorNumber <= portal.floorNumber + PORTAL_FLOOR_SPAN &&
				f.downStair !== undefined,
		)
		.map((f) => f.floorNumber);

// Equal odds per eligible floor, fixed per portal, so inspecting, canceling or reloading
// cannot change it.
export const portalDestinationFloor = (
	run: PortalFloors & Readonly<{ seed: number }>,
	portal: Pick<DungeonObject, "id" | "floorNumber">,
): number | undefined => {
	const floors = portalFloors(run, portal);
	if (!floors.length) return undefined;
	const roll = createSeededRandom(
		hashStringToUint32(`${run.seed}:${portal.id}:portal:destination`),
	)();
	return floors[Math.floor(roll * floors.length)];
};

// The nearest free room tile to that floor's down stair; never the stair itself.
export const portalLanding = (
	state: GameState,
	portal: DungeonObject,
): PortalDestination | undefined => {
	const floorNumber = portalDestinationFloor(state.run, portal);
	const stair =
		floorNumber === undefined
			? undefined
			: state.run.floors[floorNumber - 1].downStair;
	if (floorNumber === undefined || !stair) return undefined;
	// The player's own tile only blocks a landing on the floor they stand on.
	const elsewhere =
		floorNumber === state.run.activeFloor
			? state
			: {
					...state,
					run: { ...state.run, playerCoordinate: { row: -1, col: -1 } },
				};
	const coordinate = sarcophagusSpawn(elsewhere, {
		floorNumber,
		coordinate: stair.coordinate,
	});
	return coordinate ? { floorNumber, coordinate } : undefined;
};

export const PORTAL_EMBER_RESTRICTION =
	"The portal will not take you while you carry the Last Ember. Walk it home.";

export const stepThroughPortal = (
	state: GameState,
	object: DungeonObject,
	choice?: ObjectChoice,
): GameState | { error: string } => {
	if (object.activated) return { error: "The portal has gone dark." };
	if (choice !== "portal-enter")
		return { error: "Review the portal before stepping through." };
	if (state.quest.cureRecovered) return { error: PORTAL_EMBER_RESTRICTION };
	const landing = portalLanding(state, object);
	if (!landing)
		return {
			error: "The portal flickers but finds nowhere to set you down.",
		};
	const spent = spendObject(state, object);
	const fromFloor = state.run.activeFloor;
	return {
		...spent,
		objects: spent.objects.map((o) =>
			o.id === object.id
				? {
						...o,
						portalDestination: {
							floorNumber: landing.floorNumber,
							coordinate: { ...landing.coordinate },
						},
					}
				: o,
		),
		run: {
			...spent.run,
			activeFloor: landing.floorNumber,
			playerCoordinate: { ...landing.coordinate },
		},
		activityHistory: appendActivityEvents(spent.activityHistory, [
			{
				type: "portal-used",
				fromFloor,
				toFloor: landing.floorNumber,
				turn: state.turn,
			},
			...(landing.floorNumber !== fromFloor
				? [
						{
							type: "floor-changed" as const,
							fromFloor,
							toFloor: landing.floorNumber,
							turn: state.turn,
						},
					]
				: []),
		]),
	};
};
