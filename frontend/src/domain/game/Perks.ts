import { hashStringToUint32 } from "../dungeon/DungeonRun";
import { createSeededRandom } from "../dungeon/Seed";
import { levelForExperience, type Progression } from "./Progression";

// Provisional values for playtesting. Each perk is taken at most once.
export const PERK_DEFINITIONS = {
	brutal: { family: "Combat", name: "Brutal", effect: "+1 melee damage." },
	precise: {
		family: "Combat",
		name: "Precise",
		effect: "+5% melee hit chance.",
	},
	opportunist: {
		family: "Combat",
		name: "Opportunist",
		effect: "+2 melee damage against monsters that haven't noticed you.",
	},
	executioner: {
		family: "Combat",
		name: "Executioner",
		effect: "+3 melee damage against monsters below half their maximum health.",
	},
	reckless: {
		family: "Combat",
		name: "Reckless",
		effect: "+2 melee damage, −5% evasion.",
	},
	tough: { family: "Defense", name: "Tough", effect: "+4 maximum health." },
	evasive: { family: "Defense", name: "Evasive", effect: "+5% evasion." },
	"iron-hide": { family: "Defense", name: "Iron hide", effect: "+1 armor." },
	"last-stand": {
		family: "Defense",
		name: "Last stand",
		effect: "+10% evasion while below 25% of maximum health.",
	},
	"arrow-ward": {
		family: "Defense",
		name: "Arrow ward",
		effect: "Ranged attacks against you deal 2 less damage (minimum 1).",
	},
	"deep-reserves": {
		family: "Magic",
		name: "Deep reserves",
		effect: "+3 maximum mana.",
	},
	spellfocus: {
		family: "Magic",
		name: "Spellfocus",
		effect: "+1 spell damage and healing.",
	},
	"quick-recovery": {
		family: "Magic",
		name: "Quick recovery",
		effect: "Mana recovers every 24 turns instead of 30.",
	},
	"efficient-casting": {
		family: "Magic",
		name: "Efficient casting",
		effect: "Spells cost 1 less mana (minimum 1).",
	},
	"long-reach": {
		family: "Magic",
		name: "Long reach",
		effect: "Targeted spells get +1 range.",
	},
	herbalist: {
		family: "Survival",
		name: "Herbalist",
		effect: "Healing and mana potions restore 2 more.",
	},
	resilient: {
		family: "Survival",
		name: "Resilient",
		effect: "Timed afflictions last 25% shorter (rounded up).",
	},
	antivenom: {
		family: "Survival",
		name: "Antivenom",
		effect: "Poison lasts 3 phases instead of 10.",
	},
	"field-medic": {
		family: "Survival",
		name: "Field medic",
		effect: "Using a remedy also restores 3 health.",
	},
	"iron-constitution": {
		family: "Survival",
		name: "Iron constitution",
		effect: "Disease lowers maximum health by 10% instead of 20%.",
	},
	scavenger: {
		family: "Exploration",
		name: "Scavenger",
		effect: "+25% gold from piles and kills (rounded down).",
	},
	trapwise: {
		family: "Exploration",
		name: "Trapwise",
		effect: "+20% trap disarm chance (maximum 95%).",
	},
	"keen-eyes": {
		family: "Exploration",
		name: "Keen eyes",
		effect: "+1 sight radius.",
	},
	haggler: {
		family: "Exploration",
		name: "Haggler",
		effect: "Merchants and town shops charge 10% less and pay 10% more.",
	},
	pathfinder: {
		family: "Exploration",
		name: "Pathfinder",
		effect: "Each floor's stairs down are marked on your map.",
	},
} as const;
export type PerkKind = keyof typeof PERK_DEFINITIONS;
export type PerkFamily = (typeof PERK_DEFINITIONS)[PerkKind]["family"];
export const PERK_KINDS = Object.keys(PERK_DEFINITIONS) as PerkKind[];
export type PerkChoice = Readonly<{ level: number; perk: PerkKind }>;

// Strength grows at odd levels and Dexterity at even ones; a perk joins each odd
// level from 3, so every other level-up adds a choice.
export const PERK_LEVELS = [3, 5, 7, 9, 11, 13, 15, 17, 19] as const;
export const PERK_OFFER_COUNT = 3;

export const chosenPerks = (progression: Progression): readonly PerkChoice[] =>
	progression.perks ?? [];
export const hasPerk = (progression: Progression, perk: PerkKind) =>
	chosenPerks(progression).some((choice) => choice.perk === perk);

// Three perks from three different families, fixed by seed and level, never one
// already taken at an earlier level. Choices resolve in level order, so a delayed
// or reloaded choice sees exactly the same offer.
export const perkOffers = (
	seed: number,
	level: number,
	taken: readonly PerkKind[],
): readonly PerkKind[] => {
	const random = createSeededRandom(
		hashStringToUint32(`${seed}:perk:${level}`),
	);
	const families = new Map<string, PerkKind[]>();
	for (const perk of PERK_KINDS)
		if (!taken.includes(perk)) {
			const family = PERK_DEFINITIONS[perk].family;
			families.set(family, [...(families.get(family) ?? []), perk]);
		}
	const open = [...families.keys()];
	const offers: PerkKind[] = [];
	while (offers.length < PERK_OFFER_COUNT && open.length) {
		const [family] = open.splice(Math.floor(random() * open.length), 1);
		const options = families.get(family) ?? [];
		offers.push(options[Math.floor(random() * options.length)]);
	}
	return offers;
};

// The lowest perk level reached without a choice, with its offer; null when caught up.
export const pendingPerk = (
	seed: number,
	progression: Progression,
): { level: number; offers: readonly PerkKind[] } | null => {
	const chosen = chosenPerks(progression);
	const reached = levelForExperience(progression.experience);
	const level = PERK_LEVELS.find(
		(perkLevel) =>
			perkLevel <= reached && !chosen.some((c) => c.level === perkLevel),
	);
	return level === undefined
		? null
		: {
				level,
				offers: perkOffers(
					seed,
					level,
					chosen.map((c) => c.perk),
				),
			};
};
export const pendingPerkCount = (progression: Progression): number => {
	const reached = levelForExperience(progression.experience);
	return (
		PERK_LEVELS.filter((level) => level <= reached).length -
		chosenPerks(progression).length
	);
};

// Every saved choice was offered at its level, in order, with no gaps.
export const isValidPerkHistory = (
	seed: number,
	progression: Progression,
): boolean => {
	const chosen = chosenPerks(progression);
	const reached = levelForExperience(progression.experience);
	return chosen.every(
		(choice, index) =>
			choice.level === PERK_LEVELS[index] &&
			choice.level <= reached &&
			perkOffers(
				seed,
				choice.level,
				chosen.slice(0, index).map((c) => c.perk),
			).includes(choice.perk),
	);
};
