import { objectAvailable } from "../../domain/merchant/MerchantAvailability";
import {
	type DungeonObject,
	type DungeonObjectKind,
	isDoor,
} from "../../domain/objects/DungeonObject";
import {
	FullColor,
	type FullColorIcon,
	fullColor,
} from "../icons/FullColorIcon";
import {
	AbandonedSpellArchiveDark,
	AbandonedSpellArchiveLight,
} from "./art/AbandonedSpellArchiveArt";
import {
	AncientFountainDark,
	AncientFountainLight,
} from "./art/AncientFountainArt";
import {
	AncientSarcophagusDark,
	AncientSarcophagusLight,
	AncientSarcophagusOpenedDark,
	AncientSarcophagusOpenedLight,
} from "./art/AncientSarcophagusArt";
import { ArenaExitDark, ArenaExitLight } from "./art/ArenaExitArt";
import { ArenaGateDark, ArenaGateLight } from "./art/ArenaGateArt";
import { CrackedWallDark, CrackedWallLight } from "./art/CrackedWallArt";
import { DarkAltarDark, DarkAltarLight } from "./art/DarkAltarArt";
import {
	DoorDark,
	DoorLight,
	DoorOpenDark,
	DoorOpenLight,
} from "./art/DoorArt";
import { EggSacDark, EggSacLight } from "./art/EggSacArt";
import {
	EliteChamberGateDark,
	EliteChamberGateLight,
	EliteChamberGateOpenDark,
	EliteChamberGateOpenLight,
} from "./art/EliteChamberGateArt";
import {
	ForgottenForgeDark,
	ForgottenForgeLight,
	ForgottenForgeSpentDark,
	ForgottenForgeSpentLight,
} from "./art/ForgottenForgeArt";
import { ForgottenThroneArt } from "./art/ForgottenThroneArt";
import { GoldDark, GoldLight } from "./art/GoldArt";
import {
	HourglassOfAgesDark,
	HourglassOfAgesLight,
} from "./art/HourglassOfAgesArt";
import {
	MirrorOfShadowsDark,
	MirrorOfShadowsLight,
	MirrorOfShadowsSpentDark,
	MirrorOfShadowsSpentLight,
} from "./art/MirrorOfShadowsArt";
import { PhylacteryDark, PhylacteryLight } from "./art/PhylacteryArt";
import {
	RunicPortalDark,
	RunicPortalLight,
	RunicPortalSpentDark,
	RunicPortalSpentLight,
} from "./art/RunicPortalArt";
import {
	SealedReliquaryDark,
	SealedReliquaryLight,
} from "./art/SealedReliquaryArt";
import {
	ShrineOfInsightDark,
	ShrineOfInsightLight,
} from "./art/ShrineOfInsightArt";
import {
	TreasureChestDark,
	TreasureChestLight,
	TreasureChestOpenedDark,
	TreasureChestOpenedLight,
} from "./art/TreasureChestArt";
import { VictorsRackDark, VictorsRackLight } from "./art/VictorsRackArt";
import { VisibleTrapDark, VisibleTrapLight } from "./art/VisibleTrapArt";
import {
	WanderingPotionMerchantDark,
	WanderingPotionMerchantLight,
} from "./art/WanderingPotionMerchantArt";
import {
	WishingWellDark,
	WishingWellLight,
	WishingWellSpentDark,
	WishingWellSpentLight,
} from "./art/WishingWellArt";

export const OBJECT_ICONS: Record<DungeonObjectKind, FullColorIcon> = {
	sarcophagus: fullColor(AncientSarcophagusLight, AncientSarcophagusDark),
	forge: fullColor(ForgottenForgeLight, ForgottenForgeDark),
	well: fullColor(WishingWellLight, WishingWellDark),
	mirror: fullColor(MirrorOfShadowsLight, MirrorOfShadowsDark),
	hourglass: fullColor(HourglassOfAgesLight, HourglassOfAgesDark),
	"runic-portal": fullColor(RunicPortalLight, RunicPortalDark),
	door: fullColor(DoorLight, DoorDark),
	"elite-door": fullColor(EliteChamberGateLight, EliteChamberGateDark),
	reliquary: fullColor(SealedReliquaryLight, SealedReliquaryDark),
	archive: fullColor(AbandonedSpellArchiveLight, AbandonedSpellArchiveDark),
	gold: fullColor(GoldLight, GoldDark),
	chest: fullColor(TreasureChestLight, TreasureChestDark),
	trap: fullColor(VisibleTrapLight, VisibleTrapDark),
	fountain: fullColor(AncientFountainLight, AncientFountainDark),
	throne: fullColor(ForgottenThroneArt),
	shrine: fullColor(ShrineOfInsightLight, ShrineOfInsightDark),
	"cracked-wall": fullColor(CrackedWallLight, CrackedWallDark),
	"dark-altar": fullColor(DarkAltarLight, DarkAltarDark),
	"arena-gate": fullColor(ArenaGateLight, ArenaGateDark),
	"arena-door": fullColor(ArenaExitLight, ArenaExitDark),
	"arena-reward": fullColor(VictorsRackLight, VictorsRackDark),
	"egg-sac": fullColor(EggSacLight, EggSacDark),
	phylactery: fullColor(PhylacteryLight, PhylacteryDark),
	merchant: fullColor(
		WanderingPotionMerchantLight,
		WanderingPotionMerchantDark,
	),
};
// A separate drawing for a used object; others just dim.
const SPENT_ICONS: Partial<Record<DungeonObjectKind, FullColorIcon>> = {
	door: fullColor(DoorOpenLight, DoorOpenDark),
	"elite-door": fullColor(EliteChamberGateOpenLight, EliteChamberGateOpenDark),
	chest: fullColor(TreasureChestOpenedLight, TreasureChestOpenedDark),
	sarcophagus: fullColor(
		AncientSarcophagusOpenedLight,
		AncientSarcophagusOpenedDark,
	),
	"runic-portal": fullColor(RunicPortalSpentLight, RunicPortalSpentDark),
	mirror: fullColor(MirrorOfShadowsSpentLight, MirrorOfShadowsSpentDark),
	well: fullColor(WishingWellSpentLight, WishingWellSpentDark),
	forge: fullColor(ForgottenForgeSpentLight, ForgottenForgeSpentDark),
};
const DungeonObjectIcon = ({ object }: { object: DungeonObject }) => {
	if (!objectAvailable(object)) return null;
	const icon =
		(object.activated ? SPENT_ICONS[object.kind] : undefined) ??
		OBJECT_ICONS[object.kind];
	// Open doors stay bright: the way through is still in play.
	const dimmed =
		object.activated && !isDoor(object) && object.kind !== "merchant"
			? "opacity-50"
			: "";
	return <FullColor icon={icon} className={dimmed} />;
};
export default DungeonObjectIcon;
