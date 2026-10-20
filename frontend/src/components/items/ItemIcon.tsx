import {
	Axe,
	BookOpen,
	Crown,
	HardHat,
	Scroll,
	ScrollText,
	Shield,
	ShieldCheck,
	ShieldHalf,
	Shirt,
	Sword,
	Swords,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { ITEM_DEFINITIONS, type ItemKind } from "../../domain/items/Item";
import type { PotionKind } from "../../domain/items/PotionHotbar";
import DragonMailIcon from "./DragonMailIcon";
import EmberIcon from "./EmberIcon";
import ExitScrollIcon from "./ExitScrollIcon";
import PotionIcon from "./PotionIcon";
import RingIcon from "./RingIcon";
import SpellguardShieldIcon from "./SpellguardShieldIcon";
import WardingCloakIcon from "./WardingCloakIcon";

const isPotionKind = (kind: ItemKind): kind is PotionKind =>
	ITEM_DEFINITIONS[kind].type === "potion";

type BookKind = Extract<ItemKind, `book-${string}`>;
const isBookKind = (kind: ItemKind): kind is BookKind =>
	ITEM_DEFINITIONS[kind].type === "spellbook";
type RingKind = Extract<
	ItemKind,
	"relic-band" | "copper-ring" | `ring-${string}`
>;
const icons: Record<
	Exclude<ItemKind, BookKind | PotionKind | RingKind>,
	ComponentType<SVGProps<SVGSVGElement>>
> = {
	"warding-cloak": WardingCloakIcon,
	"spellguard-shield": SpellguardShieldIcon,
	"enchantment-scroll": ScrollText,
	"remove-curse-scroll": Scroll,
	"exit-scroll": ExitScrollIcon,
	cure: EmberIcon,
	"short-sword": Sword,
	"iron-sword": Sword,
	"steel-sword": Sword,
	"battle-axe": Axe,
	runeblade: Swords,
	"star-forged-blade": Swords,
	"wooden-shield": Shield,
	"leather-armor": Shirt,
	"chain-armor": Shirt,
	"leather-cap": HardHat,
	"iron-helmet": HardHat,
	"iron-shield": ShieldCheck,
	"tower-shield": ShieldHalf,
	"plate-armor": Shirt,
	"dragon-mail": DragonMailIcon,
	"steel-helmet": HardHat,
	"runic-helmet": Crown,
	"scholar-robe": Shirt,
};
const isRingKind = (kind: ItemKind): kind is RingKind =>
	ITEM_DEFINITIONS[kind].type === "ring";
const ItemIcon = ({ kind }: { kind: ItemKind }) => {
	if (isPotionKind(kind)) return <PotionIcon kind={kind} />;
	if (isRingKind(kind)) return <RingIcon kind={kind} />;
	const Icon = isBookKind(kind) ? BookOpen : icons[kind];
	return (
		<Icon
			aria-hidden="true"
			focusable="false"
			className={`size-full ${kind.startsWith("book-") ? "text-violet-700 dark:text-violet-300" : kind === "cure" ? "text-item-ember" : kind === "exit-scroll" ? "text-item-cure" : "text-item-gear"}`}
		/>
	);
};
export default ItemIcon;
