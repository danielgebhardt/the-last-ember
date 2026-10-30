import { FLOOR, PLAYER, WALL } from "../../domain/dungeon/Tiles.ts";
import { useAdventurer } from "../../settings/Adventurers";
import { FullColor, isFullColor } from "../icons/FullColorIcon";
import { TILE_ICON_COLORS, TILE_ICONS } from "./TileVisuals.ts";

// The adventurer the player chose, with a faint ember glow so they're easy to find.
const PlayerIcon = () => (
	<span className="relative z-10 block size-full">
		<FullColor
			icon={useAdventurer().icon}
			className="drop-shadow-[0_0_2px_rgba(250,89,46,0.6)]"
		/>
	</span>
);

const TileIcon = ({ tile }: { tile: string }) => {
	// Terrain is painted by CSS on the parent cell.
	if (tile === WALL || tile === FLOOR) {
		return null;
	}

	if (tile === PLAYER) return <PlayerIcon />;

	const icon = TILE_ICONS[tile];

	if (!icon) return tile;

	if (!isFullColor(icon)) {
		const Icon = icon;
		return (
			<span
				className={`relative z-10 block size-full ${TILE_ICON_COLORS[tile] ?? ""}`}
			>
				<Icon
					aria-hidden="true"
					focusable="false"
					className="block size-full"
				/>
			</span>
		);
	}

	return (
		<span className="relative z-10 block size-full">
			<FullColor icon={icon} />
		</span>
	);
};

export default TileIcon;
