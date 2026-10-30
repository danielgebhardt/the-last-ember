import { MONSTER_DEFINITIONS } from "../../domain/monsters/Monster";
import type { MonsterKind } from "../../domain/monsters/Monster.ts";
import { type FullColorIcon, fullColor } from "../icons/FullColorIcon";
import { AlarmSentryDark, AlarmSentryLight } from "./art/AlarmSentryArt";
import { BoneLichDark, BoneLichLight } from "./art/BoneLichArt";
import { BroodmotherDark, BroodmotherLight } from "./art/BroodmotherArt";
import { CultistDark, CultistLight } from "./art/CultistArt";
import { DemonWardenDark, DemonWardenLight } from "./art/DemonWardenArt";
import { DungeonBruteDark, DungeonBruteLight } from "./art/DungeonBruteArt";
import { EmberWardenDark, EmberWardenLight } from "./art/EmberWardenArt";
import { FrostGiantDark, FrostGiantLight } from "./art/FrostGiantArt";
import { GiantRatDark, GiantRatLight } from "./art/GiantRatArt";
import { GiantSpiderDark, GiantSpiderLight } from "./art/GiantSpiderArt";
import { GoblinArcherDark, GoblinArcherLight } from "./art/GoblinArcherArt";
import { GoblinDark, GoblinLight } from "./art/GoblinArt";
import { HexweaverDark, HexweaverLight } from "./art/HexweaverArt";
import { HornedChargerDark, HornedChargerLight } from "./art/HornedChargerArt";
import { IronChampionDark, IronChampionLight } from "./art/IronChampionArt";
import {
	IronJuggernautDark,
	IronJuggernautLight,
} from "./art/IronJuggernautArt";
import { KoboldSlingerDark, KoboldSlingerLight } from "./art/KoboldSlingerArt";
import { ManaLeechDark, ManaLeechLight } from "./art/ManaLeechArt";
import { NecromancerDark, NecromancerLight } from "./art/NecromancerArt";
import { OgreDark, OgreLight } from "./art/OgreArt";
import { OrcDark, OrcLight } from "./art/OrcArt";
import { PlagueRatDark, PlagueRatLight } from "./art/PlagueRatArt";
import { PyreLordDark, PyreLordLight } from "./art/PyreLordArt";
import { ReflectionDark, ReflectionLight } from "./art/ReflectionArt";
import { SalamanderDark, SalamanderLight } from "./art/SalamanderArt";
import { ShadowStalkerDark, ShadowStalkerLight } from "./art/ShadowStalkerArt";
import { SkeletonDark, SkeletonLight } from "./art/SkeletonArt";
import { SoulWraithDark, SoulWraithLight } from "./art/SoulWraithArt";
import { SpiderlingDark, SpiderlingLight } from "./art/SpiderlingArt";
import { StoneGolemDark, StoneGolemLight } from "./art/StoneGolemArt";
import { TreasureMimicDark, TreasureMimicLight } from "./art/TreasureMimicArt";
import { TreasureThiefDark, TreasureThiefLight } from "./art/TreasureThiefArt";
import { TrollDark, TrollLight } from "./art/TrollArt";
import { WolfDark, WolfLight } from "./art/WolfArt";
import { WraithDark, WraithLight } from "./art/WraithArt";
import { WyvernDark, WyvernLight } from "./art/WyvernArt";
import { ZombieDark, ZombieLight } from "./art/ZombieArt";

export const MONSTER_VISUALS: Record<
	MonsterKind,
	{
		icon: FullColorIcon;
		label: string;
	}
> = {
	"iron-champion": {
		icon: fullColor(IronChampionLight, IronChampionDark),
		label: MONSTER_DEFINITIONS["iron-champion"].name,
	},
	"pyre-lord": {
		icon: fullColor(PyreLordLight, PyreLordDark),
		label: MONSTER_DEFINITIONS["pyre-lord"].name,
	},
	"iron-juggernaut": {
		icon: fullColor(IronJuggernautLight, IronJuggernautDark),
		label: MONSTER_DEFINITIONS["iron-juggernaut"].name,
	},
	broodmother: {
		icon: fullColor(BroodmotherLight, BroodmotherDark),
		label: MONSTER_DEFINITIONS.broodmother.name,
	},
	"bone-lich": {
		icon: fullColor(BoneLichLight, BoneLichDark),
		label: MONSTER_DEFINITIONS["bone-lich"].name,
	},
	spiderling: {
		icon: fullColor(SpiderlingLight, SpiderlingDark),
		label: MONSTER_DEFINITIONS.spiderling.name,
	},
	"treasure-mimic": {
		icon: fullColor(TreasureMimicLight, TreasureMimicDark),
		label: MONSTER_DEFINITIONS["treasure-mimic"].name,
	},
	"treasure-thief": {
		icon: fullColor(TreasureThiefLight, TreasureThiefDark),
		label: MONSTER_DEFINITIONS["treasure-thief"].name,
	},
	"alarm-sentry": {
		icon: fullColor(AlarmSentryLight, AlarmSentryDark),
		label: MONSTER_DEFINITIONS["alarm-sentry"].name,
	},
	"horned-charger": {
		icon: fullColor(HornedChargerLight, HornedChargerDark),
		label: MONSTER_DEFINITIONS["horned-charger"].name,
	},
	goblin: {
		icon: fullColor(GoblinLight, GoblinDark),
		label: MONSTER_DEFINITIONS.goblin.name,
	},
	"goblin-archer": {
		icon: fullColor(GoblinArcherLight, GoblinArcherDark),
		label: MONSTER_DEFINITIONS["goblin-archer"].name,
	},
	"dungeon-brute": {
		icon: fullColor(DungeonBruteLight, DungeonBruteDark),
		label: MONSTER_DEFINITIONS["dungeon-brute"].name,
	},
	"giant-rat": {
		icon: fullColor(GiantRatLight, GiantRatDark),
		label: MONSTER_DEFINITIONS["giant-rat"].name,
	},
	hexweaver: {
		icon: fullColor(HexweaverLight, HexweaverDark),
		label: MONSTER_DEFINITIONS.hexweaver.name,
	},
	"shadow-stalker": {
		icon: fullColor(ShadowStalkerLight, ShadowStalkerDark),
		label: MONSTER_DEFINITIONS["shadow-stalker"].name,
	},
	"mana-leech": {
		icon: fullColor(ManaLeechLight, ManaLeechDark),
		label: MONSTER_DEFINITIONS["mana-leech"].name,
	},
	"plague-rat": {
		icon: fullColor(PlagueRatLight, PlagueRatDark),
		label: MONSTER_DEFINITIONS["plague-rat"].name,
	},
	orc: {
		icon: fullColor(OrcLight, OrcDark),
		label: MONSTER_DEFINITIONS.orc.name,
	},
	skeleton: {
		icon: fullColor(SkeletonLight, SkeletonDark),
		label: MONSTER_DEFINITIONS.skeleton.name,
	},
	zombie: {
		icon: fullColor(ZombieLight, ZombieDark),
		label: MONSTER_DEFINITIONS.zombie.name,
	},
	wolf: {
		icon: fullColor(WolfLight, WolfDark),
		label: MONSTER_DEFINITIONS.wolf.name,
	},
	"kobold-slinger": {
		icon: fullColor(KoboldSlingerLight, KoboldSlingerDark),
		label: MONSTER_DEFINITIONS["kobold-slinger"].name,
	},
	spider: {
		icon: fullColor(GiantSpiderLight, GiantSpiderDark),
		label: MONSTER_DEFINITIONS.spider.name,
	},
	ogre: {
		icon: fullColor(OgreLight, OgreDark),
		label: MONSTER_DEFINITIONS.ogre.name,
	},
	troll: {
		icon: fullColor(TrollLight, TrollDark),
		label: MONSTER_DEFINITIONS.troll.name,
	},
	cultist: {
		icon: fullColor(CultistLight, CultistDark),
		label: MONSTER_DEFINITIONS.cultist.name,
	},
	"stone-golem": {
		icon: fullColor(StoneGolemLight, StoneGolemDark),
		label: MONSTER_DEFINITIONS["stone-golem"].name,
	},
	wraith: {
		icon: fullColor(WraithLight, WraithDark),
		label: MONSTER_DEFINITIONS.wraith.name,
	},
	wyvern: {
		icon: fullColor(WyvernLight, WyvernDark),
		label: MONSTER_DEFINITIONS.wyvern.name,
	},
	salamander: {
		icon: fullColor(SalamanderLight, SalamanderDark),
		label: MONSTER_DEFINITIONS.salamander.name,
	},
	"frost-giant": {
		icon: fullColor(FrostGiantLight, FrostGiantDark),
		label: MONSTER_DEFINITIONS["frost-giant"].name,
	},
	"ember-warden": {
		icon: fullColor(EmberWardenLight, EmberWardenDark),
		label: MONSTER_DEFINITIONS["ember-warden"].name,
	},
	reflection: {
		icon: fullColor(ReflectionLight, ReflectionDark),
		label: MONSTER_DEFINITIONS.reflection.name,
	},
	"soul-wraith": {
		icon: fullColor(SoulWraithLight, SoulWraithDark),
		label: MONSTER_DEFINITIONS["soul-wraith"].name,
	},
	necromancer: {
		icon: fullColor(NecromancerLight, NecromancerDark),
		label: MONSTER_DEFINITIONS.necromancer.name,
	},
	"demon-warden": {
		icon: fullColor(DemonWardenLight, DemonWardenDark),
		label: MONSTER_DEFINITIONS["demon-warden"].name,
	},
};
