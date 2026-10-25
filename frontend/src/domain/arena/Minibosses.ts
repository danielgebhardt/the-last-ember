import type { Coordinate } from "../dungeon/DungeonTypes";
import type { GameState } from "../game/GameState";
import { MONSTER_DEFINITIONS, type Monster } from "../monsters/Monster";
import { orthogonalDistance } from "../monsters/MonsterLocations";
import {
	actorMaximumHealth,
	maximumMonsterHealth,
} from "../monsters/MonsterStats";
import type { SpecialActionOutcome } from "../monsters/MonsterTelegraphs";
import { navigationRun } from "../objects/NavigationTerrain";
import { MINIBOSS_SUMMON_IDS } from "./Arena";

const SIDES: readonly Coordinate[] = [
	{ row: -1, col: 0 },
	{ row: 0, col: 1 },
	{ row: 1, col: 0 },
	{ row: 0, col: -1 },
	{ row: -1, col: -1 },
	{ row: -1, col: 1 },
	{ row: 1, col: 1 },
	{ row: 1, col: -1 },
];

// At half health a miniboss spends one action changing phase. The Pyre Lord calls two
// salamanders and breathes without pause; the Juggernaut charges again without recovering.
export const resolveMinibossPhase = (
	state: GameState,
	monster: Monster,
	monsters: readonly Monster[],
): SpecialActionOutcome | undefined => {
	if (
		!MONSTER_DEFINITIONS[monster.kind].miniboss ||
		monster.minibossPhase === 2 ||
		monster.health * 2 > actorMaximumHealth(monster, state.difficulty)
	)
		return undefined;
	const enraged: Monster = {
		...monster,
		minibossPhase: 2,
		intent: { type: "idle" },
	};
	const events = [
		{
			type: "miniboss-enraged" as const,
			miniboss: monster.kind as "pyre-lord" | "iron-juggernaut",
			turn: state.turn,
		},
	];
	if (monster.kind !== "pyre-lord") return { monster: enraged, events };
	const terrain = navigationRun(state).floors[monster.floorNumber - 1].terrain;
	const taken = (point: Coordinate) =>
		orthogonalDistance(point, state.run.playerCoordinate) === 0 ||
		monsters.some(
			(m) =>
				m.floorNumber === monster.floorNumber &&
				m.health > 0 &&
				orthogonalDistance(m.coordinate, point) === 0,
		);
	const free = SIDES.map((side) => ({
		row: monster.coordinate.row + side.row,
		col: monster.coordinate.col + side.col,
	})).filter(
		(point) => terrain[point.row]?.[point.col] === "." && !taken(point),
	);
	const summons: Monster[] = MINIBOSS_SUMMON_IDS.slice(0, free.length).map(
		(index, slot) => ({
			id: `${monster.floorNumber}:${index}`,
			kind: "salamander",
			floorNumber: monster.floorNumber,
			coordinate: free[slot],
			health: maximumMonsterHealth(
				"salamander",
				state.difficulty,
				monster.floorNumber,
			),
			intent: { type: "idle" },
			lastDamagedTurn: null,
		}),
	);
	return { monster: enraged, events, summons };
};
