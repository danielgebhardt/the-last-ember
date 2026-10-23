import type { Coordinate } from "../dungeon/DungeonTypes";
import { createSeededRandom, hashStringToUint32 } from "../dungeon/Seed";
import type { GameState } from "../game/GameState";
import { sealedEliteTiles } from "../objects/OptionalEliteRooms";
import { approachDistances } from "./EscapeApproaches";
import {
	MONSTER_DEFINITIONS,
	type Monster,
	selectMonsterKind,
} from "./Monster";
import {
	coordinateKey,
	orthogonalDistance,
	protectedFloorLocations,
} from "./MonsterLocations";
import { maximumMonsterHealth } from "./MonsterStats";
import { isThief } from "./TreasureThief";

export const ESCAPE_ENCOUNTER_RULES = {
	arrivalBuffer: 3,
	safeTilesPerMonster: 120,
	maximumNewMonsters: 4,
	maximumLivingMonsters: 16,
	firstSpawnIndex: 10001,
	monsterPoolFloor: 20,
	preferredApproachDistance: 10,
	placementChoices: 12,
} as const;

// Build only the requested return floor. The cure floor has no second wave.
export const generateEscapeEncounters = (
	state: GameState,
	floorNumber: number,
): readonly Monster[] => {
	if (
		!Number.isInteger(floorNumber) ||
		floorNumber < 1 ||
		floorNumber >= state.quest.goalFloor
	)
		return [];
	const floor = state.run.floors[floorNumber - 1];
	if (!floor) return [];
	const rules = ESCAPE_ENCOUNTER_RULES;
	const living = state.monsters.filter(
		(actor) => actor.floorNumber === floorNumber && actor.health > 0,
	);
	const protectedTiles = protectedFloorLocations(state.run, floorNumber);
	if (floorNumber === 1) protectedTiles.push(state.quest.entrance);
	if (floorNumber === state.run.activeFloor)
		protectedTiles.push(state.run.playerCoordinate);
	const occupied = new Set(
		[...living, ...state.objects, ...state.floorItems]
			.filter((entry) => entry.floorNumber === floorNumber)
			.map((entry) => coordinateKey(entry.coordinate)),
	);
	const sealed = sealedEliteTiles(floor, state.objects);
	for (const key of sealed) occupied.add(key);
	const arrival = floor.downStair?.coordinate;
	const exit =
		floor.upStair?.coordinate ??
		(floorNumber === 1 ? state.quest.entrance : undefined);
	if (!arrival || !exit) return [];
	const fromArrival = approachDistances(floor, arrival, sealed);
	const fromExit = approachDistances(floor, exit, sealed);
	const routeLength = fromArrival.get(coordinateKey(exit));
	if (routeLength === undefined) return [];
	const candidates: Coordinate[] = [];
	for (const [row, tiles] of floor.terrain.entries())
		for (const [col, tile] of tiles.entries()) {
			const point = { row, col };
			if (
				tile === "." &&
				fromArrival.has(coordinateKey(point)) &&
				fromExit.has(coordinateKey(point)) &&
				!occupied.has(coordinateKey(point)) &&
				protectedTiles.every(
					(protectedTile) =>
						orthogonalDistance(point, protectedTile) > rules.arrivalBuffer,
				)
			)
				candidates.push(point);
		}
	const count = Math.min(
		candidates.length,
		rules.maximumNewMonsters,
		Math.ceil(candidates.length / rules.safeTilesPerMonster),
		// A thief never fights, so it never stands in for a hunter.
		Math.max(
			0,
			rules.maximumLivingMonsters -
				living.filter((actor) => !isThief(actor)).length,
		),
	);
	const existingIds = new Set(state.monsters.map((actor) => actor.id));
	const actors: Monster[] = [];
	let spawnIndex = rules.firstSpawnIndex;
	for (let index = 1; index <= count; index++) {
		const random = createSeededRandom(
			hashStringToUint32(`${state.run.seed}:${floorNumber}:escape:${index}`),
		);
		const kind = selectMonsterKind(
			rules.monsterPoolFloor,
			createSeededRandom(
				hashStringToUint32(
					`${state.run.seed}:${floorNumber}:escape-kinds:${index}`,
				),
			),
		);
		if (!kind) break;
		// Ranged hunters cannot fire on the arrival action. Telegraphs still get a response.
		const buffer = Math.max(
			rules.arrivalBuffer,
			MONSTER_DEFINITIONS[kind].rangedAttackRange ?? 0,
		);
		const anchor = index % 2 === 1 ? fromArrival : fromExit;
		const score = (point: Coordinate) => {
			const key = coordinateKey(point);
			return (
				2 *
					((fromArrival.get(key) ?? 0) +
						(fromExit.get(key) ?? 0) -
						routeLength) +
				Math.abs((anchor.get(key) ?? 0) - rules.preferredApproachDistance)
			);
		};
		const choices = candidates
			.filter(
				(point) =>
					protectedTiles.every(
						(tile) => orthogonalDistance(point, tile) > buffer,
					) &&
					actors.every(
						(actor) => orthogonalDistance(actor.coordinate, point) >= 3,
					),
			)
			.sort((a, b) => score(a) - score(b) || a.row - b.row || a.col - b.col)
			.slice(0, rules.placementChoices);
		if (!choices.length) continue;
		const coordinate = choices[Math.floor(random() * choices.length)];
		candidates.splice(candidates.indexOf(coordinate), 1);
		while (existingIds.has(`${floorNumber}:${spawnIndex}`)) spawnIndex++;
		actors.push({
			id: `${floorNumber}:${spawnIndex++}`,
			kind,
			floorNumber,
			coordinate,
			health: maximumMonsterHealth(kind, state.difficulty, floorNumber),
			intent: { type: "idle" },
			awareness: { type: "idle" },
			lastDamagedTurn: null,
		});
	}
	return actors;
};
