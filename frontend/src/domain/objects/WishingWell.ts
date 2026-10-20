import { selectWeighted } from "../content/WeightedSelection";
import { hashStringToUint32 } from "../dungeon/DungeonRun";
import { createSeededRandom } from "../dungeon/Seed";
import { appendActivityEvents } from "../game/ActivityHistory";
import type { GameState } from "../game/GameState";
import {
	ATTRIBUTE_NAMES,
	type AttributeName,
	permanentAttributeGains,
} from "../game/PermanentAttributes";
import type { FloorItem } from "../items/FloorItems";
import { type ItemKind, isRareEquipmentKind } from "../items/Item";
import { isEnchantableKind, MAX_ENCHANTMENT } from "../items/ItemValues";
import { lootWeights } from "../items/LootWeights";
import { eligibleMonsterKinds, type MonsterKind } from "../monsters/Monster";
import { maximumMonsterHealth } from "../monsters/MonsterStats";
import { sarcophagusSpawn } from "./AncientSarcophagi";
import type { DungeonObject } from "./DungeonObject";
import { spendObject } from "./ObjectEffects";
import type { ObjectChoice } from "./ObjectInteraction";

export const WELL_OFFERINGS = [50, 100, 250] as const;
export type WellOffering = (typeof WELL_OFFERINGS)[number];
export type WellOutcome = "positive" | "neutral" | "negative";
export type WellResult = Readonly<{
	offering: WellOffering;
	outcome: WellOutcome;
}>;
// Positive below the first threshold, negative from the second. Nested thresholds mean a
// larger offering can only improve the same well's single roll.
export const WELL_ODDS: Record<
	WellOffering,
	{ positive: number; negative: number; enchantment: number }
> = {
	50: { positive: 0.4, negative: 0.2, enchantment: 1 },
	100: { positive: 0.55, negative: 0.2, enchantment: 2 },
	250: { positive: 0.7, negative: 0.15, enchantment: 2 },
};
export const WELL_BLESSING_SHARE = 0.1;
export const WELL_SPAWN_ID = 1000002;
const OFFERING_CHOICES: Record<WellOffering, ObjectChoice> = {
	50: "offer-50",
	100: "offer-100",
	250: "offer-250",
};

const stream = (seed: number, object: Pick<DungeonObject, "id">, key: string) =>
	createSeededRandom(hashStringToUint32(`${seed}:${object.id}:well:${key}`));

export const wellOutcome = (
	seed: number,
	object: Pick<DungeonObject, "id">,
	offering: WellOffering,
): WellOutcome => {
	const roll = stream(seed, object, "roll")();
	const odds = WELL_ODDS[offering];
	return roll < odds.positive
		? "positive"
		: roll >= 1 - odds.negative
			? "negative"
			: "neutral";
};

export type WellReward =
	| { type: "blessing"; attribute: AttributeName }
	| { type: "gear"; kind: ItemKind };
// The reward type and identity are fixed per well; only the enchantment follows the tier.
export const wellReward = (
	seed: number,
	object: Pick<DungeonObject, "id" | "floorNumber">,
): WellReward | undefined => {
	const random = stream(seed, object, "reward");
	if (random() < WELL_BLESSING_SHARE)
		return {
			type: "blessing",
			attribute: ATTRIBUTE_NAMES[Math.floor(random() * ATTRIBUTE_NAMES.length)],
		};
	const kind = selectWeighted(
		lootWeights(object.floorNumber, "found").filter(
			({ value }) => isEnchantableKind(value) && !isRareEquipmentKind(value),
		),
		random,
	);
	return kind ? { type: "gear", kind } : undefined;
};

export const wellHostileKind = (
	seed: number,
	object: Pick<DungeonObject, "id" | "floorNumber">,
): MonsterKind => {
	const eligible = eligibleMonsterKinds(object.floorNumber);
	return eligible[
		Math.floor(stream(seed, object, "hostile")() * eligible.length)
	];
};

export const offerAtWell = (
	state: GameState,
	object: DungeonObject,
	choice?: ObjectChoice,
): GameState | { error: string } => {
	if (object.activated)
		return { error: "The well has already taken an offering." };
	const offering = WELL_OFFERINGS.find((o) => OFFERING_CHOICES[o] === choice);
	if (!offering) return { error: "Review the well's offerings first." };
	if (state.gold < offering) return { error: "You do not have enough gold." };
	const seed = state.run.seed;
	const outcome = wellOutcome(seed, object, offering);
	const reward = outcome === "positive" ? wellReward(seed, object) : undefined;
	const spent = spendObject({ ...state, gold: state.gold - offering }, object);
	let next: GameState = {
		...spent,
		objects: spent.objects.map((o) =>
			o.id === object.id ? { ...o, wellResult: { offering, outcome } } : o,
		),
	};
	if (reward?.type === "blessing") {
		const gains = permanentAttributeGains(next.progression);
		next = {
			...next,
			progression: {
				...next.progression,
				permanentAttributes: {
					...gains,
					[reward.attribute]: gains[reward.attribute] + 1,
				},
			},
		};
	} else if (reward?.type === "gear") {
		const item: FloorItem = {
			item: {
				id: `${object.id}:reward`,
				kind: reward.kind,
				enchantment: Math.min(MAX_ENCHANTMENT, WELL_ODDS[offering].enchantment),
			},
			floorNumber: object.floorNumber,
			coordinate: { ...object.coordinate },
		};
		next = { ...next, floorItems: [...next.floorItems, item] };
	}
	let escaped = false;
	if (outcome === "negative") {
		const coordinate = sarcophagusSpawn(state, object);
		const kind = wellHostileKind(seed, object);
		escaped = !coordinate;
		if (coordinate)
			next = {
				...next,
				monsters: [
					...next.monsters,
					{
						id: `${object.floorNumber}:${WELL_SPAWN_ID}`,
						kind,
						floorNumber: object.floorNumber,
						coordinate,
						health: maximumMonsterHealth(
							kind,
							state.difficulty,
							object.floorNumber,
						),
						intent: { type: "idle" },
						lastDamagedTurn: null,
					},
				],
			};
	}
	return {
		...next,
		activityHistory: appendActivityEvents(next.activityHistory, [
			{
				type: "well-offered",
				gold: offering,
				outcome,
				...(reward?.type === "blessing"
					? { attribute: reward.attribute }
					: reward?.type === "gear"
						? { item: reward.kind }
						: {}),
				escaped,
				turn: state.turn,
			},
		]),
	};
};
