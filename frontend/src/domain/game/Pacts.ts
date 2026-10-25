import { hashStringToUint32 } from "../dungeon/DungeonRun";
import { createSeededRandom } from "../dungeon/Seed";
import type { DungeonObject } from "../objects/DungeonObject";
import type { Progression } from "./Progression";

// A permanent bargain struck at a dark altar; at most one per run.
export const PACT_DEFINITIONS = {
	blood: {
		name: "Pact of Blood",
		sentence: "Your arm grows strong on what your veins give up.",
		gain: "+2 Strength",
		cost: "−20% maximum health",
	},
	sight: {
		name: "Pact of Sight",
		sentence: "Every floor lies open to you, and you to it.",
		gain: "Each new floor's map revealed",
		cost: "Monsters notice you 2 tiles farther",
	},
	omens: {
		name: "Pact of Omens",
		sentence:
			"The dungeon marks every floor ahead, and pays you for enduring it.",
		gain: "+25% kill experience",
		cost: "Every remaining floor has an omen",
	},
	avarice: {
		name: "Pact of Avarice",
		sentence: "Gold finds you, and everyone knows it.",
		gain: "+50% gold found",
		cost: "Shops and merchants charge 50% more",
	},
	ash: {
		name: "Pact of Ash",
		sentence: "Your magic burns cheap; your wounds close slowly.",
		gain: "Spells cost 25% less mana",
		cost: "Healing potions heal half",
	},
	hunter: {
		name: "Hunter's Pact",
		sentence: "Power now, and more hunters on the way home.",
		gain: "A level now",
		cost: "More hunters on the hunted return",
	},
	iron: {
		name: "Pact of Iron",
		sentence: "Your skin hardens, and your feet grow heavy.",
		gain: "+2 armor",
		cost: "Evasion halved",
	},
	silence: {
		name: "Pact of Silence",
		sentence: "The dungeon's watchers look past you, and so do its waters.",
		gain: "Thieves and Alarm Sentries ignore you",
		cost: "Fountains and wells refuse you",
	},
} as const;
export type PactKind = keyof typeof PACT_DEFINITIONS;
export const PACT_KINDS = Object.keys(PACT_DEFINITIONS) as PactKind[];
export const PACTS_OFFERED = 3;

// The altar's three bargains, fixed by seed and altar.
export const altarPacts = (
	seed: number,
	altar: Pick<DungeonObject, "id">,
): readonly PactKind[] => {
	const random = createSeededRandom(
		hashStringToUint32(`${seed}:${altar.id}:pacts`),
	);
	const pool = [...PACT_KINDS];
	const offered: PactKind[] = [];
	while (offered.length < PACTS_OFFERED && pool.length)
		offered.push(...pool.splice(Math.floor(random() * pool.length), 1));
	return offered;
};

export const pactOf = (progression: Pick<Progression, "pact">) =>
	progression.pact;
const bound = (progression: Pick<Progression, "pact">, kind: PactKind) =>
	progression.pact === kind;

// What each pact changes, read wherever its rule applies.
export const BLOOD_STRENGTH = 2;
export const BLOOD_HEALTH_SHARE = 0.8;
export const SIGHT_DETECTION_BONUS = 2;
export const OMENS_EXPERIENCE_SHARE = 1.25;
export const AVARICE_SHARE = 1.5;
export const ASH_MANA_SHARE = 0.75;
export const ASH_HEALING_SHARE = 0.5;
export const HUNTER_EXTRA_HUNTERS = 2;
export const IRON_ARMOR = 2;

export const pactStrength = (progression: Pick<Progression, "pact">) =>
	bound(progression, "blood") ? BLOOD_STRENGTH : 0;
export const pactHealthShare = (progression: Pick<Progression, "pact">) =>
	bound(progression, "blood") ? BLOOD_HEALTH_SHARE : 1;
export const pactRevealsFloors = (progression: Pick<Progression, "pact">) =>
	bound(progression, "sight");
export const pactDetectionBonus = (progression: Pick<Progression, "pact">) =>
	bound(progression, "sight") ? SIGHT_DETECTION_BONUS : 0;
// Rounded down, like the omens' own experience bonus.
export const pactKillExperience = (
	progression: Pick<Progression, "pact">,
	experience: number,
) =>
	bound(progression, "omens")
		? Math.floor(experience * OMENS_EXPERIENCE_SHARE)
		: experience;
// Gold found rounds down and prices round up, so neither side gains a coin.
export const pactGold = (
	progression: Pick<Progression, "pact">,
	gold: number,
) => (bound(progression, "avarice") ? Math.floor(gold * AVARICE_SHARE) : gold);
export const pactPrice = (
	progression: Pick<Progression, "pact">,
	price: number,
) => (bound(progression, "avarice") ? Math.ceil(price * AVARICE_SHARE) : price);
// Rounded to the nearest whole point, never below 1.
export const pactSpellCost = (
	progression: Pick<Progression, "pact">,
	cost: number,
) =>
	bound(progression, "ash")
		? Math.max(1, Math.round(cost * ASH_MANA_SHARE))
		: cost;
export const pactHealing = (
	progression: Pick<Progression, "pact">,
	amount: number,
) =>
	bound(progression, "ash")
		? Math.max(1, Math.floor(amount * ASH_HEALING_SHARE))
		: amount;
export const pactExtraHunters = (progression: Pick<Progression, "pact">) =>
	bound(progression, "hunter") ? HUNTER_EXTRA_HUNTERS : 0;
export const pactArmor = (progression: Pick<Progression, "pact">) =>
	bound(progression, "iron") ? IRON_ARMOR : 0;
export const pactHalvesEvasion = (progression: Pick<Progression, "pact">) =>
	bound(progression, "iron");
export const pactSilences = (progression: Pick<Progression, "pact">) =>
	bound(progression, "silence");
export const PACT_REFUSAL = "Your Pact of Silence forbids it.";
