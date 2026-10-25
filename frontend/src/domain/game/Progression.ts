import type { PactKind } from "./Pacts";
import type { PerkChoice } from "./Perks";
import {
	createPermanentAttributes,
	type PermanentAttributes,
} from "./PermanentAttributes";
import type { PlayerStats } from "./PlayerStats";

export const MAX_PLAYER_LEVEL = 20;
export const HEALTH_PER_LEVEL = 2;
const EXPERIENCE_STEP = 10;

// XP is authoritative. Level and automatic growth are derived from it so they
// cannot drift apart when a reward crosses several thresholds or reaches the cap.
export type Progression = Readonly<{
	experience: number;
	permanentAttributes?: PermanentAttributes;
	// Perks chosen at odd levels from 3, in level order.
	perks?: readonly PerkChoice[];
	// The bargain struck at a dark altar, kept for the rest of the run.
	pact?: PactKind;
}>;
export const createProgression = (): Progression => ({
	experience: 0,
	permanentAttributes: createPermanentAttributes(),
	perks: [],
});
export const experienceThreshold = (level: number): number => {
	if (!Number.isInteger(level) || level < 1 || level > MAX_PLAYER_LEVEL)
		throw new RangeError("Unsupported character level.");
	// Retain early milestones; deeper growth needs twice the incremental XP.
	return level <= 5
		? (EXPERIENCE_STEP * level * (level - 1)) / 2
		: 100 + EXPERIENCE_STEP * (level * (level - 1) - 20);
};

export const levelForExperience = (experience: number): number => {
	if (!Number.isSafeInteger(experience) || experience < 0)
		throw new RangeError("Experience must be a nonnegative safe whole number.");
	let level = 1;
	while (
		level < MAX_PLAYER_LEVEL &&
		experience >= experienceThreshold(level + 1)
	)
		level++;
	return level;
};

export const progressionProgress = (progression: Progression) => {
	const level = levelForExperience(progression.experience);
	if (level === MAX_PLAYER_LEVEL)
		return { level, earned: 0, needed: 0, remaining: 0 };
	const threshold = experienceThreshold(level);
	const next = experienceThreshold(level + 1);
	return {
		level,
		earned: progression.experience - threshold,
		needed: next - threshold,
		remaining: next - progression.experience,
	};
};

export const gainExperience = (
	progression: Progression,
	player: PlayerStats,
	reward: number,
) => {
	if (!Number.isSafeInteger(reward) || reward <= 0)
		throw new RangeError(
			"Experience rewards must be positive safe whole numbers.",
		);
	const before = levelForExperience(progression.experience);
	const experience = progression.experience + reward;
	const after = levelForExperience(experience);
	const levels = Array.from(
		{ length: after - before },
		(_, index) => before + index + 1,
	);
	const healthGain = levels.length * HEALTH_PER_LEVEL;
	return {
		progression: { ...progression, experience },
		player: healthGain
			? {
					maxHealth: player.maxHealth + healthGain,
					health: Math.min(
						player.maxHealth + healthGain,
						player.health + healthGain,
					),
				}
			: player,
		levels,
	};
};
