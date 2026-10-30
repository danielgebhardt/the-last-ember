import type { VisibilityGrid } from "../../domain/dungeon/Visibility.ts";
import type { Monster } from "../../domain/monsters/Monster.ts";
import { bodySpan, bodyTiles } from "../../domain/monsters/MonsterFootprint";
import MonsterIcon from "../monsters/MonsterIcon.tsx";

// Monsters with a 2×2 body are drawn once across all their tiles, over the map
// table in tile units. Each covered cell still names and targets the monster, so
// this drawing is decorative. It shows while any of its tiles is in view.
const LargeMonsterLayer = ({
	monsters,
	visible,
}: {
	monsters: readonly Monster[];
	visible?: VisibilityGrid;
}) => {
	const shown = monsters.filter(
		(monster) =>
			monster.health > 0 &&
			bodySpan(monster) > 1 &&
			(visible === undefined ||
				bodyTiles(monster).some((tile) => visible[tile.row]?.[tile.col])),
	);
	if (!shown.length) return null;
	return (
		<div aria-hidden="true" className="large-monster-layer">
			{shown.map((monster) => (
				<div
					key={monster.id}
					data-testid="large-monster"
					className="large-monster"
					style={{
						top: `calc(var(--dungeon-tile-size) * ${monster.coordinate.row})`,
						left: `calc(var(--dungeon-tile-size) * ${monster.coordinate.col})`,
						width: `calc(var(--dungeon-tile-size) * ${bodySpan(monster)})`,
						height: `calc(var(--dungeon-tile-size) * ${bodySpan(monster)})`,
					}}
				>
					<MonsterIcon kind={monster.kind} />
				</div>
			))}
		</div>
	);
};

export default LargeMonsterLayer;
