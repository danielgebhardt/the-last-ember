import { ITEM_DEFINITIONS, type ItemKind } from "../../domain/items/Item";
import {
	FullColor,
	type FullColorIcon,
	fullColor,
} from "../icons/FullColorIcon";
import { AntidoteDark, AntidoteLight } from "./art/AntidoteArt";
import { BandagesArt } from "./art/BandagesArt";
import {
	BandOfTheForgottenDark,
	BandOfTheForgottenLight,
} from "./art/BandOfTheForgottenArt";
import { BattleAxeDark, BattleAxeLight } from "./art/BattleAxeArt";
import { BloodrageAxeDark, BloodrageAxeLight } from "./art/BloodrageAxeArt";
import { BroodfangDark, BroodfangLight } from "./art/BroodfangArt";
import { ChainArmorDark, ChainArmorLight } from "./art/ChainArmorArt";
import {
	CleansingPotionDark,
	CleansingPotionLight,
} from "./art/CleansingPotionArt";
import { CopperRingDark, CopperRingLight } from "./art/CopperRingArt";
import {
	CureCurseScrollDark,
	CureCurseScrollLight,
} from "./art/CureCurseScrollArt";
import {
	CureDiseasePotionDark,
	CureDiseasePotionLight,
} from "./art/CureDiseasePotionArt";
import {
	DexterityPotionDark,
	DexterityPotionLight,
} from "./art/DexterityPotionArt";
import { DragonMailDark, DragonMailLight } from "./art/DragonMailArt";
import {
	EmberscaleMailDark,
	EmberscaleMailLight,
} from "./art/EmberscaleMailArt";
import {
	EnchantmentScrollDark,
	EnchantmentScrollLight,
} from "./art/EnchantmentScrollArt";
import {
	GoldboundBladeDark,
	GoldboundBladeLight,
} from "./art/GoldboundBladeArt";
import {
	GreaterHealingPotionDark,
	GreaterHealingPotionLight,
} from "./art/GreaterHealingPotionArt";
import {
	GreaterManaPotionDark,
	GreaterManaPotionLight,
} from "./art/GreaterManaPotionArt";
import { HealingPotionDark, HealingPotionLight } from "./art/HealingPotionArt";
import {
	HungeringBladeDark,
	HungeringBladeLight,
} from "./art/HungeringBladeArt";
import {
	IntelligencePotionDark,
	IntelligencePotionLight,
} from "./art/IntelligencePotionArt";
import { IronHelmetDark, IronHelmetLight } from "./art/IronHelmetArt";
import { IronShieldDark, IronShieldLight } from "./art/IronShieldArt";
import { IronSwordDark, IronSwordLight } from "./art/IronSwordArt";
import {
	JuggernautsBulwarkDark,
	JuggernautsBulwarkLight,
} from "./art/JuggernautsBulwarkArt";
import { LeatherArmorDark, LeatherArmorLight } from "./art/LeatherArmorArt";
import { LeatherCapDark, LeatherCapLight } from "./art/LeatherCapArt";
import { LichsCrownDark, LichsCrownLight } from "./art/LichsCrownArt";
import { ManaPotionDark, ManaPotionLight } from "./art/ManaPotionArt";
import { PlateArmorDark, PlateArmorLight } from "./art/PlateArmorArt";
import {
	RingOfDexterityDark,
	RingOfDexterityLight,
} from "./art/RingOfDexterityArt";
import {
	RingOfDisplacementDark,
	RingOfDisplacementLight,
} from "./art/RingOfDisplacementArt";
import {
	RingOfIntelligenceDark,
	RingOfIntelligenceLight,
} from "./art/RingOfIntelligenceArt";
import { RingOfManaDark, RingOfManaLight } from "./art/RingOfManaArt";
import {
	RingOfStrengthDark,
	RingOfStrengthLight,
} from "./art/RingOfStrengthArt";
import {
	RingOfVitalityDark,
	RingOfVitalityLight,
} from "./art/RingOfVitalityArt";
import { RunebladeDark, RunebladeLight } from "./art/RunebladeArt";
import { RunicHelmetDark, RunicHelmetLight } from "./art/RunicHelmetArt";
import { ScholarRobeDark, ScholarRobeLight } from "./art/ScholarRobeArt";
import { SeersCircletDark, SeersCircletLight } from "./art/SeersCircletArt";
import {
	ShadowweaveCloakDark,
	ShadowweaveCloakLight,
} from "./art/ShadowweaveCloakArt";
import { ShortSwordDark, ShortSwordLight } from "./art/ShortSwordArt";
import {
	SoulRestorationPotionDark,
	SoulRestorationPotionLight,
} from "./art/SoulRestorationPotionArt";
import { SpellbookDark, SpellbookLight } from "./art/SpellbookArt";
import {
	SpellguardShieldDark,
	SpellguardShieldLight,
} from "./art/SpellguardShieldArt";
import {
	StarforgedBladeDark,
	StarforgedBladeLight,
} from "./art/StarforgedBladeArt";
import { SteelHelmetDark, SteelHelmetLight } from "./art/SteelHelmetArt";
import { SteelSwordDark, SteelSwordLight } from "./art/SteelSwordArt";
import {
	StrengthPotionDark,
	StrengthPotionLight,
} from "./art/StrengthPotionArt";
import { TowerShieldDark, TowerShieldLight } from "./art/TowerShieldArt";
import {
	TownPortalScrollDark,
	TownPortalScrollLight,
} from "./art/TownPortalScrollArt";
import { WardensFlameDark, WardensFlameLight } from "./art/WardensFlameArt";
import { WardingCloakDark, WardingCloakLight } from "./art/WardingCloakArt";
import { WoodenShieldDark, WoodenShieldLight } from "./art/WoodenShieldArt";

type BookKind = Extract<ItemKind, `book-${string}`>;
const isBookKind = (kind: ItemKind): kind is BookKind =>
	ITEM_DEFINITIONS[kind].type === "spellbook";
// Every spellbook shares one drawing; its name says which spell it teaches.
const spellbook = fullColor(SpellbookLight, SpellbookDark);
const icons: Record<Exclude<ItemKind, BookKind>, FullColorIcon> = {
	antidote: fullColor(AntidoteLight, AntidoteDark),
	bandages: fullColor(BandagesArt),
	"battle-axe": fullColor(BattleAxeLight, BattleAxeDark),
	"bloodrage-axe": fullColor(BloodrageAxeLight, BloodrageAxeDark),
	broodfang: fullColor(BroodfangLight, BroodfangDark),
	"chain-armor": fullColor(ChainArmorLight, ChainArmorDark),
	"cleansing-potion": fullColor(CleansingPotionLight, CleansingPotionDark),
	"copper-ring": fullColor(CopperRingLight, CopperRingDark),
	"cure-disease-potion": fullColor(
		CureDiseasePotionLight,
		CureDiseasePotionDark,
	),
	cure: fullColor(WardensFlameLight, WardensFlameDark),
	"dexterity-potion": fullColor(DexterityPotionLight, DexterityPotionDark),
	"dragon-mail": fullColor(DragonMailLight, DragonMailDark),
	"emberscale-mail": fullColor(EmberscaleMailLight, EmberscaleMailDark),
	"enchantment-scroll": fullColor(
		EnchantmentScrollLight,
		EnchantmentScrollDark,
	),
	"exit-scroll": fullColor(TownPortalScrollLight, TownPortalScrollDark),
	"goldbound-blade": fullColor(GoldboundBladeLight, GoldboundBladeDark),
	"greater-healing-potion": fullColor(
		GreaterHealingPotionLight,
		GreaterHealingPotionDark,
	),
	"greater-mana-potion": fullColor(
		GreaterManaPotionLight,
		GreaterManaPotionDark,
	),
	"healing-potion": fullColor(HealingPotionLight, HealingPotionDark),
	"hungering-blade": fullColor(HungeringBladeLight, HungeringBladeDark),
	"intelligence-potion": fullColor(
		IntelligencePotionLight,
		IntelligencePotionDark,
	),
	"iron-helmet": fullColor(IronHelmetLight, IronHelmetDark),
	"iron-shield": fullColor(IronShieldLight, IronShieldDark),
	"iron-sword": fullColor(IronSwordLight, IronSwordDark),
	"juggernaut-bulwark": fullColor(
		JuggernautsBulwarkLight,
		JuggernautsBulwarkDark,
	),
	"leather-armor": fullColor(LeatherArmorLight, LeatherArmorDark),
	"leather-cap": fullColor(LeatherCapLight, LeatherCapDark),
	"lich-crown": fullColor(LichsCrownLight, LichsCrownDark),
	"mana-potion": fullColor(ManaPotionLight, ManaPotionDark),
	"plate-armor": fullColor(PlateArmorLight, PlateArmorDark),
	"relic-band": fullColor(BandOfTheForgottenLight, BandOfTheForgottenDark),
	"remove-curse-scroll": fullColor(CureCurseScrollLight, CureCurseScrollDark),
	"ring-dexterity": fullColor(RingOfDexterityLight, RingOfDexterityDark),
	"ring-intelligence": fullColor(
		RingOfIntelligenceLight,
		RingOfIntelligenceDark,
	),
	"ring-mana": fullColor(RingOfManaLight, RingOfManaDark),
	"ring-of-displacement": fullColor(
		RingOfDisplacementLight,
		RingOfDisplacementDark,
	),
	"ring-strength": fullColor(RingOfStrengthLight, RingOfStrengthDark),
	"ring-vitality": fullColor(RingOfVitalityLight, RingOfVitalityDark),
	runeblade: fullColor(RunebladeLight, RunebladeDark),
	"runic-helmet": fullColor(RunicHelmetLight, RunicHelmetDark),
	"scholar-robe": fullColor(ScholarRobeLight, ScholarRobeDark),
	"seers-circlet": fullColor(SeersCircletLight, SeersCircletDark),
	"shadowweave-cloak": fullColor(ShadowweaveCloakLight, ShadowweaveCloakDark),
	"short-sword": fullColor(ShortSwordLight, ShortSwordDark),
	"soul-restoration-potion": fullColor(
		SoulRestorationPotionLight,
		SoulRestorationPotionDark,
	),
	"spellguard-shield": fullColor(SpellguardShieldLight, SpellguardShieldDark),
	"star-forged-blade": fullColor(StarforgedBladeLight, StarforgedBladeDark),
	"steel-helmet": fullColor(SteelHelmetLight, SteelHelmetDark),
	"steel-sword": fullColor(SteelSwordLight, SteelSwordDark),
	"strength-potion": fullColor(StrengthPotionLight, StrengthPotionDark),
	"tower-shield": fullColor(TowerShieldLight, TowerShieldDark),
	"warding-cloak": fullColor(WardingCloakLight, WardingCloakDark),
	"wooden-shield": fullColor(WoodenShieldLight, WoodenShieldDark),
};
const ItemIcon = ({ kind }: { kind: ItemKind }) => (
	<FullColor icon={isBookKind(kind) ? spellbook : icons[kind]} />
);
export default ItemIcon;
