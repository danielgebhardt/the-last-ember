import { type DungeonRun, hashStringToUint32 } from "../dungeon/DungeonRun";
import { createSeededRandom } from "../dungeon/Seed";
import { appendActivityEvents } from "../game/ActivityHistory";
import { awardExperience } from "../game/ExperienceRewards";
import type { GameState } from "../game/GameState";
import { growManaCapacity } from "../game/Mana";
import {
	applyOmenGatherings,
	type FloorOmen,
	OMEN_MIN_FLOOR,
	type OmenKind,
	omenChoices,
} from "../game/Omens";
import { altarPacts, type PactKind } from "../game/Pacts";
import { maximumHealth } from "../game/PlayerHealth";
import {
	experienceThreshold,
	levelForExperience,
	MAX_PLAYER_LEVEL,
} from "../game/Progression";
import type { FloorItem } from "../items/FloorItems";
import { merchantsEnabled } from "../merchant/MerchantAvailability";
import type { Monster } from "../monsters/Monster";
import {
	coordinateKey,
	orthogonalDistance,
	protectedFloorLocations,
} from "../monsters/MonsterLocations";
import type { DungeonObject } from "./DungeonObject";
import type { ObjectChoice } from "./ObjectInteraction";
import { reachableRoomTiles } from "./RareDiscoveryPlacement";

// About half of adventures hide one altar in the middle third of the dungeon.
export const ALTAR_CHANCE = 0.5;
const ALTAR_ARRIVAL_DISTANCE = 3;
export const altarFloors = (depth: number): readonly number[] => {
	const first = Math.floor(depth / 3) + 1;
	const last = Math.min(depth - 1, Math.ceil((depth * 2) / 3));
	return Array.from(
		{ length: Math.max(0, last - first + 1) },
		(_, index) => first + index,
	);
};
export const altarId = (floorNumber: number) =>
	`floor:${floorNumber}:object:dark-altar:1`;
export const isDarkAltar = (object: Pick<DungeonObject, "kind">) =>
	object.kind === "dark-altar";

type Placed = Readonly<{
	monsters: readonly Monster[];
	objects: readonly DungeonObject[];
	floorItems: readonly FloorItem[];
}>;
// On its own stream after every other placement, on a free room tile reachable from
// the floor's arrival, so nothing else in the adventure moves.
export const placeDarkAltar = (
	run: DungeonRun,
	placed: Placed,
): DungeonObject | undefined => {
	const random = createSeededRandom(
		hashStringToUint32(`${run.seed}:dark-altar`),
	);
	const floors = altarFloors(run.floors.length);
	if (!floors.length || random() >= ALTAR_CHANCE) return undefined;
	const floorNumber = floors[Math.floor(random() * floors.length)];
	const origin = run.floors[floorNumber - 1].upStair?.coordinate;
	if (!origin) return undefined;
	const taken = new Set(
		[
			...protectedFloorLocations(run, floorNumber),
			...[...placed.monsters, ...placed.objects, ...placed.floorItems]
				.filter((entry) => entry.floorNumber === floorNumber)
				.map((entry) => entry.coordinate),
		].map(coordinateKey),
	);
	const gates = placed.objects.filter((o) => o.kind === "elite-door");
	// Never the first thing beside the arrival stair.
	const free = reachableRoomTiles(run, floorNumber, origin, gates).filter(
		(tile) =>
			!taken.has(coordinateKey(tile)) &&
			orthogonalDistance(tile, origin) >= ALTAR_ARRIVAL_DISTANCE,
	);
	if (!free.length) return undefined;
	return {
		id: altarId(floorNumber),
		kind: "dark-altar",
		floorNumber,
		coordinate: { ...free[Math.floor(random() * free.length)] },
		activated: false,
	};
};

// Omens that only shape a floor while it is generated cannot join later.
const LATE_OMEN_EXCLUSIONS: readonly OmenKind[] = ["cracked", "merchants-rest"];
// The Pact of Omens marks every deeper floor that has none, each on its own stream,
// and brings each new omen's creatures, finds and features.
const markDeeperFloors = (state: GameState, from: number): GameState => {
	const added: FloorOmen[] = [];
	const depth = state.run.floors.length;
	for (
		let floorNumber = Math.max(from + 1, OMEN_MIN_FLOOR);
		floorNumber < depth;
		floorNumber++
	) {
		if (state.omens?.some((omen) => omen.floorNumber === floorNumber)) continue;
		const choices = omenChoices(
			state.run,
			floorNumber,
			state.objects,
			merchantsEnabled(),
			[...(state.omens ?? []), ...added],
		).filter((kind) => !LATE_OMEN_EXCLUSIONS.includes(kind));
		if (!choices.length) continue;
		const random = createSeededRandom(
			hashStringToUint32(`${state.run.seed}:${floorNumber}:pact-omen`),
		);
		added.push({
			floorNumber,
			kind: choices[Math.floor(random() * choices.length)],
		});
	}
	if (!added.length) return state;
	const gathered = applyOmenGatherings(
		state.run,
		added,
		state,
		state.difficulty,
	);
	return {
		...state,
		...gathered,
		omens: [...(state.omens ?? []), ...added].sort(
			(a, b) => a.floorNumber - b.floorNumber,
		),
	};
};

// The chosen pact joins progression for the rest of the run. Its immediate gains and
// costs land now: health capacity, a level, or omens on the floors below.
export const strikePact = (
	state: GameState,
	altar: DungeonObject,
	choice: ObjectChoice | undefined,
): GameState | { error: string } => {
	const kind = altarPacts(state.run.seed, altar).find(
		(pact) => choice === `pact-${pact}`,
	);
	if (!kind) return { error: "Choose one of the altar's bargains." };
	if (state.progression.pact)
		return { error: "You are already bound by a pact." };
	const progression = { ...state.progression, pact: kind };
	const maxHealth = maximumHealth(
		progression,
		state.equipment,
		state.afflictions,
	);
	const bound: GameState = {
		...state,
		progression,
		player: {
			maxHealth,
			health: Math.max(
				1,
				Math.min(
					maxHealth,
					state.player.health + maxHealth - state.player.maxHealth,
				),
			),
		},
		mana: growManaCapacity(
			state.mana,
			state.progression,
			progression,
			state.equipment,
			state.afflictions,
		),
		objects: state.objects.map((o) =>
			o.id === altar.id ? { ...o, activated: true } : o,
		),
		activityHistory: appendActivityEvents(state.activityHistory, [
			{ type: "pact-struck", pact: kind, turn: state.turn },
		]),
	};
	return pactArrives(bound, kind, altar.floorNumber);
};
const pactArrives = (
	state: GameState,
	kind: PactKind,
	floorNumber: number,
): GameState => {
	if (kind === "omens") return markDeeperFloors(state, floorNumber);
	if (kind !== "hunter") return state;
	const level = levelForExperience(state.progression.experience);
	return level >= MAX_PLAYER_LEVEL
		? state
		: awardExperience(
				state,
				experienceThreshold(level + 1) - state.progression.experience,
			);
};
