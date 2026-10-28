import type { Coordinate } from "../dungeon/DungeonTypes";
import { appendActivityEvents } from "../game/ActivityHistory";
import type { GameState } from "../game/GameState";
import type { Monster, MonsterKind } from "../monsters/Monster";
import {
	coordinateKey,
	orthogonalDistance,
} from "../monsters/MonsterLocations";
import { maximumMonsterHealth } from "../monsters/MonsterStats";
import { pursuitRulesFor } from "../monsters/PursuitRules";
import type { DungeonObject } from "../objects/DungeonObject";
import {
	arenaOn,
	arenaSpawnId,
	BONE_PILE_TILES,
	minibossId,
	phylacteryId,
} from "./Arena";

// While he lives and hunts you, the Lich raises a skeleton from a bone pile every few
// turns, keeping at most a few of the raised standing. It is the hall's rhythm, not
// his action.
export const LICH_RAISE_INTERVAL = 5;
export const LICH_RAISED_CAP = 3;
export const PHYLACTERY_BLOWS = 3;

const standingPhylactery = (
	state: Pick<GameState, "objects">,
	floorNumber: number,
): DungeonObject | undefined =>
	state.objects.find((o) => o.id === phylacteryId(floorNumber) && !o.activated);

// Hits on the Lich do nothing while his phylactery stands.
export const lichWarded = (
	state: Pick<GameState, "objects">,
	monster: Pick<Monster, "kind" | "floorNumber">,
): boolean =>
	monster.kind === "bone-lich" &&
	standingPhylactery(state, monster.floorNumber) !== undefined;

const raisedBy = (state: GameState, lich: Monster) =>
	state.monsters.filter((m) => m.summonedBy === lich.id && m.health > 0);

// The dead rise on free bone piles, starting from the pile after the last one used.
const raise = (
	state: GameState,
	lich: Monster,
	kinds: readonly MonsterKind[],
): { monsters: Monster[]; count: number } => {
	const taken = new Set([
		coordinateKey(state.run.playerCoordinate),
		...state.monsters
			.filter((m) => m.floorNumber === lich.floorNumber && m.health > 0)
			.map((m) => coordinateKey(m.coordinate)),
	]);
	const raised: Monster[] = [];
	let count = lich.summons?.count ?? 0;
	for (const kind of kinds) {
		const tile = BONE_PILE_TILES.map(
			(_, index) => BONE_PILE_TILES[(count + index) % BONE_PILE_TILES.length],
		).find((pile: Coordinate) => !taken.has(coordinateKey(pile)));
		if (!tile) break;
		taken.add(coordinateKey(tile));
		count++;
		raised.push({
			id: arenaSpawnId(lich.floorNumber, count),
			kind,
			floorNumber: lich.floorNumber,
			coordinate: { ...tile },
			health: maximumMonsterHealth(kind, state.difficulty, lich.floorNumber),
			intent: { type: "idle" },
			lastDamagedTurn: null,
			// Raised, they give no XP or loot, so they can't be farmed.
			summonedBy: lich.id,
			awareness: {
				type: "pursuing",
				target: { ...state.run.playerCoordinate },
				remaining: pursuitRulesFor(state).memoryPhases,
				blocked: 0,
			},
		});
	}
	return { monsters: raised, count };
};

const lichHere = (state: GameState): Monster | undefined => {
	const arena = arenaOn(state, state.run.activeFloor);
	if (arena?.miniboss !== "bone-lich") return undefined;
	return state.monsters.find(
		(m) => m.id === minibossId(arena.floorNumber) && m.health > 0,
	);
};

// The hall's rhythm after each monster phase: the clock starts once he hunts you.
export const raiseDead = (state: GameState): GameState => {
	const lich = lichHere(state);
	if (lich?.awareness?.type !== "pursuing") return state;
	const withLich = (next: Monster, extra: readonly Monster[] = []) =>
		state.monsters.map((m) => (m.id === lich.id ? next : m)).concat(extra);
	if (!lich.summons)
		return {
			...state,
			monsters: withLich({ ...lich, summons: { count: 0, turn: state.turn } }),
		};
	if (
		state.turn - lich.summons.turn < LICH_RAISE_INTERVAL ||
		raisedBy(state, lich).length >= LICH_RAISED_CAP
	)
		return state;
	const { monsters, count } = raise(state, lich, ["skeleton"]);
	if (!monsters.length) return state;
	return {
		...state,
		monsters: withLich(
			{ ...lich, summons: { count, turn: state.turn } },
			monsters,
		),
		activityHistory: appendActivityEvents(state.activityHistory, [
			{ type: "dead-raised", monster: "skeleton", count: 1, turn: state.turn },
		]),
	};
};

// His second phase: two zombies rise at once.
export const raiseZombies = (
	state: GameState,
	lich: Monster,
): { monster: Monster; summons: Monster[] } => {
	const { monsters, count } = raise(state, lich, ["zombie", "zombie"]);
	return {
		monster: { ...lich, summons: { count, turn: state.turn } },
		summons: monsters,
	};
};

// A blow is struck now and lands only if the monsters don't hit you this turn.
export const strikePhylactery = (
	state: GameState,
	phylactery: DungeonObject,
): GameState | { error: string } => {
	if (phylactery.activated)
		return { error: "The phylactery is already broken." };
	if (orthogonalDistance(phylactery.coordinate, state.run.playerCoordinate) > 1)
		return { error: "Stand beside the phylactery to strike it." };
	return {
		...state,
		objects: state.objects.map((o) =>
			o.id === phylactery.id ? { ...o, struckTurn: state.turn } : o,
		),
	};
};

// Once the monsters have acted: the blow lands unless they hurt you.
export const settlePhylactery = (
	before: GameState,
	after: GameState,
): GameState => {
	const struck = after.objects.find(
		(o) => o.kind === "phylactery" && o.struckTurn !== undefined,
	);
	if (!struck) return after;
	const { struckTurn: _, blows: landed = 0, ...rest } = struck;
	const lost = after.player.health < before.player.health;
	const blows = landed + (lost ? 0 : 1);
	const broken = blows >= PHYLACTERY_BLOWS;
	const settled: DungeonObject = broken
		? { ...rest, activated: true }
		: blows
			? { ...rest, blows }
			: rest;
	return {
		...after,
		objects: after.objects.map((o) => (o.id === struck.id ? settled : o)),
		activityHistory: appendActivityEvents(after.activityHistory, [
			lost
				? { type: "phylactery-blow-lost", turn: after.turn }
				: broken
					? { type: "phylactery-broken", turn: after.turn }
					: { type: "phylactery-struck", blows, turn: after.turn },
		]),
	};
};
