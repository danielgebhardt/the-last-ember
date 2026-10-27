import { appendActivityEvents } from "../game/ActivityHistory";
import { recordDamageTaken } from "../game/CombatTelemetry";
import type { GameState } from "../game/GameState";
import { removeAfflictions } from "../game/PlayerAfflictions";
import { removeBagItem } from "./Bag";
import type { EquipmentAction } from "./EquipmentChanges";
import {
	ITEM_DEFINITIONS,
	type ItemDefinition,
	type ItemInstance,
} from "./Item";

const hungerOf = (item: ItemInstance | null | undefined) =>
	item ? (ITEM_DEFINITIONS[item.kind] as ItemDefinition).hungering : undefined;
export const isHungering = (item: ItemInstance | null | undefined) =>
	hungerOf(item) !== undefined;

export const BOUND_BLADE_REFUSAL =
	"The Hungering Blade will not let go. Read a Remove Curse scroll to free it.";

// While bound, nothing may take the main hand from it.
export const boundBladeRefusal = (
	state: Pick<GameState, "hunger">,
	action: EquipmentAction,
): string | undefined =>
	state.hunger && action.slot === "mainHand" ? BOUND_BLADE_REFUSAL : undefined;

// Wielding it binds it and starts its hunger; losing it any other way (a forge can
// destroy it) ends the binding.
export const settleHunger = (
	before: Pick<GameState, "equipment">,
	after: GameState,
): GameState => {
	const wielded = after.equipment.mainHand;
	if (after.hunger && !isHungering(wielded)) {
		const { hunger: _released, ...rest } = after;
		return rest;
	}
	if (
		!after.hunger &&
		isHungering(wielded) &&
		before.equipment.mainHand?.id !== wielded?.id
	)
		return {
			...after,
			hunger: { fedTurn: after.turn },
			activityHistory: appendActivityEvents(after.activityHistory, [
				{ type: "blade-bound", turn: after.turn },
			]),
		};
	return after;
};

// A Remove Curse scroll always works on a bound blade: it frees it, lifts any Curse
// too, and costs the scroll and a turn like any effective reading.
export const freeBoundBlade = (
	state: GameState,
	scroll: ItemInstance,
): GameState => {
	const { hunger: _released, ...rest } = state;
	return {
		...rest,
		afflictions: removeAfflictions(state.afflictions, ["curse"]),
		bag: removeBagItem(state.bag, scroll.id),
		activityHistory: appendActivityEvents(state.activityHistory, [
			{ type: "blade-freed", turn: state.turn },
		]),
	};
};

// Any kill sates it for another stretch.
export const feedBlade = (state: GameState, turn: number): GameState =>
	state.hunger ? { ...state, hunger: { fedTurn: turn } } : state;

// Every stretch of phases without a kill it takes 1 health, never the last.
export const hungerAfterTurn = (state: GameState): GameState => {
	const drain = hungerOf(state.equipment.mainHand);
	if (!state.hunger || !drain || state.player.health <= 1 || state.town)
		return state;
	const hungry = state.turn - state.hunger.fedTurn;
	if (hungry <= 0 || hungry % drain.phasesPerDrain !== 0) return state;
	return {
		...recordDamageTaken(state, 1, { source: "blade" }),
		player: { ...state.player, health: state.player.health - 1 },
		activityHistory: appendActivityEvents(state.activityHistory, [
			{ type: "blade-hungers", turn: state.turn },
		]),
	};
};
