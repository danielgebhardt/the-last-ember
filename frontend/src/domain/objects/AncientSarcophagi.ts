import { hashStringToUint32 } from "../dungeon/DungeonRun";
import { createSeededRandom } from "../dungeon/Seed";
import { appendActivityEvents } from "../game/ActivityHistory";
import type { GameState } from "../game/GameState";
import { eligibleMonsterKinds, type MonsterKind } from "../monsters/Monster";
import {
	coordinateKey,
	protectedSpawnLocations,
} from "../monsters/MonsterLocations";
import { maximumMonsterHealth } from "../monsters/MonsterStats";
import type { DungeonObject } from "./DungeonObject";
import { spendObject } from "./ObjectEffects";
import type { ObjectChoice } from "./ObjectInteraction";
import { reachableRoomTiles } from "./RareDiscoveryPlacement";
import { chestReward } from "./TreasureChests";

export type SarcophagusOutcome = "treasure" | "guardian" | "both" | "empty";
export const sarcophagusOutcome = (
	seed: number,
	object: DungeonObject,
): SarcophagusOutcome => {
	const roll = createSeededRandom(
		hashStringToUint32(`${seed}:${object.id}:sarcophagus:outcome`),
	)();
	return roll < 0.4
		? "treasure"
		: roll < 0.65
			? "guardian"
			: roll < 0.9
				? "both"
				: "empty";
};
export const sarcophagusGuardianKind = (
	seed: number,
	object: DungeonObject,
): MonsterKind => {
	const eligible = eligibleMonsterKinds(object.floorNumber);
	const undead = eligible.filter((k) =>
		["skeleton", "zombie", "wraith"].includes(k),
	);
	const pool = undead.length ? undead : eligible;
	const random = createSeededRandom(
		hashStringToUint32(`${seed}:${object.id}:sarcophagus:guardian`),
	);
	return pool[Math.floor(random() * pool.length)];
};
export const sarcophagusSpawn = (state: GameState, object: DungeonObject) => {
	const occupied = new Set(
		[
			state.run.playerCoordinate,
			...protectedSpawnLocations(state.run, object.floorNumber),
			...state.monsters
				.filter((m) => m.floorNumber === object.floorNumber && m.health > 0)
				.map((m) => m.coordinate),
			...state.objects
				.filter((o) => o.floorNumber === object.floorNumber)
				.map((o) => o.coordinate),
			...state.floorItems
				.filter((i) => i.floorNumber === object.floorNumber)
				.map((i) => i.coordinate),
			...(state.townPortal?.floorNumber === object.floorNumber
				? [state.townPortal.coordinate]
				: []),
		].map(coordinateKey),
	);
	return reachableRoomTiles(
		state.run,
		object.floorNumber,
		object.coordinate,
		state.objects,
	).find((p) => !occupied.has(coordinateKey(p)));
};
export const openSarcophagus = (
	state: GameState,
	object: DungeonObject,
	choice?: ObjectChoice,
): GameState | { error: string } => {
	if (object.activated)
		return { error: "This sarcophagus has already been opened." };
	if (choice !== "open-sarcophagus")
		return { error: "Review the sarcophagus before opening it." };
	const outcome = sarcophagusOutcome(state.run.seed, object);
	const guardian = outcome === "guardian" || outcome === "both";
	const treasure = outcome === "treasure" || outcome === "both";
	const coordinate = guardian ? sarcophagusSpawn(state, object) : undefined;
	const kind = sarcophagusGuardianKind(state.run.seed, object);
	// Reserve a stable numeric actor identity; ordinary AI schedules parse this suffix.
	const id = `${object.floorNumber}:1000001`;
	const next = spendObject(state, object);
	return {
		...next,
		objects: next.objects.map((o) =>
			o.id === object.id ? { ...o, sarcophagusOutcome: outcome } : o,
		),
		monsters: coordinate
			? [
					...state.monsters,
					{
						id,
						kind,
						heroic: true,
						floorNumber: object.floorNumber,
						coordinate,
						health: maximumMonsterHealth(
							kind,
							state.difficulty,
							object.floorNumber,
							true,
						),
						intent: { type: "idle" as const },
						lastDamagedTurn: null,
					},
				]
			: state.monsters,
		floorItems: treasure
			? [...state.floorItems, chestReward(state.run.seed, object)]
			: state.floorItems,
		activityHistory: appendActivityEvents(next.activityHistory, [
			{
				type: "sarcophagus-opened",
				outcome,
				escaped: guardian && !coordinate,
				turn: state.turn,
			},
		]),
	};
};
