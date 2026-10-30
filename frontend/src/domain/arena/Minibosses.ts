import type { Coordinate } from "../dungeon/DungeonTypes";
import type { GameState } from "../game/GameState";
import { MONSTER_DEFINITIONS, type Monster } from "../monsters/Monster";
import { bodyRing, occupies } from "../monsters/MonsterFootprint";
import {
	actorMaximumHealth,
	maximumMonsterHealth,
} from "../monsters/MonsterStats";
import type { SpecialActionOutcome } from "../monsters/MonsterTelegraphs";
import { navigationRun } from "../objects/NavigationTerrain";
import { MINIBOSS_SUMMON_IDS, type MinibossKind } from "./Arena";
import { raiseZombies } from "./BoneLich";
import { burstSacs } from "./Brood";

// At half health a miniboss spends one action changing phase. The Pyre Lord calls two
// salamanders and breathes without pause; the Juggernaut charges again without recovering;
// every unbroken sac of the Broodmother's bursts and she webs without pause; the Bone
// Lich raises two zombies and starts his slowing hex.
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
			miniboss: monster.kind as MinibossKind,
			turn: state.turn,
		},
	];
	if (monster.kind === "broodmother") {
		const burst = burstSacs(state, enraged);
		return { ...burst, events };
	}
	if (monster.kind === "bone-lich") {
		const raised = raiseZombies(state, enraged);
		return {
			...raised,
			events: [
				...events,
				...(raised.summons.length
					? [
							{
								type: "dead-raised" as const,
								monster: "zombie" as const,
								count: raised.summons.length,
								turn: state.turn,
							},
						]
					: []),
			],
		};
	}
	if (monster.kind !== "pyre-lord") return { monster: enraged, events };
	const terrain = navigationRun(state).floors[monster.floorNumber - 1].terrain;
	const taken = (point: Coordinate) =>
		(point.row === state.run.playerCoordinate.row &&
			point.col === state.run.playerCoordinate.col) ||
		monsters.some(
			(m) =>
				m.floorNumber === monster.floorNumber &&
				m.health > 0 &&
				occupies(m, point),
		);
	// The salamanders appear in the ring around his body, never on it.
	const free = bodyRing(monster).filter(
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
