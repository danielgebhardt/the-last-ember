import { orthogonalDistance } from "../monsters/MonsterLocations";
import { foresees } from "../objects/SeersSight";
import { appendActivityEvents } from "./ActivityHistory";
import type { GameState } from "./GameState";
import { omenAt } from "./Omens";

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
		...after,
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
