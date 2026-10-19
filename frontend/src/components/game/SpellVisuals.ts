import type { ComponentType, SVGProps } from "react";
import type { SpellKind } from "../../domain/game/Spells";
import BlinkIcon from "./BlinkIcon";
import DexterityIcon from "./DexterityIcon";
import DrainLifeIcon from "./DrainLifeIcon";
import EmberBoltIcon from "./EmberBoltIcon";
import FearIcon from "./FearIcon";
import FireballIcon from "./FireballIcon";
import FrostBoltIcon from "./FrostBoltIcon";
import FrostNovaIcon from "./FrostNovaIcon";
import HealIcon from "./HealIcon";
import MagicMissileIcon from "./MagicMissileIcon";
import PoisonDartIcon from "./PoisonDartIcon";
import ProtectionIcon from "./ProtectionIcon";
import RenewalIcon from "./RenewalIcon";
import ShockIcon from "./ShockIcon";
import SleepIcon from "./SleepIcon";
import SonicSpearIcon from "./SonicSpearIcon";
import StoneLanceIcon from "./StoneLanceIcon";
import StrengthIcon from "./StrengthIcon";
import TeleportAwayIcon from "./TeleportAwayIcon";
import WebIcon from "./WebIcon";

export const SPELL_ICONS = {
	"magic-missile": MagicMissileIcon,
	heal: HealIcon,
	"ember-bolt": EmberBoltIcon,
	"frost-bolt": FrostBoltIcon,
	shock: ShockIcon,
	"stone-lance": StoneLanceIcon,
	"sonic-spear": SonicSpearIcon,
	"drain-life": DrainLifeIcon,
	web: WebIcon,
	sleep: SleepIcon,
	fear: FearIcon,
	"poison-dart": PoisonDartIcon,
	renewal: RenewalIcon,
	fireball: FireballIcon,
	"frost-nova": FrostNovaIcon,
	blink: BlinkIcon,
	"teleport-away": TeleportAwayIcon,
	protection: ProtectionIcon,
	strength: StrengthIcon,
	dexterity: DexterityIcon,
} satisfies Record<SpellKind, ComponentType<SVGProps<SVGSVGElement>>>;

export const SPELL_ICON_COLORS: Record<SpellKind, string> = {
	"frost-bolt": "text-spell-frost-bolt",
	shock: "text-spell-shock",
	"sonic-spear": "text-spell-sonic-spear",
	web: "text-spell-web",
	fear: "text-spell-fear",
	"poison-dart": "text-spell-poison-dart",
	fireball: "text-spell-fire",
	protection: "text-spell-protection",
	heal: "text-spell-heal",
	sleep: "text-spell-sleep",
	renewal: "text-spell-renewal",
	"frost-nova": "text-spell-frost-nova",
	blink: "text-spell-blink",
	strength: "text-spell-strength",
	dexterity: "text-spell-dexterity",

	"ember-bolt": "text-spell-fire",
	"stone-lance": "text-spell-stone-lance",
	"drain-life": "text-spell-drain-life",
	"teleport-away": "text-spell-teleport-away",
	"magic-missile": "text-spell-magic-missile",
};

export const spellIconColor = (spell: SpellKind): string =>
	SPELL_ICON_COLORS[spell];
