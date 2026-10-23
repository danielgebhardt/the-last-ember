import { hashStringToUint32 } from "../dungeon/DungeonRun";
import type { Coordinate } from "../dungeon/DungeonTypes";
import { createSeededRandom } from "../dungeon/Seed";
import { FLOOR } from "../dungeon/Tiles";
import { itemsAtPlayer } from "../items/FloorItems";
import type { Monster } from "../monsters/Monster";
import {
	coordinateKey,
	orthogonalDistance,
	protectedFloorLocations,
} from "../monsters/MonsterLocations";
import { navigationRun } from "../objects/NavigationTerrain";
import { sealedTiles } from "../objects/OptionalEliteRooms";
import { appendActivityEvents } from "./ActivityHistory";
import type { GameState } from "./GameState";
import type { SpellKind } from "./Spells";

export const repositionSpell = (
	state: GameState,
	spell: SpellKind,
	cost: number,
	range: number,
	target?: Monster,
): { state: GameState } | { error: string } => {
	const protectedTiles = new Set(
		protectedFloorLocations(state.run, state.run.activeFloor).map(
			coordinateKey,
		),
	);
	protectedTiles.add(coordinateKey(state.run.playerCoordinate));
	if (state.run.activeFloor === 1)
		protectedTiles.add(coordinateKey(state.quest.entrance));
	for (const monster of state.monsters)
		if (monster.floorNumber === state.run.activeFloor && monster.health > 0)
			protectedTiles.add(coordinateKey(monster.coordinate));
	const terrain =
		navigationRun(state).floors[state.run.activeFloor - 1].terrain;
	for (const key of sealedTiles(
		state.run.floors[state.run.activeFloor - 1],
		state.objects,
	))
		protectedTiles.add(key);
	const candidates: Coordinate[] = [];
	for (let row = 0; row < terrain.length; row++)
		for (let col = 0; col < terrain[row].length; col++) {
			const coordinate = { row, col };
			if (
				terrain[row][col] !== FLOOR ||
				protectedTiles.has(coordinateKey(coordinate))
			)
				continue;
			const distance = orthogonalDistance(
				state.run.playerCoordinate,
				coordinate,
			);
			if (
				target
					? distance >
						orthogonalDistance(state.run.playerCoordinate, target.coordinate)
					: distance <= range
			)
				candidates.push(coordinate);
		}
	if (candidates.length === 0)
		return { error: "No safe destination is available." };
	const random = createSeededRandom(
		hashStringToUint32(
			`${state.run.seed}:${state.run.activeFloor}:${state.turn}:spell:${spell}:${target?.id ?? "player"}:destination`,
		),
	);
	const distant = target
		? []
		: candidates.filter(
				(point) => orthogonalDistance(state.run.playerCoordinate, point) >= 4,
			);
	const pool = distant.length ? distant : candidates;
	const coordinate = pool[Math.floor(random() * pool.length)];
	let next: GameState = {
		...state,
		mana: state.mana - cost,
		run: target ? state.run : { ...state.run, playerCoordinate: coordinate },
		monsters: target
			? state.monsters.map((monster) =>
					monster.id === target.id
						? { ...monster, coordinate, intent: { type: "idle" } }
						: monster,
				)
			: state.monsters,
		activityHistory: appendActivityEvents(state.activityHistory, [
			{
				type: "spell-repositioned",
				spell,
				...(target ? { monster: target.kind } : {}),
				turn: state.turn,
			},
		]),
	};
	if (!target) {
		const items = itemsAtPlayer(next).map((entry) => entry.item.kind);
		if (items.length)
			next = {
				...next,
				activityHistory: appendActivityEvents(next.activityHistory, [
					{ type: "items-seen", items, turn: state.turn },
				]),
			};
	}
	return { state: next };
};
