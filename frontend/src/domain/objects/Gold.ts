import { hashStringToUint32 } from "../dungeon/DungeonRun";
import { createSeededRandom } from "../dungeon/Seed";
import { appendActivityEvents } from "../game/ActivityHistory";
import { recordGoldIn } from "../game/EconomyTelemetry";
import type { GameState } from "../game/GameState";
import { scavengedGold } from "../game/PerkEffects";
export const goldAmount = (
	seed: number,
	floor: number,
	identity: string,
): number => {
	const random = createSeededRandom(
		hashStringToUint32(`${seed}:${floor}:gold:${identity}:amount`),
	);
	return floor * 2 + 2 + Math.floor(random() * (floor + 5));
};
export const collectGoldAtPlayer = (state: GameState): GameState => {
	const finds = state.objects.filter(
		(object) =>
			object.kind === "gold" &&
			!object.activated &&
			object.floorNumber === state.run.activeFloor &&
			object.coordinate.row === state.run.playerCoordinate.row &&
			object.coordinate.col === state.run.playerCoordinate.col,
	);
	if (!finds.length) return state;
	const amount = finds.reduce(
		(total, object) =>
			total +
			scavengedGold(
				state.progression,
				goldAmount(state.run.seed, object.floorNumber, object.id),
			),
		0,
	);
	return {
		...recordGoldIn(state, amount, "floor-gold"),
		gold: state.gold + amount,
		objects: state.objects.map((object) =>
			finds.includes(object) ? { ...object, activated: true } : object,
		),
		activityHistory: appendActivityEvents(state.activityHistory, [
			{ type: "gold-collected", amount, turn: state.turn },
		]),
	};
};
