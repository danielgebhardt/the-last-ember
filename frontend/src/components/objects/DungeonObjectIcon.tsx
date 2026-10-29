import {
	Coins,
	DoorClosed,
	DoorClosedLocked,
	DoorOpen,
	Flame,
	Gem,
	Hourglass,
	Landmark,
	LibraryBig,
	Skull,
	Swords,
	TriangleAlert,
	Trophy,
} from "lucide-react";
import { objectAvailable } from "../../domain/merchant/MerchantAvailability";
import type {
	DungeonObject,
	DungeonObjectKind,
} from "../../domain/objects/DungeonObject";
import {
	FullColor,
	isFullColor,
	type RegisteredIcon,
} from "../icons/FullColorIcon";
import CrackedWallIcon from "./CrackedWallIcon";
import EggSacIcon from "./EggSacIcon";
import ForgeIcon from "./ForgeIcon";
import FountainIcon from "./FountainIcon";
import MerchantIcon from "./MerchantIcon";
import MirrorIcon from "./MirrorIcon";
import PhylacteryIcon from "./PhylacteryIcon";
import RunicPortalIcon from "./RunicPortalIcon";
import SarcophagusIcon from "./SarcophagusIcon";
import ThroneIcon from "./ThroneIcon";
import TreasureChestIcon, {
	OpenedTreasureChestIcon,
} from "./TreasureChestIcon";
import WellIcon from "./WellIcon";

const icons: Record<
	Exclude<DungeonObjectKind, "elite-door" | "merchant">,
	RegisteredIcon
> = {
	sarcophagus: SarcophagusIcon,
	forge: ForgeIcon,
	well: WellIcon,
	mirror: MirrorIcon,
	hourglass: Hourglass,
	"runic-portal": RunicPortalIcon,
	door: DoorClosed,
	reliquary: Gem,
	archive: LibraryBig,
	gold: Coins,
	chest: TreasureChestIcon,
	trap: TriangleAlert,
	fountain: FountainIcon,
	throne: ThroneIcon,
	shrine: Landmark,
	"cracked-wall": CrackedWallIcon,
	// Placeholder until a drawn icon exists.
	"dark-altar": Flame,
	"arena-gate": Swords,
	"arena-door": DoorClosedLocked,
	"arena-reward": Trophy,
	"egg-sac": EggSacIcon,
	phylactery: PhylacteryIcon,
};
// A separate drawing for a used object, single- or full-colour; others just dim.
const SPENT_ICONS: Partial<Record<DungeonObjectKind, RegisteredIcon>> = {
	door: DoorOpen,
	chest: OpenedTreasureChestIcon,
};
// The arena features share their miniboss's color.
const OBJECT_COLORS: Partial<Record<DungeonObjectKind, string>> = {
	trap: "text-destructive",
	gold: "text-item-gear",
	"egg-sac": "text-[#89558b] dark:text-[#bf85bd]",
	phylactery: "text-[#477c85] dark:text-[#b2d1d5]",
};
const DungeonObjectIcon = ({ object }: { object: DungeonObject }) => {
	if (!objectAvailable(object)) return null;
	if (object.kind === "sarcophagus")
		return (
			<SarcophagusIcon
				opened={object.activated}
				aria-hidden="true"
				focusable="false"
				className={`size-full text-object-stone ${object.activated ? "opacity-50" : ""}`}
			/>
		);
	if (object.kind === "runic-portal")
		return (
			<RunicPortalIcon
				spent={object.activated}
				aria-hidden="true"
				focusable="false"
				className={`size-full text-object-stone ${object.activated ? "opacity-50" : ""}`}
			/>
		);
	if (object.kind === "mirror")
		return (
			<MirrorIcon
				spent={object.activated}
				aria-hidden="true"
				focusable="false"
				className={`size-full text-object-stone ${object.activated ? "opacity-50" : ""}`}
			/>
		);
	if (object.kind === "well")
		return (
			<WellIcon
				spent={object.activated}
				aria-hidden="true"
				focusable="false"
				className={`size-full text-object-stone ${object.activated ? "opacity-50" : ""}`}
			/>
		);
	if (object.kind === "forge")
		return (
			<ForgeIcon
				spent={object.activated}
				aria-hidden="true"
				focusable="false"
				className={`size-full text-object-stone ${object.activated ? "opacity-50" : ""}`}
			/>
		);
	if (object.kind === "merchant") return <MerchantIcon />;
	if (object.kind === "elite-door") {
		const Gate = object.activated ? DoorOpen : DoorClosed;
		return (
			<span className="relative block size-full text-map-threat">
				<Gate aria-hidden="true" className="size-full" />
				<Skull
					aria-hidden="true"
					className="absolute left-1/4 top-1/4 size-1/2"
				/>
			</span>
		);
	}
	const Icon =
		(object.activated ? SPENT_ICONS[object.kind] : undefined) ??
		icons[object.kind];
	const dimmed = object.activated && object.kind !== "door" ? "opacity-50" : "";
	if (isFullColor(Icon)) return <FullColor icon={Icon} className={dimmed} />;
	return (
		<Icon
			aria-hidden="true"
			focusable="false"
			className={`size-full ${dimmed} ${OBJECT_COLORS[object.kind] ?? "text-object-stone"}`}
		/>
	);
};
export default DungeonObjectIcon;
