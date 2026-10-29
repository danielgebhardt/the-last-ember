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
import BloodrageAxeIcon from "./BloodrageAxeIcon";
import DragonMailIcon from "./DragonMailIcon";
import EmberIcon from "./EmberIcon";
import ExitScrollIcon from "./ExitScrollIcon";
import GoldboundBladeIcon from "./GoldboundBladeIcon";
import HungeringBladeIcon from "./HungeringBladeIcon";
import PotionIcon from "./PotionIcon";
import RingIcon from "./RingIcon";
import RingOfDisplacementIcon from "./RingOfDisplacementIcon";
import SeersCircletIcon from "./SeersCircletIcon";
import ShadowweaveCloakIcon from "./ShadowweaveCloakIcon";
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
	"goldbound-blade": GoldboundBladeIcon,
	"bloodrage-axe": BloodrageAxeIcon,
	"hungering-blade": HungeringBladeIcon,
	"shadowweave-cloak": ShadowweaveCloakIcon,
	"seers-circlet": SeersCircletIcon,
	// Placeholders until drawn icons exist.
	"emberscale-mail": Shirt,
	"juggernaut-bulwark": ShieldCheck,
	broodfang: Sword,
	"lich-crown": Crown,
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
// Rare equipment carries its own developer-chosen colors; everything else uses its type's.
const KIND_COLORS: Partial<Record<ItemKind, string>> = {
	"goldbound-blade": "text-[#a96e00] dark:text-[#ffd166]",
	"bloodrage-axe": "text-[#9a1831] dark:text-[#e04a65]",
	"hungering-blade": "text-[#8f2031] dark:text-[#d85a68]",
	"shadowweave-cloak": "text-[#6f57a8] dark:text-[#b7a2db]",
	"seers-circlet": "text-[#2f8f98] dark:text-[#82d7db]",
	"ring-of-displacement": "text-[#7b8798] dark:text-[#d7deeb]",
};
const isRingKind = (kind: ItemKind): kind is RingKind =>
	ITEM_DEFINITIONS[kind].type === "ring";
// Rare rings with their own artwork; other rings share the lettered ring.
const RING_ICONS: Partial<
	Record<RingKind, ComponentType<SVGProps<SVGSVGElement>>>
> = {
	"ring-of-displacement": RingOfDisplacementIcon,
};
const ItemIcon = ({ kind }: { kind: ItemKind }) => {
	if (isPotionKind(kind)) return <PotionIcon kind={kind} />;
	const Icon = isRingKind(kind)
		? RING_ICONS[kind]
		: isBookKind(kind)
			? BookOpen
			: icons[kind];
	if (!Icon) return <RingIcon kind={kind} />;
	return (
		<Icon
			aria-hidden="true"
			focusable="false"
			className={`size-full ${KIND_COLORS[kind] ?? (kind.startsWith("book-") ? "text-violet-700 dark:text-violet-300" : kind === "cure" ? "text-item-ember" : kind === "exit-scroll" ? "text-item-cure" : "text-item-gear")}`}
		/>
	);
};
export default ItemIcon;
