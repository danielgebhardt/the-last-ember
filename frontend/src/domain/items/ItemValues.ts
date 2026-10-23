import {
	ITEM_DEFINITIONS,
	type ItemDefinition,
	type ItemInstance,
	type ItemKind,
} from "./Item";
export const itemMagicResistance = (
	item: ItemInstance | null | undefined,
): number =>
	item
		? ((ITEM_DEFINITIONS[item.kind] as ItemDefinition).magicResistance ?? 0)
		: 0;
// The Goldbound Blade's extra attack from carried gold; zero for every other weapon.
export const goldBoundBonus = (
	item: ItemInstance | null | undefined,
	gold: number,
): number => {
	const scaling =
		item && (ITEM_DEFINITIONS[item.kind] as ItemDefinition).goldBound;
	return scaling
		? Math.min(
				scaling.maxBonus,
				Math.floor(Math.max(0, gold) / scaling.goldPerPoint),
			)
		: 0;
};
// How much closer monsters must be to notice you, from all worn equipment.
export const equipmentStealth = (
	equipment: Readonly<Record<string, ItemInstance | null>>,
): number =>
	Object.values(equipment).reduce(
		(sum, item) =>
			sum +
			(item
				? ((ITEM_DEFINITIONS[item.kind] as ItemDefinition).stealth ?? 0)
				: 0),
		0,
	);
const bloodrageOf = (item: ItemInstance | null | undefined) =>
	item ? (ITEM_DEFINITIONS[item.kind] as ItemDefinition).bloodrage : undefined;
// The Bloodrage Axe's extra attack from missing health; zero for every other weapon.
export const bloodrageBonus = (
	item: ItemInstance | null | undefined,
	player: Readonly<{ health: number; maxHealth: number }> | undefined,
): number => {
	const rage = bloodrageOf(item);
	if (!rage || !player || player.maxHealth <= 0) return 0;
	const missing = Math.max(0, player.maxHealth - player.health);
	return Math.min(
		rage.maxBonus,
		Math.floor(missing / (player.maxHealth * rage.missingShare)),
	);
};
export const bloodrageArmorPenalty = (item: ItemInstance | null | undefined) =>
	bloodrageOf(item)?.armorPenalty ?? 0;
// Health potions restore this share while a bloodrage weapon is wielded (at least 1).
export const bloodrageHealing = (
	item: ItemInstance | null | undefined,
	amount: number,
): number => {
	const rage = bloodrageOf(item);
	return rage ? Math.max(1, Math.floor(amount * rage.healingShare)) : amount;
};
export const MAX_ENCHANTMENT = 3;
export const isEnchantableKind = (kind: ItemKind): boolean =>
	["weapon", "shield", "chest-armor", "helmet"].includes(
		ITEM_DEFINITIONS[kind].type,
	);
export const itemAttackBonus = (
	item: ItemInstance | null | undefined,
): number =>
	item
		? ITEM_DEFINITIONS[item.kind].attackBonus +
			(ITEM_DEFINITIONS[item.kind].type === "weapon"
				? (item.enchantment ?? 0)
				: 0)
		: 0;
export const itemArmor = (item: ItemInstance | null | undefined): number =>
	item
		? ITEM_DEFINITIONS[item.kind].armor +
			(isEnchantableKind(item.kind) &&
			ITEM_DEFINITIONS[item.kind].type !== "weapon"
				? (item.enchantment ?? 0)
				: 0)
		: 0;
export const itemName = (item: ItemInstance): string =>
	`${ITEM_DEFINITIONS[item.kind].name}${item.enchantment ? ` +${item.enchantment}` : ""}`;
