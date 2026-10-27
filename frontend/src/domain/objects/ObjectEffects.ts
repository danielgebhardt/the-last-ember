import {
	type ActivityEvent,
	appendActivityEvents,
} from "../game/ActivityHistory";
import { damageEventSource, recordDamageTaken } from "../game/CombatTelemetry";
import type { GameState } from "../game/GameState";
import type { DungeonObject } from "./DungeonObject";
export const spendObject = (
	state: GameState,
	object: DungeonObject,
): GameState => ({
	...state,
	objects: state.objects.map((entry) =>
		entry.id === object.id ? { ...entry, activated: true } : entry,
	),
});
export const objectDamage = (
	state: GameState,
	damage: number,
	event: ActivityEvent,
): GameState => {
	const health = Math.max(0, state.player.health - damage);
	const measured = recordDamageTaken(
		state,
		damage,
		damageEventSource(event) ?? { source: "object" },
	);
	return {
		...measured,
		player: { ...state.player, health },
		activityHistory: appendActivityEvents(state.activityHistory, [
			event,
			...(health === 0
				? [{ type: "player-died" as const, turn: state.turn }]
				: []),
		]),
	};
};
