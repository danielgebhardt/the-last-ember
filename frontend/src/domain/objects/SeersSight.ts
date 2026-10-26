import { type FloorOmen, omenFavorsWell } from "../game/Omens";
import {
	ITEM_DEFINITIONS,
	type ItemDefinition,
	type ItemInstance,
} from "../items/Item";
import { sarcophagusOutcome } from "./AncientSarcophagi";
import { fountainDrawRestores } from "./DungeonFountains";
import type { DungeonObject } from "./DungeonObject";
import { throneOutcome } from "./DungeonThrones";
import { isMimicChest } from "./MimicChests";
import { MIRROR_CHOICES, mirrorShatterOutcome } from "./MirrorOfShadows";
import type { InteractionChoice } from "./ObjectChoices";
import { WELL_OFFERINGS, wellOutcome } from "./WishingWell";

// Every gamble's result is already fixed by seed, object and choice; foresight only shows it.
export const foresees = (
	equipment: Readonly<Record<string, ItemInstance | null>>,
): boolean =>
	Object.values(equipment).some(
		(item) =>
			item !== null &&
			(ITEM_DEFINITIONS[item.kind] as ItemDefinition).foresight === true,
	);

const THRONE = {
	blessing: "it grants experience",
	recovery: "it restores health and mana",
	curse: "it wounds and poisons you",
	relocation: "it moves you elsewhere on this floor",
	treasure: "you find gold",
	wound: "it wounds you",
} as const;
const SARCOPHAGUS = {
	treasure: "it holds treasure",
	guardian: "a Heroic guardian rises",
	both: "treasure, and a Heroic guardian rises",
	empty: "it is empty",
} as const;
const MIRROR = {
	item: "it leaves equipment",
	empty: "it leaves nothing",
	hostile: "a hostile creature emerges",
} as const;
const WELL = {
	positive: "the well rewards you",
	neutral: "nothing happens",
	negative: "a hostile creature emerges",
} as const;

// What one choice would do, or undefined when it holds no gamble.
export const foresight = (
	seed: number,
	object: DungeonObject,
	choice: InteractionChoice["value"],
	favoredWell = false,
): string | undefined => {
	if (object.kind === "fountain" && choice === "draw")
		return fountainDrawRestores(seed, object)
			? "it restores you"
			: "it poisons you";
	if (object.kind === "throne" && (choice === "sit" || choice === "pry"))
		return THRONE[throneOutcome(seed, object, choice)];
	if (object.kind === "sarcophagus" && choice === "open-sarcophagus")
		return SARCOPHAGUS[sarcophagusOutcome(seed, object)];
	if (object.kind === "mirror" && choice === MIRROR_CHOICES.shatter)
		return MIRROR[mirrorShatterOutcome(seed, object)];
	if (object.kind === "well") {
		const offering = WELL_OFFERINGS.find((gold) => choice === `offer-${gold}`);
		if (offering) return WELL[wellOutcome(seed, object, offering, favoredWell)];
	}
	return undefined;
};

export const withForesight = (
	choices: readonly InteractionChoice[],
	object: DungeonObject,
	state: Readonly<{
		equipment: Readonly<Record<string, ItemInstance | null>>;
		run?: Readonly<{ seed: number }>;
		omens?: readonly FloorOmen[];
	}>,
): readonly InteractionChoice[] => {
	const { run } = state;
	if (!run || !foresees(state.equipment)) return choices;
	return choices.map((choice) => {
		const seen = foresight(
			run.seed,
			object,
			choice.value,
			omenFavorsWell(state, object.floorNumber),
		);
		return seen
			? {
					...choice,
					foreseen: `${seen[0].toUpperCase()}${seen.slice(1)}.`,
				}
			: choice;
	});
};

// A chest has no review, so its nearby notice carries the sight instead of the tell.
export const chestForesight = (
	seed: number,
	chest: DungeonObject,
	equipment: Readonly<Record<string, ItemInstance | null>>,
	disabledFeatures?: readonly string[],
): string | undefined =>
	chest.kind === "chest" && !chest.activated && foresees(equipment)
		? isMimicChest(seed, chest, disabledFeatures)
			? "Seer's sight: it is a mimic."
			: "Seer's sight: an ordinary chest."
		: undefined;
