import { appendActivityEvents } from "./ActivityHistory";
import type { GameState } from "./GameState";
import { growManaCapacity } from "./Mana";
import { chosenPerks, type PerkKind, pendingPerk } from "./Perks";
import { maximumHealth } from "./PlayerHealth";

export type ChoosePerkAction = { type: "choose-perk"; perk: PerkKind };

// Free and permanent: the earliest waiting level's offer, never a turn. Capacity
// perks raise current health and mana with their maximums, like a level-up.
export const choosePerk = (state: GameState, action: ChoosePerkAction) => {
	const reject = (error: string) => ({
		state,
		turnAdvanced: false as const,
		error,
	});
	if (state.player.health <= 0 || state.quest.victory)
		return reject("Perks can only be chosen during an active adventure.");
	const pending = pendingPerk(state.run.seed, state.progression);
	if (!pending) return reject("No perk is waiting to be chosen.");
	if (!pending.offers.includes(action.perk))
		return reject("That perk isn't offered at this level.");
	const progression = {
		...state.progression,
		perks: [
			...chosenPerks(state.progression),
			{ level: pending.level, perk: action.perk },
		],
	};
	const maxHealth = maximumHealth(
		progression,
		state.equipment,
		state.afflictions,
	);
	return {
		state: {
			...state,
			progression,
			player: {
				maxHealth,
				health: state.player.health + maxHealth - state.player.maxHealth,
			},
			mana: growManaCapacity(
				state.mana,
				state.progression,
				progression,
				state.equipment,
				state.afflictions,
			),
			activityHistory: appendActivityEvents(state.activityHistory, [
				{
					type: "perk-chosen",
					perk: action.perk,
					level: pending.level,
					turn: state.turn,
				},
			]),
		},
		turnAdvanced: false as const,
	};
};
