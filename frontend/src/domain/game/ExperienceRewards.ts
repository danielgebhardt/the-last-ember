import { type ActivityEvent, appendActivityEvents } from "./ActivityHistory";
import {
	dexterityAtLevel,
	intelligenceAtLevel,
	strengthAtLevel,
} from "./Attributes";
import type { GameState } from "./GameState";
import { growManaCapacity } from "./Mana";
import { maximumHealth, scaledMaximumHealth } from "./PlayerHealth";
import {
	experienceThreshold,
	gainExperience,
	HEALTH_PER_LEVEL,
} from "./Progression";
export const experienceReward = (state: GameState, reward: number) => {
	const turn = state.turn;
	const gained = gainExperience(state.progression, state.player, reward);
	if (
		scaledMaximumHealth(state.progression, state.afflictions) &&
		gained.levels.length
	) {
		const maxHealth = maximumHealth(
			gained.progression,
			state.equipment,
			state.afflictions,
		);
		gained.player = {
			maxHealth,
			health: Math.min(
				maxHealth,
				state.player.health + Math.max(0, maxHealth - state.player.maxHealth),
			),
		};
	}
	const mana = growManaCapacity(
		state.mana,
		state.progression,
		gained.progression,
		state.equipment,
		state.afflictions,
	);
	const events: ActivityEvent[] = [
		{ type: "experience-gained", amount: reward, turn },
	];
	for (const level of gained.levels) {
		events.push({
			type: "level-gained",
			level,
			healthGain: state.afflictions.length
				? maximumHealth(
						{ ...gained.progression, experience: experienceThreshold(level) },
						state.equipment,
						state.afflictions,
					) -
					maximumHealth(
						{
							...gained.progression,
							experience: experienceThreshold(level - 1),
						},
						state.equipment,
						state.afflictions,
					)
				: HEALTH_PER_LEVEL,
			turn,
		});
		if (strengthAtLevel(level) > strengthAtLevel(level - 1))
			events.push({
				type: "attribute-gained",
				attribute: "Strength",
				value: strengthAtLevel(level),
				turn,
			});
		if (intelligenceAtLevel(level) > intelligenceAtLevel(level - 1))
			events.push({
				type: "attribute-gained",
				attribute: "Intelligence",
				value: intelligenceAtLevel(level),
				turn,
			});
		if (dexterityAtLevel(level) > dexterityAtLevel(level - 1))
			events.push({
				type: "attribute-gained",
				attribute: "Dexterity",
				value: dexterityAtLevel(level),
				turn,
			});
	}
	return {
		player: gained.player,
		progression: gained.progression,
		mana,
		events,
	};
};
export const awardExperience = (
	state: GameState,
	reward: number,
): GameState => {
	const { events, ...growth } = experienceReward(state, reward);
	return {
		...state,
		...growth,
		activityHistory: appendActivityEvents(state.activityHistory, events),
	};
};
