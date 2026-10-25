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
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { objectAvailable } from "../../domain/merchant/MerchantAvailability";
import type {
	DungeonObject,
	DungeonObjectKind,
} from "../../domain/objects/DungeonObject";
import CrackedWallIcon from "./CrackedWallIcon";
import ForgeIcon from "./ForgeIcon";
import FountainIcon from "./FountainIcon";
import MerchantIcon from "./MerchantIcon";
import MirrorIcon from "./MirrorIcon";
import RunicPortalIcon from "./RunicPortalIcon";
import SarcophagusIcon from "./SarcophagusIcon";
import ThroneIcon from "./ThroneIcon";
import TreasureChestIcon, {
	OpenedTreasureChestIcon,
} from "./TreasureChestIcon";
import WellIcon from "./WellIcon";

const icons: Record<
	Exclude<DungeonObjectKind, "elite-door" | "merchant">,
	ComponentType<SVGProps<SVGSVGElement>>
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
		object.kind === "door" && object.activated
			? DoorOpen
			: object.kind === "chest" && object.activated
				? OpenedTreasureChestIcon
				: icons[object.kind];
	return (
		<Icon
			aria-hidden="true"
			focusable="false"
			className={`size-full ${object.activated && object.kind !== "door" ? "opacity-50" : ""} ${object.kind === "trap" ? "text-destructive" : object.kind === "gold" ? "text-item-gear" : "text-object-stone"}`}
		/>
	);
};
export default DungeonObjectIcon;
