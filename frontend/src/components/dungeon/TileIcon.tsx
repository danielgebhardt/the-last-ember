import { FLOOR, PLAYER, WALL } from "../../domain/dungeon/Tiles.ts";
import { TILE_ICON_COLORS, TILE_ICONS } from "./TileVisuals.ts";

const CloakedExplorerIcon = () => (
	<svg
		aria-hidden="true"
		focusable="false"
		viewBox="0 0 24 24"
		fill="none"
		className="block size-full drop-shadow-[0_0_2px_rgba(250,89,46,0.6)]"
	>
		{/* Hood and flowing cloak */}
		<path
			d="
            M12 2.1
            C8.5 2.1 6.2 5.6 6.3 9.5
            L3.5 15.2
            L2.7 21.2
            H9
            L10.2 19.2
            H13.8
            L15 21.2
            H21.3
            L20.5 15.2
            L17.7 9.5
            C17.8 5.6 15.5 2.1 12 2.1
            Z
         "
			fill="#7e202a"
			stroke="#ff7677"
			strokeWidth="1.65"
			strokeLinejoin="round"
		/>

		{/* Shadow beneath the hood */}
		<path
			d="
            M7.7 11.2
            C8 7.2 9.6 5 12 5
            S16 7.2 16.3 11.2
            L13.8 13
            H10.2
            Z
         "
			fill="#111520"
			stroke="#ff9290"
			strokeWidth="1"
		/>

		{/* Cloak folds */}
		<path
			d="M7.5 14.8 6.3 19 M16.5 14.8 17.7 19"
			stroke="#ff7575"
			strokeWidth="1.3"
			strokeLinecap="round"
		/>

		{/* Small amber dagger */}
		<path
			d="M10 19 15.5 13.5 M13.3 13.3 15.7 15.7"
			stroke="#f7c36a"
			strokeWidth="1.45"
			strokeLinecap="round"
		/>
	</svg>
);

const TileIcon = ({ tile }: { tile: string }) => {
	if (tile === PLAYER) {
		return (
			<span className="relative z-10 block size-full">
				<CloakedExplorerIcon />
			</span>
		);
	}

	// Terrain is painted by CSS on the parent cell.
	if (tile === WALL || tile === FLOOR) {
		return null;
	}

	const Icon = TILE_ICONS[tile];

	if (!Icon) return tile;

	return (
		<span
			className={`relative z-10 block size-full ${
				TILE_ICON_COLORS[tile] ?? ""
			}`}
		>
			<Icon aria-hidden="true" focusable="false" className="block size-full" />
		</span>
	);
};

export default TileIcon;
