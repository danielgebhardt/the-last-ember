import type { Coordinate } from "../dungeon/DungeonTypes";
import { appendActivityEvents } from "../game/ActivityHistory";
import type { GameState } from "../game/GameState";
import type { Monster } from "../monsters/Monster";
import { bodyTiles } from "../monsters/MonsterFootprint";
import {
	coordinateKey,
	orthogonalDistance,
} from "../monsters/MonsterLocations";
import { maximumMonsterHealth } from "../monsters/MonsterStats";
import { pursuitRulesFor } from "../monsters/PursuitRules";
import type { DungeonObject } from "../objects/DungeonObject";
import { navigationRun } from "../objects/NavigationTerrain";
import { arenaOn, arenaSpawnId, minibossId } from "./Arena";

// While the Broodmother lives and hunts you, each unbroken sac hatches a spiderling
// every few turns. Hatching is the hall's own rhythm, not her action.
export const BROOD_HATCH_INTERVAL = 6;

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

const unbrokenSacs = (state: GameState, floorNumber: number) =>
	state.objects.filter(
		(o) =>
			o.kind === "egg-sac" && !o.activated && o.floorNumber === floorNumber,
	);

// One spiderling beside each sac with room; a sac boxed in by bodies waits.
const hatch = (
	state: GameState,
	mother: Monster,
	sacs: readonly DungeonObject[],
): { monsters: Monster[]; count: number } => {
	const terrain = navigationRun(state).floors[mother.floorNumber - 1].terrain;
	const taken = new Set([
		coordinateKey(state.run.playerCoordinate),
		...state.objects
			.filter((o) => o.floorNumber === mother.floorNumber)
			.map((o) => coordinateKey(o.coordinate)),
		// Every tile of a large body, so none hatches inside her.
		...state.monsters
			.filter((m) => m.floorNumber === mother.floorNumber && m.health > 0)
			.flatMap((m) => bodyTiles(m).map(coordinateKey)),
	]);
	const hatched: Monster[] = [];
	let count = mother.summons?.count ?? 0;
	for (const sac of sacs) {
		const tile = SIDES.map((side) => ({
			row: sac.coordinate.row + side.row,
			col: sac.coordinate.col + side.col,
		})).find(
			(point) =>
				terrain[point.row]?.[point.col] === "." &&
				!taken.has(coordinateKey(point)),
		);
		if (!tile) continue;
		taken.add(coordinateKey(tile));
		count++;
		hatched.push({
			id: arenaSpawnId(mother.floorNumber, count),
			kind: "spiderling",
			floorNumber: mother.floorNumber,
			coordinate: tile,
			health: maximumMonsterHealth(
				"spiderling",
				state.difficulty,
				mother.statFloor ?? mother.floorNumber,
			),
			intent: { type: "idle" },
			lastDamagedTurn: null,
			summonedBy: mother.id,
			...(mother.statFloor ? { statFloor: mother.statFloor } : {}),
			// Hatchlings come out already hunting you.
			awareness: {
				type: "pursuing",
				target: { ...state.run.playerCoordinate },
				remaining: pursuitRulesFor(state).memoryPhases,
				blocked: 0,
			},
		});
	}
	return { monsters: hatched, count };
};

const broodmotherHere = (state: GameState): Monster | undefined => {
	const arena = arenaOn(state, state.run.activeFloor);
	if (arena?.miniboss !== "broodmother") return undefined;
	return state.monsters.find(
		(m) => m.id === minibossId(arena.floorNumber) && m.health > 0,
	);
};

// The hall's rhythm after each monster phase: the clock starts once she hunts you.
export const hatchBrood = (state: GameState): GameState => {
	const mother = broodmotherHere(state);
	if (mother?.awareness?.type !== "pursuing") return state;
	const withMother = (next: Monster, extra: readonly Monster[] = []) =>
		state.monsters.map((m) => (m.id === mother.id ? next : m)).concat(extra);
	if (!mother.summons)
		return {
			...state,
			monsters: withMother({
				...mother,
				summons: { count: 0, turn: state.turn },
			}),
		};
	if (state.turn - mother.summons.turn < BROOD_HATCH_INTERVAL) return state;
	const { monsters, count } = hatch(
		state,
		mother,
		unbrokenSacs(state, mother.floorNumber),
	);
	return {
		...state,
		monsters: withMother(
			{ ...mother, summons: { count, turn: state.turn } },
			monsters,
		),
		...(monsters.length
			? {
					activityHistory: appendActivityEvents(state.activityHistory, [
						{ type: "brood-hatched", count: monsters.length, turn: state.turn },
					]),
				}
			: {}),
	};
};

// Her second phase: every unbroken sac bursts at once.
export const burstSacs = (
	state: GameState,
	mother: Monster,
): { monster: Monster; summons: Monster[]; objects: DungeonObject[] } => {
	const sacs = unbrokenSacs(state, mother.floorNumber);
	const { monsters, count } = hatch(state, mother, sacs);
	return {
		monster: { ...mother, summons: { count, turn: state.turn } },
		summons: monsters,
		objects: state.objects.map((o) =>
			sacs.includes(o) ? { ...o, activated: true } : o,
		),
	};
};

export const breakEggSac = (
	state: GameState,
	sac: DungeonObject,
): GameState | { error: string } => {
	if (sac.activated) return { error: "This sac is already broken." };
	if (orthogonalDistance(sac.coordinate, state.run.playerCoordinate) > 1)
		return { error: "Stand beside the egg sac to break it." };
	return {
		...state,
		objects: state.objects.map((o) =>
			o.id === sac.id ? { ...o, activated: true } : o,
		),
		activityHistory: appendActivityEvents(state.activityHistory, [
			{ type: "egg-sac-broken", turn: state.turn },
		]),
	};
};

// Fire that covers a sac burns it; the spell's own resolution decides the tiles.
export const burnEggSacs = (
	state: GameState,
	tiles: ReadonlySet<string>,
): GameState => {
	const burned = unbrokenSacs(state, state.run.activeFloor).filter((sac) =>
		tiles.has(coordinateKey(sac.coordinate)),
	);
	if (!burned.length) return state;
	return {
		...state,
		objects: state.objects.map((o) =>
			burned.includes(o) ? { ...o, activated: true } : o,
		),
		activityHistory: appendActivityEvents(state.activityHistory, [
			{ type: "egg-sacs-burned", count: burned.length, turn: state.turn },
		]),
	};
};
