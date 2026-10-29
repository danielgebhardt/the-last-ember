import { FLOOR, PLAYER, WALL } from "../../domain/dungeon/Tiles.ts";
import { FullColor } from "../icons/FullColorIcon";
import { TILE_ICONS } from "./TileVisuals.ts";

const TileIcon = ({ tile }: { tile: string }) => {
	// Terrain is painted by CSS on the parent cell.
	if (tile === WALL || tile === FLOOR) {
		return null;
	}

	const icon = TILE_ICONS[tile];

	if (!icon) return tile;

	return (
		<span className="relative z-10 block size-full">
			<FullColor
				icon={icon}
				// The player keeps a faint ember glow so they're easy to find.
				className={
					tile === PLAYER ? "drop-shadow-[0_0_2px_rgba(250,89,46,0.6)]" : ""
				}
			/>
		</span>
	);
};

export default TileIcon;
