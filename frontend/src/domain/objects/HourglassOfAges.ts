import { appendActivityEvents } from "../game/ActivityHistory";
import { recordHealing } from "../game/CombatTelemetry";
import type { GameState } from "../game/GameState";
import { maximumMana } from "../game/Mana";
import { actorMaximumHealth } from "../monsters/MonsterStats";
import type { DungeonObject } from "./DungeonObject";
import { spendObject } from "./ObjectEffects";
import type { ObjectChoice } from "./ObjectInteraction";

type HourglassState = Pick<
	GameState,
	| "player"
	| "mana"
	| "progression"
	| "equipment"
	| "effects"
	| "afflictions"
	| "monsters"
	| "run"
>;
const fullMana = (state: HourglassState) =>
	maximumMana(
		state.progression,
		state.equipment,
		state.effects,
		state.afflictions,
	);
// Living monsters on the hourglass's floor that turning it would empower.
export const hourglassTargets = (
	state: Pick<GameState, "monsters">,
	object: Pick<DungeonObject, "floorNumber">,
) =>
	state.monsters.filter(
		(m) => m.floorNumber === object.floorNumber && m.health > 0 && !m.empowered,
	);
// Why the hourglass is inert, if it is: nothing to recover or nobody to empower.
export const hourglassRefusal = (
	state: HourglassState,
	object: Pick<DungeonObject, "floorNumber">,
): string | undefined =>
	state.player.health >= state.player.maxHealth && state.mana >= fullMana(state)
		? "The sand will not fall: you are already at full health and mana."
		: hourglassTargets(state, object).length === 0
			? "The sand will not fall: no living creature on this floor can be strengthened."
			: undefined;

export const turnHourglass = (
	state: GameState,
	object: DungeonObject,
	choice?: ObjectChoice,
): GameState | { error: string } => {
	if (object.activated) return { error: "The hourglass has run out." };
	if (choice !== "hourglass-turn")
		return { error: "Review the hourglass before turning it." };
	const refusal = hourglassRefusal(state, object);
	if (refusal) return { error: refusal };
	const targets = new Set(hourglassTargets(state, object).map((m) => m.id));
	const spent = spendObject(state, object);
	const mana = fullMana(state);
	return {
		...recordHealing(
			spent,
			spent.player.maxHealth - spent.player.health,
			"hourglass",
		),
		player: { ...spent.player, health: spent.player.maxHealth },
		mana,
		// Keep each survivor's missing fraction of its now larger maximum, rounding up.
		monsters: spent.monsters.map((m) => {
			if (!targets.has(m.id)) return m;
			const before = actorMaximumHealth(m, state.difficulty);
			const stronger = { ...m, empowered: true as const };
			const after = actorMaximumHealth(stronger, state.difficulty);
			return { ...stronger, health: Math.ceil((m.health * after) / before) };
		}),
		activityHistory: appendActivityEvents(spent.activityHistory, [
			{
				type: "hourglass-turned",
				health: spent.player.maxHealth - state.player.health,
				mana: mana - state.mana,
				empowered: targets.size,
				turn: state.turn,
			},
		]),
	};
};
