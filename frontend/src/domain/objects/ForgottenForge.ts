import { hashStringToUint32 } from "../dungeon/DungeonRun";
import { createSeededRandom } from "../dungeon/Seed";
import { appendActivityEvents } from "../game/ActivityHistory";
import { recordGoldOut } from "../game/EconomyTelemetry";
import type { GameState } from "../game/GameState";
import { createBag } from "../items/Bag";
import type { Equipment, EquipmentSlot } from "../items/Equipment";
import { enchantmentTargets } from "../items/EquipmentEnchantment";
import { resourcesAfterEquipmentChange } from "../items/EquipmentResources";
import { type ItemKind, isRareEquipmentKind } from "../items/Item";
import type { DungeonObject } from "./DungeonObject";
import { spendObject } from "./ObjectEffects";
import type { ObjectChoice } from "./ObjectInteraction";

export const FORGE_PRICES = { reliable: 300, risky: 150 } as const;
export type ForgeService = keyof typeof FORGE_PRICES;
export type ForgeOutcome = "improved" | "unchanged" | "destroyed";
export type ForgeResult = Readonly<{
	service: ForgeService;
	outcome: ForgeOutcome;
	item: ItemKind;
}>;

// Fixed by seed and forge identity: item choice, bag order, cancel and load cannot reroll it.
export const forgeRiskyOutcome = (
	seed: number,
	object: Pick<DungeonObject, "id">,
): ForgeOutcome => {
	const roll = createSeededRandom(
		hashStringToUint32(`${seed}:${object.id}:forge:outcome`),
	)();
	return roll < 0.5 ? "improved" : roll < 0.85 ? "unchanged" : "destroyed";
};

// Ordinary enchantable weapons and armor below the cap; rare finds stay untouched.
export const forgeTargets = (state: Pick<GameState, "equipment" | "bag">) =>
	enchantmentTargets(state).filter(
		({ item }) => !isRareEquipmentKind(item.kind),
	);

export const operateForge = (
	state: GameState,
	object: DungeonObject,
	choice?: ObjectChoice,
	itemId?: string,
): GameState | { error: string } => {
	if (object.activated) return { error: "This forge has gone cold." };
	if (choice !== "forge-reliable" && choice !== "forge-risky")
		return { error: "Choose equipment and a forging option first." };
	const service: ForgeService =
		choice === "forge-reliable" ? "reliable" : "risky";
	const target = forgeTargets(state).find(({ item }) => item.id === itemId);
	if (!target)
		return {
			error: "Choose an owned ordinary weapon or armor piece below +3.",
		};
	const price = FORGE_PRICES[service];
	if (state.gold < price) return { error: "You do not have enough gold." };
	const outcome =
		service === "reliable"
			? "improved"
			: forgeRiskyOutcome(state.run.seed, object);
	const { item } = target;
	const replace = (entry: typeof item | null) =>
		entry?.id !== item.id
			? entry
			: outcome === "destroyed"
				? null
				: outcome === "improved"
					? { ...entry, enchantment: (entry.enchantment ?? 0) + 1 }
					: entry;
	const equipment = Object.fromEntries(
		Object.entries(state.equipment).map(([slot, entry]) => [
			slot,
			replace(entry),
		]),
	) as Record<EquipmentSlot, Equipment[EquipmentSlot]>;
	const bag = createBag(
		state.bag.items.flatMap((entry) => {
			const next = replace(entry);
			return next ? [next] : [];
		}),
	);
	const spent = spendObject(state, object);
	// Derived capacity follows the changed loadout before monsters respond.
	const resources = resourcesAfterEquipmentChange(state, equipment);
	return {
		...recordGoldOut(spent, price, `dungeon-forge-${service}`),
		...resources,
		gold: state.gold - price,
		equipment,
		bag,
		objects: spent.objects.map((o) =>
			o.id === object.id
				? { ...o, forgeResult: { service, outcome, item: item.kind } }
				: o,
		),
		activityHistory: appendActivityEvents(spent.activityHistory, [
			{
				type: "forge-used",
				service,
				outcome,
				item: item.kind,
				enchantment: (item.enchantment ?? 0) + (outcome === "improved" ? 1 : 0),
				gold: price,
				turn: state.turn,
			},
		]),
	};
};
