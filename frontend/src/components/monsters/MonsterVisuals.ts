import { Flame, Rat, Shield } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { MONSTER_DEFINITIONS } from "../../domain/monsters/Monster";
import type { MonsterKind } from "../../domain/monsters/Monster.ts";
import BruteIcon from "./BruteIcon";
import ChampionIcon from "./ChampionIcon";
import ChargerIcon from "./ChargerIcon";
import CultistIcon from "./CultistIcon";
import EmberWardenIcon from "./EmberWardenIcon";
import FrostGiantIcon from "./FrostGiantIcon";
import GoblinArcherIcon from "./GoblinArcherIcon";
import GoblinIcon from "./GoblinIcon.tsx";
import GolemIcon from "./GolemIcon";
import HexweaverIcon from "./HexweaverIcon";
import KoboldSlingerIcon from "./KoboldSlingerIcon";
import ManaLeechIcon from "./ManaLeechIcon";
import NecromancerIcon from "./NecromancerIcon";
import OgreIcon from "./OgreIcon";
import OrcIcon from "./OrcIcon";
import PlagueRatIcon from "./PlagueRatIcon";
import ReflectionIcon from "./ReflectionIcon";
import SalamanderIcon from "./SalamanderIcon";
import SentryIcon from "./SentryIcon";
import ShadowStalkerIcon from "./ShadowStalkerIcon";
import SkeletonIcon from "./SkeletonIcon";
import SoulWraithIcon from "./SoulWraithIcon";
import SpiderIcon from "./SpiderIcon";
import TreasureMimicIcon from "./TreasureMimicIcon";
import TreasureThiefIcon from "./TreasureThiefIcon";
import TrollIcon from "./TrollIcon";
import WardenIcon from "./WardenIcon";
import WolfIcon from "./WolfIcon";
import WraithIcon from "./WraithIcon";
import WyvernIcon from "./WyvernIcon";
import ZombieIcon from "./ZombieIcon";

export const MONSTER_VISUALS: Record<
	MonsterKind,
	{
		icon: ComponentType<SVGProps<SVGSVGElement>>;
		color: string;
		label: string;
	}
> = {
	"iron-champion": {
		icon: ChampionIcon,
		color: "text-monster-rust",
		label: MONSTER_DEFINITIONS["iron-champion"].name,
	},
	// Placeholders until drawn icons exist.
	"pyre-lord": {
		icon: Flame,
		color: "text-[#c2410c] dark:text-[#fb923c]",
		label: MONSTER_DEFINITIONS["pyre-lord"].name,
	},
	"iron-juggernaut": {
		icon: Shield,
		color: "text-[#57534e] dark:text-[#d6d3d1]",
		label: MONSTER_DEFINITIONS["iron-juggernaut"].name,
	},
	"treasure-mimic": {
		icon: TreasureMimicIcon,
		color: "text-[#99622e] dark:text-[#d9a472]",
		label: MONSTER_DEFINITIONS["treasure-mimic"].name,
	},
	"treasure-thief": {
		icon: TreasureThiefIcon,
		color: "text-[#4f7d2e] dark:text-[#8fc86a]",
		label: MONSTER_DEFINITIONS["treasure-thief"].name,
	},
	"alarm-sentry": {
		icon: SentryIcon,
		color: "text-monster-cyan",
		label: MONSTER_DEFINITIONS["alarm-sentry"].name,
	},
	"horned-charger": {
		icon: ChargerIcon,
		color: "text-monster-ember",
		label: MONSTER_DEFINITIONS["horned-charger"].name,
	},
	goblin: {
		icon: GoblinIcon,
		color: "text-monster-moss",
		label: MONSTER_DEFINITIONS.goblin.name,
	},
	"goblin-archer": {
		icon: GoblinArcherIcon,
		color: "text-monster-moss",
		label: MONSTER_DEFINITIONS["goblin-archer"].name,
	},
	"dungeon-brute": {
		icon: BruteIcon,
		color: "text-monster-rust",
		label: MONSTER_DEFINITIONS["dungeon-brute"].name,
	},
	"giant-rat": {
		icon: Rat,
		color: "text-monster-ember",
		label: MONSTER_DEFINITIONS["giant-rat"].name,
	},
	hexweaver: {
		icon: HexweaverIcon,
		color: "text-monster-hex",
		label: MONSTER_DEFINITIONS.hexweaver.name,
	},
	"shadow-stalker": {
		icon: ShadowStalkerIcon,
		color: "text-monster-shadow",
		label: MONSTER_DEFINITIONS["shadow-stalker"].name,
	},
	"mana-leech": {
		icon: ManaLeechIcon,
		color: "text-monster-azure",
		label: MONSTER_DEFINITIONS["mana-leech"].name,
	},
	"plague-rat": {
		icon: PlagueRatIcon,
		color: "text-monster-blight",
		label: MONSTER_DEFINITIONS["plague-rat"].name,
	},
	orc: {
		icon: OrcIcon,
		color: "text-monster-ochre",
		label: MONSTER_DEFINITIONS.orc.name,
	},
	skeleton: {
		icon: SkeletonIcon,
		color: "text-monster-bone",
		label: MONSTER_DEFINITIONS.skeleton.name,
	},
	zombie: {
		icon: ZombieIcon,
		color: "text-monster-teal",
		label: MONSTER_DEFINITIONS.zombie.name,
	},
	wolf: {
		icon: WolfIcon,
		color: "text-monster-bone",
		label: MONSTER_DEFINITIONS.wolf.name,
	},
	"kobold-slinger": {
		icon: KoboldSlingerIcon,
		color: "text-monster-cyan",
		label: MONSTER_DEFINITIONS["kobold-slinger"].name,
	},
	spider: {
		icon: SpiderIcon,
		color: "text-monster-rose",
		label: MONSTER_DEFINITIONS.spider.name,
	},
	ogre: {
		icon: OgreIcon,
		color: "text-monster-rust",
		label: MONSTER_DEFINITIONS.ogre.name,
	},
	troll: {
		icon: TrollIcon,
		color: "text-monster-moss",
		label: MONSTER_DEFINITIONS.troll.name,
	},
	cultist: {
		icon: CultistIcon,
		color: "text-monster-violet",
		label: MONSTER_DEFINITIONS.cultist.name,
	},
	"stone-golem": {
		icon: GolemIcon,
		color: "text-monster-rust",
		label: MONSTER_DEFINITIONS["stone-golem"].name,
	},
	wraith: {
		icon: WraithIcon,
		color: "text-monster-spectral",
		label: MONSTER_DEFINITIONS.wraith.name,
	},
	wyvern: {
		icon: WyvernIcon,
		color: "text-monster-violet",
		label: MONSTER_DEFINITIONS.wyvern.name,
	},
	salamander: {
		icon: SalamanderIcon,
		color: "text-monster-ember",
		label: MONSTER_DEFINITIONS.salamander.name,
	},
	"frost-giant": {
		icon: FrostGiantIcon,
		color: "text-monster-cyan",
		label: MONSTER_DEFINITIONS["frost-giant"].name,
	},
	"ember-warden": {
		icon: EmberWardenIcon,
		color: "text-item-gear",
		label: MONSTER_DEFINITIONS["ember-warden"].name,
	},
	reflection: {
		icon: ReflectionIcon,
		color: "text-monster-shadow",
		label: MONSTER_DEFINITIONS.reflection.name,
	},
	"soul-wraith": {
		icon: SoulWraithIcon,
		color: "text-monster-soul",
		label: MONSTER_DEFINITIONS["soul-wraith"].name,
	},
	necromancer: {
		icon: NecromancerIcon,
		color: "text-monster-violet",
		label: MONSTER_DEFINITIONS.necromancer.name,
	},
	"demon-warden": {
		icon: WardenIcon,
		color: "text-monster-rose",
		label: MONSTER_DEFINITIONS["demon-warden"].name,
	},
};
