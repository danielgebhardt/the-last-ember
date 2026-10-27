import { orthogonalDistance } from "../monsters/MonsterLocations";
import { foresees } from "../objects/SeersSight";
import { appendActivityEvents } from "./ActivityHistory";
import { recordOmen } from "./CombatTelemetry";
import type { GameState } from "./GameState";
import { type OmenKind, omenAt } from "./Omens";

const besideDownStair = (state: GameState) => {
	const stair = state.run.floors[state.run.activeFloor - 1]?.downStair;
	return (
		!!stair &&
		orthogonalDistance(stair.coordinate, state.run.playerCoordinate) === 1
	);
};

// Arriving on a floor names its omen. Wearing the Seer's Circlet, stepping beside a down
// stair names the next floor's omen, or that it has none.
export const announceOmens = (
	before: GameState,
	after: GameState,
): GameState => {
	if (after.town || after.player.health <= 0) return after;
	const arrived = after.run.activeFloor !== before.run.activeFloor;
	const here = arrived ? omenAt(after, after.run.activeFloor) : undefined;
	const stair = after.run.floors[after.run.activeFloor - 1]?.downStair;
	const seen =
		stair &&
		foresees(after.equipment) &&
		besideDownStair(after) &&
		(arrived || !besideDownStair(before));
	if (!here && !seen) return after;
	const next = stair ? omenAt(after, stair.destinationFloor) : undefined;
	return {
		...(here ? recordOmen(after, here) : after),
		activityHistory: appendActivityEvents(after.activityHistory, [
			...(here
				? [{ type: "omen-revealed" as const, omen: here, turn: after.turn }]
				: []),
			...(seen
				? [
						{
							type: "omen-foreseen" as const,
							...(next ? { omen: next } : {}),
							turn: after.turn,
						},
					]
				: []),
		]),
	};
};

// The omen of a floor reached for the first time by the change from before to after.
// Kinds never repeat within an adventure, so an earlier notice of the same kind means a
// return visit. Presentation only; nothing here is saved.
export const firstOmenArrival = (
	before: GameState,
	after: GameState,
): OmenKind | undefined => {
	const entries = after.activityHistory.entries;
	const arrival = entries.find(
		({ id, event }) =>
			id >= before.activityHistory.nextId && event.type === "omen-revealed",
	);
	if (arrival?.event.type !== "omen-revealed") return undefined;
	const kind = arrival.event.omen;
	return entries.some(
		({ id, event }) =>
			id < arrival.id && event.type === "omen-revealed" && event.omen === kind,
	)
		? undefined
		: kind;
};
