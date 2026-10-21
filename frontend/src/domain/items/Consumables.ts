import {
	AFFLICTION_DEFINITIONS,
	type AfflictionKind,
} from "../game/AfflictionDefinitions";
import type { GameState } from "../game/GameState";
import { maximumMana } from "../game/Mana";
import {
	type AttributeName,
	MAX_PERMANENT_ATTRIBUTE_GAIN,
	permanentAttributeGains,
} from "../game/PermanentAttributes";
import { removeAfflictions } from "../game/PlayerAfflictions";
import { maximumHealth } from "../game/PlayerHealth";
import type { PlayerStats } from "../game/PlayerStats";
import type { PlayerEffectKind } from "../game/TimedEffects";
import { type Bag, removeBagItem } from "./Bag";
import { ITEM_DEFINITIONS, type ItemKind } from "./Item";

export type ConsumeAction = { type: "consume"; itemId: string };
export type ConsumptionEvent =
	| {
			type: "item-attribute-increased";
			item: ItemKind;
			attribute: AttributeName;
			amount: number;
	  }
	| {
			type: "item-boosted";
			item: ItemKind;
			condition: PlayerEffectKind;
			duration: number;
	  }
	| {
			type: "item-cleansed";
			item: ItemKind;
			// Afflictions a remedy removed; absent for poison and earlier saved entries.
			conditions?: readonly AfflictionKind[];
	  }
	| {
			type: "item-consumed";
			item: ItemKind;
			recovered: number;
	  };

export const consumeItem = (
	state: Pick<
		GameState,
		| "player"
		| "mana"
		| "progression"
		| "bag"
		| "equipment"
		| "effects"
		| "afflictions"
	>,
	action: ConsumeAction,
):
	| {
			afflictions?: GameState["afflictions"];
			player: PlayerStats;
			progression?: GameState["progression"];
			mana: number;
			bag: Bag;
			effects: GameState["effects"];
			event: ConsumptionEvent;
	  }
	| { error: string } => {
	const { player, bag, mana } = state;
	const selected = bag.items.find((item) => item.id === action.itemId);
	if (!selected) return { error: "That item is no longer in your bag." };
	const definition = ITEM_DEFINITIONS[selected.kind];
	if (definition.type !== "potion" && !("removesAfflictions" in definition))
		return { error: "That item cannot be consumed." };
	if (player.health <= 0)
		return { error: "You cannot drink a potion after death." };
	if ("removesAfflictions" in definition) {
		const covered: readonly AfflictionKind[] = definition.removesAfflictions;
		const active = state.afflictions;
		const afflictions = removeAfflictions(active, covered);
		if (afflictions === active)
			return {
				error: covered
					.map((kind) => AFFLICTION_DEFINITIONS[kind].absentText)
					.join(" "),
			};
		return {
			player: {
				...player,
				maxHealth: maximumHealth(
					state.progression,
					state.equipment,
					afflictions,
				),
			},
			mana,
			afflictions,
			effects: state.effects,
			bag: removeBagItem(bag, selected.id),
			event: {
				type: "item-cleansed",
				item: selected.kind,
				conditions: active
					.filter((a) => !afflictions.includes(a))
					.map((a) => a.kind),
			},
		};
	}
	if ("permanentAttribute" in definition) {
		const attribute = definition.permanentAttribute,
			gains = permanentAttributeGains(state.progression);
		if (gains[attribute] >= MAX_PERMANENT_ATTRIBUTE_GAIN)
			return { error: "That attribute cannot be increased further." };
		return {
			player,
			mana,
			effects: state.effects,
			progression: {
				...state.progression,
				permanentAttributes: { ...gains, [attribute]: gains[attribute] + 1 },
			},
			bag: removeBagItem(bag, selected.id),
			event: {
				type: "item-attribute-increased",
				item: selected.kind,
				attribute,
				amount: 1,
			},
		};
	}

	const { resource, amount } = definition.recovery;
	const current = resource === "health" ? player.health : mana;
	const maximum =
		resource === "health"
			? player.maxHealth
			: maximumMana(
					state.progression,
					state.equipment,
					state.effects,
					state.afflictions,
				);
	if (current >= maximum)
		return { error: `You are already at full ${resource}.` };
	const recovered = Math.min(amount, maximum - current);

	return {
		effects: state.effects,
		player:
			resource === "health"
				? { ...player, health: player.health + recovered }
				: player,
		mana: resource === "mana" ? mana + recovered : mana,
		bag: removeBagItem(bag, selected.id),
		event: { type: "item-consumed", item: selected.kind, recovered },
	};
};
