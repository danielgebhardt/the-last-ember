import type { GameState } from "../game/GameState";
import { createPlayerStats } from "../game/PlayerStats";
import { createProgression } from "../game/Progression";
import { createStartingEquipment } from "../items/Equipment";
import { itemName } from "../items/ItemValues";
import {
	EMPOWERED_MULTIPLIER,
	maximumMonsterHealth,
	monsterDamageRange,
} from "../monsters/MonsterStats";
import { fountainRestoration } from "./DungeonFountains";
import { type DungeonObject, RELIQUARY_HEALTH_COST } from "./DungeonObject";
import { shrineTerms } from "./DungeonShrines";
import { FORGE_PRICES, forgeTargets } from "./ForgottenForge";
import { hourglassRefusal, hourglassTargets } from "./HourglassOfAges";
import {
	MIRROR_BACKLASH_SHARE,
	MIRROR_CHOICES,
	MIRROR_REWARD_ENCHANTMENT,
	MIRROR_SHATTER_ODDS,
	mirrorBacklash,
	reflectionStats,
} from "./MirrorOfShadows";
import type { ObjectChoice } from "./ObjectInteraction";
import { PORTAL_FLOOR_SPAN } from "./RunicPortal";
import { WELL_ODDS, WELL_OFFERINGS } from "./WishingWell";
export type InteractionChoice = Readonly<{
	value: ObjectChoice;
	label: string;
	description: string;
	itemId?: string;
}>;
const forgeServiceChoices = (
	gold: number | undefined,
	item?: { id: string; name: string; next: number },
): readonly InteractionChoice[] => {
	const afford = (price: number) =>
		gold !== undefined && gold < price ? " Not enough gold." : "";
	const name = item?.name ?? "the chosen item";
	return [
		{
			value: "forge-reliable",
			itemId: item?.id,
			label: `Reliable forging · ${FORGE_PRICES.reliable} gold`,
			description: `Guaranteed: ${name} becomes +${item?.next ?? "1 higher"}. One turn; spends the forge.${afford(FORGE_PRICES.reliable)}`,
		},
		{
			value: "forge-risky",
			itemId: item?.id,
			label: `Risky forging · ${FORGE_PRICES.risky} gold`,
			description: `50%: ${name} becomes +${item?.next ?? "1 higher"}. 35%: unchanged. 15%: ${name} is destroyed, even if worn. One turn; spends the forge whatever happens.${afford(FORGE_PRICES.risky)}`,
		},
	];
};
// Step one lists eligible copies; step two (with itemId) offers the priced services.
export const forgeChoices = (
	state: Pick<GameState, "equipment" | "bag" | "gold">,
	itemId?: string,
): readonly InteractionChoice[] => {
	const targets = forgeTargets(state);
	const target = targets.find(({ item }) => item.id === itemId);
	if (target)
		return forgeServiceChoices(state.gold, {
			id: target.item.id,
			name: itemName(target.item),
			next: (target.item.enchantment ?? 0) + 1,
		});
	return targets.map(({ item, location }) => ({
		value: "forge-select",
		itemId: item.id,
		label: `${location}: ${itemName(item)}`,
		description: `Choose to see reliable and risky forging to +${(item.enchantment ?? 0) + 1}. Choosing is free.`,
	}));
};
export const objectChoices = (
	object: DungeonObject,
	state?: Pick<
		GameState,
		| "player"
		| "progression"
		| "equipment"
		| "effects"
		| "afflictions"
		| "difficulty"
	> &
		Partial<Pick<GameState, "bag" | "gold" | "mana" | "monsters" | "run">>,
): readonly InteractionChoice[] => {
	if (object.kind === "hourglass") {
		const refusal =
			state?.mana !== undefined && state.monsters && state.run
				? hourglassRefusal(
						{
							...state,
							mana: state.mana,
							monsters: state.monsters,
							run: state.run,
						},
						object,
					)
				: undefined;
		const targets = state?.monsters
			? hourglassTargets({ monsters: state.monsters }, object).length
			: undefined;
		return [
			{
				value: "hourglass-turn",
				label: "Turn the hourglass",
				description: `Restores you to full health and mana. In exchange, every living creature on this floor${targets !== undefined ? ` (${targets} now)` : ""} permanently gains ${Math.round((EMPOWERED_MULTIPLIER - 1) * 100)}% maximum health and attack, keeping its share of wounds. Creatures that arrive later are unaffected. One turn; monsters then act normally and can kill you. One use.${refusal ? ` ${refusal}` : ""}`,
			},
		];
	}
	if (object.kind === "runic-portal")
		return [
			{
				value: "portal-enter",
				label: "Step through",
				description: `Leads beside a way down: this floor's down stair or one up to ${PORTAL_FLOOR_SPAN} floors deeper, with equal odds. What waits there is unknown, and floors you skip stay unexplored for your climb home. One turn; the portal goes dark. It will not take you while you carry the Warden's Flame.`,
			},
		];
	if (object.kind === "mirror") {
		const reflection = state && reflectionStats(state);
		const odds = MIRROR_SHATTER_ODDS;
		return [
			{
				value: MIRROR_CHOICES.reveal,
				label: "Reveal this floor",
				description:
					"Show the layout of every room and corridor on this floor: walls, floors, doors and stairs. Creatures, items, traps and other discoveries stay hidden until you see them. One turn; the mirror goes dark.",
			},
			{
				value: MIRROR_CHOICES.reflection,
				label: "Face your reflection",
				description: `A hostile reflection steps out${reflection ? ` with ${reflection.maxHealth} HP (half your maximum) and ${reflection.attackDamage} melee damage (your minimum hit)` : " with half your maximum HP and your minimum melee damage"}, before difficulty. Defeat it for one ordinary weapon or armor piece +${MIRROR_REWARD_ENCHANTMENT} from this floor. Refused for free if it has no room to appear. One turn; the mirror goes dark.`,
			},
			{
				value: MIRROR_CHOICES.shatter,
				label: "Shatter the mirror",
				description: `${Math.round(odds.item * 100)}%: one ordinary weapon or armor piece +${MIRROR_REWARD_ENCHANTMENT} from this floor. ${Math.round(odds.empty * 100)}%: nothing. ${Math.round(odds.hostile * 100)}%: a hostile floor creature emerges nearby; with no room for it, a backlash deals ${state ? mirrorBacklash(state.player.maxHealth) : `${MIRROR_BACKLASH_SHARE * 100}% of your maximum HP`} damage instead, ignoring armor and potentially fatal. One turn; the mirror is destroyed.`,
			},
		];
	}
	if (object.kind === "well")
		return WELL_OFFERINGS.map((offering) => {
			const odds = WELL_ODDS[offering];
			const neutral = Math.round((1 - odds.positive - odds.negative) * 100);
			return {
				value: `offer-${offering}` as ObjectChoice,
				label: `Offer ${offering} gold`,
				description: `${Math.round(odds.positive * 100)}% reward: ordinary weapon or armor +${odds.enchantment} from this floor (or, 1 in 10 rewards, a permanent +1 attribute). ${neutral}% nothing. ${Math.round(odds.negative * 100)}% a hostile floor creature emerges nearby. The gold, one turn and the well are spent whatever happens.${state?.gold !== undefined && state.gold < offering ? " Not enough gold." : ""}`,
			};
		});
	if (object.kind === "forge")
		return state?.bag
			? forgeChoices({ ...state, bag: state.bag, gold: state.gold ?? 0 })
			: forgeServiceChoices(undefined);
	if (object.kind === "sarcophagus")
		return [
			{
				value: "open-sarcophagus",
				label: "Open the sarcophagus",
				description:
					"40% treasure, 25% Heroic guardian, 25% both, 10% empty. The guardian is a floor-relevant enemy with double base health and attack damage; normal difficulty, abilities and attack timing apply. Potentially fatal. One turn; monsters respond normally. One use. Treasure stays on the floor for G pickup. Escape leaves it sealed.",
			},
		];
	if (object.kind === "fountain") {
		const terms = fountainRestoration(
			state ?? {
				player: createPlayerStats(),
				effects: [],
				progression: createProgression(),
				equipment: createStartingEquipment(),
				afflictions: [],
			},
		);
		return [
			{
				value: "sip",
				label: "Safe sip",
				description: `Recover up to ${terms.sip.health} health and ${terms.sip.mana} mana. Scales with capacity. One turn; empties the fountain.`,
			},
			{
				value: "draw",
				label: "Risky draw",
				description: `70%: recover up to ${terms.draw.health} health and ${terms.draw.mana} mana. Otherwise take 3 damage, ignoring armor and potentially fatal, and poison for 3 turns. One turn; empties the fountain.`,
			},
		];
	}
	if (object.kind === "elite-door" && !object.activated) {
		const difficulty = state?.difficulty ?? 1;
		const health = maximumMonsterHealth(
			"iron-champion",
			difficulty,
			object.floorNumber,
		);
		const damage = monsterDamageRange(
			"iron-champion",
			difficulty,
			object.floorNumber,
		);
		return [
			{
				value: "open-elite",
				label: "Open the elite gate",
				description: `Optional iron champion: maximum health ${health}, melee/charge damage ${damage.minDamage}–${damage.maxDamage} before armor. A telegraphed charge and recovery; resists arcane, vulnerable to cold. Defeat it for guaranteed depth-appropriate equipment, not necessarily an upgrade. Opening costs one turn; monsters act immediately. You can leave this chamber sealed, even during the hunted return.`,
			},
		];
	}
	return object.kind === "reliquary"
		? [
				{
					value: "unseal",
					label: "Break the seal",
					description: `Take ${RELIQUARY_HEALTH_COST} damage, ignoring armor and difficulty, to release a rare ring. ${state ? `Health ${state.player.health} → ${Math.max(0, state.player.health - RELIQUARY_HEALTH_COST)}. ${state.player.health <= RELIQUARY_HEALTH_COST ? "This will kill you. " : ""}` : "Potentially fatal. "}The reward stays on the floor for G pickup. One turn; one use. Surviving the sacrifice still lets monsters act.`,
				},
			]
		: object.kind === "archive"
			? [
					{
						value: "read",
						label: "Search the archive",
						description:
							"Release a depth-appropriate unknown book from this adventure’s spell pool, or a mana potion if none fits. Reward stays on the floor. One turn; one use.",
					},
				]
			: object.kind === "shrine"
				? [
						{
							value: "offer",
							label: `Offer ${shrineTerms(object).gold} gold`,
							description: `Gain ${shrineTerms(object).experience} XP with normal automatic level growth. One turn; one offering per shrine. Gold is spent permanently.`,
						},
					]
				: object.kind === "throne"
					? [
							{
								value: "sit",
								label: "Sit on the throne",
								description:
									"40%: gain depth-scaled XP; 25%: restore up to 8 health/6 mana; 20%: take 2 damage and poison; 15%: relocate safely on this floor. One turn; spends the throne.",
							},
							{
								value: "pry",
								label: "Pry treasure",
								description:
									"70%: gain depth-scaled gold. Otherwise take 4–8 damage, potentially fatal. One turn; spends the throne.",
							},
						]
					: [];
};
