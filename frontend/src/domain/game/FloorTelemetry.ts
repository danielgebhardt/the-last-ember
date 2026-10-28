import type { EquipmentSlot } from "../items/Equipment";
import type { ItemKind } from "../items/Item";
import { deriveAttributes } from "./Attributes";
import { deriveCombatStats } from "./CombatStats";
import type { GameState } from "./GameState";
import { GAME_VERSION } from "./GameVersion";
import { maximumMana } from "./Mana";
import { deriveAccuracy } from "./MeleeRules";
import { levelForExperience } from "./Progression";
import {
	type ConsumableKind,
	type RunUsage,
	USAGE_CONSUMABLE_KINDS,
} from "./RunUsage";

export type RunCheckpoint = {
	gameVersion: string;
	turn: number;
	level: number;
	experience: number;
	attributes: { strength: number; dexterity: number; intelligence: number };
	attack: number;
	armor: number;
	evadeChance: number;
	magicResistance: number;
	health: number;
	maxHealth: number;
	mana: number;
	maxMana: number;
	gold: number;
	supplies: RunUsage["consumables"];
	equipment: Record<
		EquipmentSlot,
		{ kind: ItemKind; enchantment: number } | null
	>;
};
export const FLOOR_EXIT_REASONS = [
	"stairs",
	"runic-portal",
	"arena-gate",
	"town-gate",
	"town-scroll",
] as const;
export type FloorExitReason = (typeof FLOOR_EXIT_REASONS)[number];
export type FloorRecord = {
	floorNumber: number;
	visits: number;
	firstEntry: RunCheckpoint;
	lastExit?: {
		toFloor: number | null;
		reason: FloorExitReason;
		snapshot: RunCheckpoint;
	};
};
export type FloorTelemetry = {
	activeFloor: number | null;
	floors: FloorRecord[];
	final?: {
		floorNumber: number | null;
		outcome: "won" | "died";
		snapshot: RunCheckpoint;
	};
};

// Capture only at transitions/end, never while ordinary turns or UI actions run.
// Use the same derived values as combat and count carried supplies, not town stock.
export const captureCheckpoint = (
	state: Pick<
		GameState,
		| "turn"
		| "progression"
		| "equipment"
		| "effects"
		| "afflictions"
		| "player"
		| "mana"
		| "gold"
		| "bag"
	>,
): RunCheckpoint => {
	const attributes = deriveAttributes(
		state.progression,
		state.effects,
		state.equipment,
	);
	const combat = deriveCombatStats(
		state.equipment,
		state.progression,
		state.effects,
		state,
	);
	const supplies: RunUsage["consumables"] = {};
	for (const item of state.bag.items) {
		const kind = item.kind as ConsumableKind;
		if (USAGE_CONSUMABLE_KINDS.includes(kind))
			supplies[kind] = (supplies[kind] ?? 0) + 1;
	}
	return {
		gameVersion: GAME_VERSION,
		turn: state.turn,
		level: levelForExperience(state.progression.experience),
		experience: state.progression.experience,
		attributes: {
			strength: attributes.strength,
			dexterity: attributes.dexterity,
			intelligence: attributes.intelligence,
		},
		attack: combat.attack,
		armor: combat.armor,
		magicResistance: combat.magicResistance,
		evadeChance: deriveAccuracy(
			state.progression,
			state.effects,
			state.equipment,
			state.afflictions,
			state.player,
		).evadeChance,
		health: state.player.health,
		maxHealth: state.player.maxHealth,
		mana: state.mana,
		maxMana: maximumMana(
			state.progression,
			state.equipment,
			state.effects,
			state.afflictions,
		),
		gold: state.gold,
		supplies,
		equipment: Object.fromEntries(
			Object.entries(state.equipment).map(([slot, item]) => [
				slot,
				item ? { kind: item.kind, enchantment: item.enchantment ?? 0 } : null,
			]),
		) as RunCheckpoint["equipment"],
	};
};

export const createFloorTelemetry = (state: GameState): FloorTelemetry =>
	state.town
		? { activeFloor: null, floors: [] }
		: {
				activeFloor: state.run.activeFloor,
				floors: [
					{
						floorNumber: state.run.activeFloor,
						visits: 1,
						firstEntry: captureCheckpoint(state),
					},
				],
			};

// Floor changes are observed before the destination's monster response. A town
// scroll instead closes the visit after its response, when town is restored.
export const recordFloorTransition = (
	before: GameState,
	after: GameState,
	reason: FloorExitReason,
): GameState => {
	const telemetry = after.floorTelemetry;
	if (!telemetry || telemetry.final) return after;
	const destination = after.town ? null : after.run.activeFloor;
	if (telemetry.activeFloor === destination) return after;
	let floors = telemetry.floors;
	if (telemetry.activeFloor !== null) {
		const snapshot = captureCheckpoint(destination === null ? after : before);
		floors = floors.map((floor) =>
			floor.floorNumber === telemetry.activeFloor
				? { ...floor, lastExit: { toFloor: destination, reason, snapshot } }
				: floor,
		);
	}
	if (destination !== null) {
		const previous = floors.find((floor) => floor.floorNumber === destination);
		floors = previous
			? floors.map((floor) =>
					floor === previous ? { ...floor, visits: floor.visits + 1 } : floor,
				)
			: [
					...floors,
					{
						floorNumber: destination,
						visits: 1,
						firstEntry: captureCheckpoint(after),
					},
				].sort((a, b) => a.floorNumber - b.floorNumber);
	}
	return {
		...after,
		floorTelemetry: { ...telemetry, activeFloor: destination, floors },
	};
};

export const recordFinalCheckpoint = (state: GameState): GameState => {
	if (
		!state.floorTelemetry ||
		state.floorTelemetry.final ||
		(state.player.health > 0 && !state.quest.victory)
	)
		return state;
	return {
		...state,
		floorTelemetry: {
			...state.floorTelemetry,
			activeFloor: null,
			final: {
				floorNumber: state.town ? null : state.run.activeFloor,
				outcome: state.quest.victory ? "won" : "died",
				snapshot: captureCheckpoint(state),
			},
		},
	};
};
