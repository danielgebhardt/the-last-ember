import { type DungeonRun, hashStringToUint32 } from "../dungeon/DungeonRun";
import { createSeededRandom } from "../dungeon/Seed";
import type { ActivityEvent } from "../game/ActivityHistory";
import type { Difficulty } from "../game/Difficulty";
import type { GameState } from "../game/GameState";
import { hasMonsterEffect } from "../game/TimedEffects";
import type { FloorItem } from "../items/FloorItems";
import type { DungeonObject } from "../objects/DungeonObject";
import { reachableRoomTiles } from "../objects/RareDiscoveryPlacement";
import { MONSTER_DEFINITIONS, type Monster } from "./Monster";
import {
	coordinateKey,
	orthogonalDistance,
	protectedFloorLocations,
} from "./MonsterLocations";
import { selectPursuitStep } from "./MonsterPursuit";
import { selectRetreatStep } from "./MonsterRetreat";
import { actorMaximumHealth } from "./MonsterStats";
import type { SpecialActionOutcome } from "./MonsterTelegraphs";

// Reserved identity per floor, after the Ember Warden's; ordinary AI parses the suffix.
export const THIEF_SPAWN_ID = 1000006;
// Each eligible floor rolls on its own stream; seeded fallback floors top an adventure up
// to two thieves, and at most five roam it.
export const THIEF_FLOOR_CHANCE = 0.2;
export const MIN_THIEVES = 2;
export const MAX_THIEVES = 5;
// Placed well away from where you arrive, so it finds you rather than starting beside you.
const THIEF_ARRIVAL_DISTANCE = 8;
// Phases after a theft before the thief slips away with its haul.
export const THIEF_ESCAPE_PHASES = 20;
export const THIEF_STEAL_SHARE = 0.15;
export const thiefStealCap = (floorNumber: number) => 50 + floorNumber * 25;
export const stolenAmount = (gold: number, floorNumber: number) =>
	Math.min(
		gold,
		Math.max(1, Math.ceil(gold * THIEF_STEAL_SHARE)),
		thiefStealCap(floorNumber),
	);
export const isThief = (monster: Pick<Monster, "kind">) =>
	MONSTER_DEFINITIONS[monster.kind].thief === true;
// Thieves' den and Gilded omens add up to two more thieves beside the floor's own, on
// identities clear of the other reserved ones (the mimic's follows the thief's).
export const EXTRA_THIEF_IDS = [1000010, 1000011] as const;
export const isThiefId = (id: string) => {
	const index = Number(id.split(":")[1]);
	return (
		index === THIEF_SPAWN_ID || EXTRA_THIEF_IDS.some((extra) => extra === index)
	);
};

// The final floor belongs to the Warden, so thieves roam the floors in between.
const thiefFloors = (run: DungeonRun) =>
	run.floors
		.map((floor) => floor.floorNumber)
		.filter(
			(floor) =>
				floor >= MONSTER_DEFINITIONS["treasure-thief"].minFloor &&
				floor < run.floors.length,
		);

export const placeTreasureThieves = (
	run: DungeonRun,
	monsters: readonly Monster[],
	floorItems: readonly FloorItem[],
	objects: readonly DungeonObject[],
	difficulty: Difficulty,
): Monster[] => {
	const eligible = thiefFloors(run);
	if (!eligible.length) return [];
	const chosen = eligible.filter(
		(floor) =>
			createSeededRandom(
				hashStringToUint32(`${run.seed}:${floor}:treasure-thief`),
			)() < THIEF_FLOOR_CHANCE,
	);
	const place = (floorNumber: number): Monster | undefined => {
		const origin = run.floors[floorNumber - 1].upStair?.coordinate;
		if (!origin) return undefined;
		const taken = new Set(
			[
				...protectedFloorLocations(run, floorNumber),
				...monsters
					.filter((m) => m.floorNumber === floorNumber)
					.map((m) => m.coordinate),
				...objects
					.filter((o) => o.floorNumber === floorNumber)
					.map((o) => o.coordinate),
				...floorItems
					.filter((i) => i.floorNumber === floorNumber)
					.map((i) => i.coordinate),
			].map(coordinateKey),
		);
		// Ordinary doors open, so only sealed elite gates limit where it can roam.
		const gates = objects.filter((o) => o.kind === "elite-door");
		const free = reachableRoomTiles(run, floorNumber, origin, gates).filter(
			(tile) => !taken.has(coordinateKey(tile)),
		);
		// Small floors may have nothing that far; then it waits as far away as it can.
		const distance = Math.min(
			THIEF_ARRIVAL_DISTANCE,
			Math.max(0, ...free.map((tile) => orthogonalDistance(tile, origin))),
		);
		const tiles = free.filter(
			(tile) => orthogonalDistance(tile, origin) >= distance,
		);
		if (!tiles.length) return undefined;
		const coordinate =
			tiles[
				Math.floor(
					createSeededRandom(
						hashStringToUint32(
							`${run.seed}:${floorNumber}:treasure-thief:tile`,
						),
					)() * tiles.length,
				)
			];
		const thief = { kind: "treasure-thief" as const, floorNumber };
		return {
			...thief,
			id: `${floorNumber}:${THIEF_SPAWN_ID}`,
			coordinate: { ...coordinate },
			health: actorMaximumHealth(thief, difficulty),
			intent: { type: "idle" },
			lastDamagedTurn: null,
		};
	};
	const thieves = chosen.slice(0, MAX_THIEVES).flatMap((floor) => {
		const placed = place(floor);
		return placed ? [placed] : [];
	});
	// Seeded spare floors top the adventure up to its minimum.
	const fallback = createSeededRandom(
		hashStringToUint32(`${run.seed}:treasure-thief:fallback`),
	);
	const spare = eligible.filter((floor) => !chosen.includes(floor));
	while (thieves.length < MIN_THIEVES && spare.length) {
		const [floor] = spare.splice(Math.floor(fallback() * spare.length), 1);
		const placed = place(floor);
		if (placed) thieves.push(placed);
	}
	return thieves.sort((a, b) => a.floorNumber - b.floorNumber);
};

// While you carry gold it snatches a share the moment it reaches you, stepping in from
// two tiles if it must, then runs from its next action. Sleep, Fear and Web stop it.
export const resolveThiefTheft = (
	state: GameState,
	monster: Monster,
	monsters: readonly Monster[],
	detected: boolean,
): SpecialActionOutcome | undefined => {
	if (
		!isThief(monster) ||
		monster.theft ||
		!detected ||
		state.gold <= 0 ||
		monster.intent.type !== "idle"
	)
		return undefined;
	const player = state.run.playerCoordinate;
	const distance = orthogonalDistance(monster.coordinate, player);
	const coordinate =
		distance === 1
			? monster.coordinate
			: distance === 2 && !hasMonsterEffect(state, monster, "rooted")
				? selectPursuitStep(state.run, monster, monsters)
				: undefined;
	if (!coordinate || orthogonalDistance(coordinate, player) !== 1)
		return undefined;
	const gold = stolenAmount(state.gold, monster.floorNumber);
	const turn = state.turn;
	return {
		monster: {
			...monster,
			coordinate: { ...coordinate },
			theft: { gold, turn },
		},
		events: [{ type: "monster-theft-hit", monster: monster.kind, gold, turn }],
		stolenGold: gold,
	};
};

// With its haul it only runs from you, and slips away once enough phases have passed.
// Web holds it in place and Sleep stops its actions, so either can win the gold back.
export const thiefFlight = (
	state: GameState,
	navigation: DungeonRun,
	monster: Monster,
	monsters: readonly Monster[],
):
	| { type: "escaped"; event: ActivityEvent }
	| { type: "moved"; monster: Monster }
	| undefined => {
	const theft = monster.theft;
	if (!theft) return undefined;
	const rooted = hasMonsterEffect(state, monster, "rooted");
	if (!rooted && state.turn - theft.turn >= THIEF_ESCAPE_PHASES)
		return {
			type: "escaped",
			event: {
				type: "monster-thief-escaped",
				monster: monster.kind,
				gold: theft.gold,
				turn: state.turn,
			},
		};
	const coordinate = rooted
		? undefined
		: selectRetreatStep(navigation, monster, monsters);
	return {
		type: "moved",
		monster: coordinate ? { ...monster, coordinate } : monster,
	};
};
