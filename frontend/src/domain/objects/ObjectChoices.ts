import type { GameState } from "../game/GameState";
import { omenFavorsWell, WELL_FAVOR } from "../game/Omens";
import { createPlayerStats } from "../game/PlayerStats";
import { createProgression } from "../game/Progression";
import { createStartingEquipment } from "../items/Equipment";
import { itemName } from "../items/ItemValues";
import { EMPOWERED_MULTIPLIER } from "../monsters/MonsterStats";
import { FOUNTAIN_RULES, fountainRestoration } from "./DungeonFountains";
import {
	type DungeonObject,
	type DungeonObjectKind,
	RELIQUARY_HEALTH_COST,
} from "./DungeonObject";
import { shrineTerms } from "./DungeonShrines";
import { FORGE_PRICES, forgeTargets } from "./ForgottenForge";
import { hourglassRefusal, hourglassTargets } from "./HourglassOfAges";
import {
	MIRROR_CHOICES,
	MIRROR_REWARD_ENCHANTMENT,
	MIRROR_SHATTER_ODDS,
} from "./MirrorOfShadows";
import type { ObjectChoice } from "./ObjectInteraction";
import { PORTAL_FLOOR_SPAN } from "./RunicPortal";
import { withForesight } from "./SeersSight";
import { WELL_ODDS, WELL_OFFERINGS } from "./WishingWell";
// What a choice can lead to, as a player weighs it; chance is omitted for a sure thing.
export type ChoiceOutcome = Readonly<{
	chance?: number;
	text: string;
	tone: "good" | "bad" | "neutral";
}>;
export type InteractionChoice = Readonly<{
	value: ObjectChoice;
	label: string;
	// One plain sentence; the outcomes carry the odds.
	description: string;
	outcomes?: readonly ChoiceOutcome[];
	// Something that stops or endangers you right now, such as too little gold.
	warning?: string;
	// The Seer's Circlet names the fixed result.
	foreseen?: string;
	itemId?: string;
}>;
// A line of atmosphere above an encounter's choices.
export const OBJECT_FLAVOR: Partial<Record<DungeonObjectKind, string>> = {
	sarcophagus:
		"A stone coffin, its lid carved with warnings. Something was buried here with its treasure.",
	hourglass: "Sand runs upward through the glass, slow and patient.",
	"runic-portal": "Runes circle a doorway that opens onto somewhere deeper.",
	mirror: "Your reflection moves a moment after you do.",
	well: "Coins glint far below. Something down there is listening.",
	forge: "The coals still glow, hot enough for one more job.",
	fountain: "Cold, clear water wells up from the stone.",
	"elite-door":
		"Behind the bars, an iron champion stands guard over its prize.",
	reliquary: "A rare ring lies beneath glass sealed in old blood.",
	archive: "Shelves of crumbling books. One may still hold a spell.",
	shrine: "A quiet altar. Gold left here returns as insight.",
	throne: "An empty throne, still humming with old power.",
};
const short = (gold: number | undefined, price: number) =>
	gold !== undefined && gold < price ? "Not enough gold." : undefined;
const forgeServiceChoices = (
	gold: number | undefined,
	item?: { id: string; name: string; next: number },
): readonly InteractionChoice[] => {
	const name = item?.name ?? "your item";
	const next = `+${item?.next ?? "1 higher"}`;
	return [
		{
			value: "forge-reliable",
			itemId: item?.id,
			label: `Reliable forging · ${FORGE_PRICES.reliable} gold`,
			description: `A careful job: ${name} becomes ${next}.`,
			outcomes: [{ text: `Becomes ${next}`, tone: "good" }],
			warning: short(gold, FORGE_PRICES.reliable),
		},
		{
			value: "forge-risky",
			itemId: item?.id,
			label: `Risky forging · ${FORGE_PRICES.risky} gold`,
			description: `Cheaper, but the heat may ruin ${name}, even if you are wearing it.`,
			outcomes: [
				{ chance: 0.5, text: `Becomes ${next}`, tone: "good" },
				{ chance: 0.35, text: "No change", tone: "neutral" },
				{ chance: 0.15, text: "Destroyed", tone: "bad" },
			],
			warning: short(gold, FORGE_PRICES.risky),
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
		description: `Forge it to +${(item.enchantment ?? 0) + 1}. You will see the price before paying.`,
	}));
};
const baseObjectChoices = (
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
		Partial<
			Pick<GameState, "bag" | "gold" | "mana" | "monsters" | "run" | "omens">
		>,
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
				description:
					"Time bends in your favor, and against everything else on this floor.",
				outcomes: [
					{ text: "Full health and mana", tone: "good" },
					{
						text: `${targets !== undefined ? `${targets} creature${targets === 1 ? "" : "s"}` : "Every creature here"} grow${targets === 1 ? "s" : ""} ${Math.round((EMPOWERED_MULTIPLIER - 1) * 100)}% stronger for good`,
						tone: "bad",
					},
				],
				warning: refusal,
			},
		];
	}
	if (object.kind === "runic-portal")
		return [
			{
				value: "portal-enter",
				label: "Step through",
				description: `A one-way trip. You arrive beside a way down, perhaps on this floor, perhaps up to ${PORTAL_FLOOR_SPAN} floors deeper.`,
				outcomes: [
					{ text: "Skips ahead", tone: "good" },
					{ text: "Destination unknown", tone: "neutral" },
					{ text: "Skipped floors stay unexplored", tone: "bad" },
				],
			},
		];
	if (object.kind === "mirror") {
		const odds = MIRROR_SHATTER_ODDS;
		const prize = `+${MIRROR_REWARD_ENCHANTMENT} weapon or armor`;
		return [
			{
				value: MIRROR_CHOICES.reveal,
				label: "Reveal this floor",
				description:
					"See the map of every room and corridor here. What lives in them stays hidden.",
				outcomes: [{ text: "Floor map revealed", tone: "good" }],
			},
			{
				value: MIRROR_CHOICES.reflection,
				label: "Face your reflection",
				description: "Your shadow steps out of the glass to fight you.",
				outcomes: [
					{ text: "A fight", tone: "bad" },
					{ text: `Win: ${prize}`, tone: "good" },
				],
			},
			{
				value: MIRROR_CHOICES.shatter,
				label: "Shatter the mirror",
				description: "Break it and see what falls out.",
				outcomes: [
					{ chance: odds.item, text: prize, tone: "good" },
					{ chance: odds.empty, text: "Nothing", tone: "neutral" },
					{ chance: odds.hostile, text: "A creature breaks free", tone: "bad" },
				],
			},
		];
	}
	if (object.kind === "well")
		return WELL_OFFERINGS.map((offering) => {
			// Fortune's floor favors every offering.
			const favored = state ? omenFavorsWell(state, object.floorNumber) : false;
			const base = WELL_ODDS[offering];
			const odds = favored
				? {
						...base,
						positive: base.positive + WELL_FAVOR.positive,
						negative: Math.max(0, base.negative + WELL_FAVOR.negative),
					}
				: base;
			return {
				value: `offer-${offering}` as ObjectChoice,
				label: `Offer ${offering} gold`,
				description:
					offering === WELL_OFFERINGS[0]
						? "A small coin for a small hope."
						: offering === WELL_OFFERINGS[1]
							? "A fair offering, and a better gift."
							: "A generous offering the well is likely to reward.",
				outcomes: [
					{
						chance: odds.positive,
						text: `+${odds.enchantment} weapon or armor, rarely a lasting blessing`,
						tone: "good",
					},
					{
						chance: 1 - odds.positive - odds.negative,
						text: "Nothing",
						tone: "neutral",
					},
					{ chance: odds.negative, text: "A creature climbs out", tone: "bad" },
				],
				warning: short(state?.gold, offering),
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
				label: "Lift the lid",
				description:
					"Its guardian, if it wakes, is twice as tough as others of its kind.",
				outcomes: [
					{ chance: 0.4, text: "Treasure", tone: "good" },
					{ chance: 0.25, text: "Treasure and its guardian", tone: "neutral" },
					{ chance: 0.25, text: "Only its guardian", tone: "bad" },
					{ chance: 0.1, text: "Empty", tone: "neutral" },
				],
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
				label: "Take a careful sip",
				description: "A little refreshment, no risk.",
				outcomes: [
					{
						text: `Up to ${terms.sip.health} health and ${terms.sip.mana} mana`,
						tone: "good",
					},
				],
			},
			{
				value: "draw",
				label: "Drink deeply",
				description: "Much more, if the water is clean.",
				outcomes: [
					{
						chance: FOUNTAIN_RULES.restorationChance,
						text: `Up to ${terms.draw.health} health and ${terms.draw.mana} mana`,
						tone: "good",
					},
					{
						chance: 1 - FOUNTAIN_RULES.restorationChance,
						text: `${FOUNTAIN_RULES.damage} damage and Poison`,
						tone: "bad",
					},
				],
			},
		];
	}
	if (object.kind === "elite-door" && !object.activated)
		return [
			{
				value: "open-elite",
				label: "Open the gate",
				description:
					"Tougher than anything else on this floor, and it charges before it strikes. Cold hurts it; arcane barely does.",
				outcomes: [
					{ text: "A hard fight", tone: "bad" },
					{ text: "Win: equipment for this depth", tone: "good" },
				],
			},
		];
	if (object.kind === "reliquary") {
		const fatal = state && state.player.health <= RELIQUARY_HEALTH_COST;
		return [
			{
				value: "unseal",
				label: "Break the seal",
				description: `The seal takes ${RELIQUARY_HEALTH_COST} health as its price; armor cannot help.`,
				outcomes: [
					{ text: "A rare ring", tone: "good" },
					{
						text: state
							? `Health ${state.player.health} → ${Math.max(0, state.player.health - RELIQUARY_HEALTH_COST)}`
							: `${RELIQUARY_HEALTH_COST} damage`,
						tone: "bad",
					},
				],
				warning: fatal ? "This will kill you." : undefined,
			},
		];
	}
	if (object.kind === "archive")
		return [
			{
				value: "read",
				label: "Search the shelves",
				description: "Look for a spellbook you have not learned yet.",
				outcomes: [
					{
						text: "A new spellbook, or a mana potion if none fits",
						tone: "good",
					},
				],
			},
		];
	if (object.kind === "shrine") {
		const terms = shrineTerms(object);
		return [
			{
				value: "offer",
				label: `Offer ${terms.gold} gold`,
				description: "Leave your gold and listen.",
				outcomes: [{ text: `${terms.experience} experience`, tone: "good" }],
				warning: short(state?.gold, terms.gold),
			},
		];
	}
	if (object.kind === "throne")
		return [
			{
				value: "sit",
				label: "Sit on the throne",
				description: "Claim the seat and see how it judges you.",
				outcomes: [
					{ chance: 0.4, text: "Experience", tone: "good" },
					{ chance: 0.25, text: "Some health and mana", tone: "good" },
					{ chance: 0.2, text: "2 damage and Poison", tone: "bad" },
					{
						chance: 0.15,
						text: "Whisked elsewhere on this floor",
						tone: "neutral",
					},
				],
			},
			{
				value: "pry",
				label: "Pry out its jewels",
				description: "Its gems are worth a fortune, if it lets you take them.",
				outcomes: [
					{ chance: 0.7, text: "Gold", tone: "good" },
					{ chance: 0.3, text: "4–8 damage", tone: "bad" },
				],
			},
		];
	return [];
};
// With foresight worn, each gamble's description also states its fixed result.
export const objectChoices = (
	object: DungeonObject,
	state?: Parameters<typeof baseObjectChoices>[1],
): readonly InteractionChoice[] => {
	const choices = baseObjectChoices(object, state);
	return state ? withForesight(choices, object, state) : choices;
};
