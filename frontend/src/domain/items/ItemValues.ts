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
