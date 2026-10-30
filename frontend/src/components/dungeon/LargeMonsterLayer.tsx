import type { Coordinate } from "../../domain/dungeon/DungeonTypes.ts";
import type { VisibilityGrid } from "../../domain/dungeon/Visibility.ts";
import type { Monster } from "../../domain/monsters/Monster.ts";
import { bodySpan, bodyTiles } from "../../domain/monsters/MonsterFootprint";
import MonsterIcon from "../monsters/MonsterIcon.tsx";

const tiles = (count: number) => `calc(var(--dungeon-tile-size) * ${count})`;

// Monsters with a 2×2 body are drawn once across all their tiles, over the map
// table in tile units. Each covered cell still names and targets the monster, so
// this drawing is decorative. Like any monster it shows only where you can see:
// parts of it over tiles out of sight stay hidden.
const LargeMonsterLayer = ({
	monsters,
	visible,
}: {
	monsters: readonly Monster[];
	visible?: VisibilityGrid;
}) => {
	const shown = monsters
		.filter((monster) => monster.health > 0 && bodySpan(monster) > 1)
		.map((monster) => ({
			monster,
			seen: bodyTiles(monster).filter(
				(tile) => visible === undefined || visible[tile.row]?.[tile.col],
			),
		}))
		.filter(({ seen }) => seen.length > 0);
	if (!shown.length) return null;
	return (
		<div aria-hidden="true" className="large-monster-layer">
			{shown.map(({ monster, seen }) => {
				const span = bodySpan(monster);
				const { row, col } = monster.coordinate;
				const whole = (
					<div
						className="large-monster-art"
						style={{ width: tiles(span), height: tiles(span) }}
					>
						<MonsterIcon kind={monster.kind} />
					</div>
				);
				// In full view: one drawing. Partly in view: a one-tile window onto
				// each seen tile's part of the drawing.
				const windows: readonly (Coordinate | undefined)[] =
					seen.length === span * span ? [undefined] : seen;
				return windows.map((tile) => (
					<div
						key={`${monster.id}:${tile ? `${tile.row}:${tile.col}` : "whole"}`}
						data-testid="large-monster"
						className="large-monster"
						style={{
							top: tiles(tile?.row ?? row),
							left: tiles(tile?.col ?? col),
							width: tiles(tile ? 1 : span),
							height: tiles(tile ? 1 : span),
						}}
					>
						{tile ? (
							<div
								className="large-monster-offset"
								style={{
									top: tiles(row - tile.row),
									left: tiles(col - tile.col),
								}}
							>
								{whole}
							</div>
						) : (
							whole
						)}
					</div>
				));
			})}
		</div>
	);
};

export default LargeMonsterLayer;
