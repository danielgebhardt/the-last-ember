import {
	type ExplorationState,
	updateExploration,
} from "../dungeon/Exploration";
import type {
	FogConfiguration,
	RunConfiguration,
} from "../dungeon/RunConfiguration";
import { difficultyLabel } from "../game/Difficulty";
import type { GameState } from "../game/GameState";
import { omenSightRadius } from "../game/Omens";
import { playerSightRadius } from "../game/PerkEffects";
import { chosenPerks } from "../game/Perks";
import { permanentAttributeGains } from "../game/PermanentAttributes";
import { levelForExperience } from "../game/Progression";
import type { ItemInstance } from "../items/Item";
import { navigationRun } from "../objects/NavigationTerrain";
import type { SaveDocument } from "./SaveDocument";
import { validateSaveDocument } from "./SaveValidation";

export const SAVE_FORMAT_VERSION = 33;
// Bound imported input before parsing. A maximum-size snapshot is measured in the review.
export const MAX_SAVE_BYTES = 4 * 1024 * 1024;

export type { SaveDocument } from "./SaveDocument";
export type RestoredAdventure = {
	state: GameState;
	exploration: ExplorationState;
	configuration: RunConfiguration;
	fog: FogConfiguration;
};
export type SaveResult<T> =
	| { ok: true; value: T }
	| { ok: false; error: string };

const savedItem = (item: ItemInstance) => ({
	id: item.id,
	kind: item.kind,
	...(item.enchantment !== undefined ? { enchantment: item.enchantment } : {}),
});
const nullableItem = (item: ItemInstance | null) =>
	item ? savedItem(item) : null;
export const createSaveDocument = (
	state: GameState,
	exploration: ExplorationState,
	configuration: RunConfiguration,
	fog: FogConfiguration,
	now = new Date(),
): SaveDocument => ({
	version: SAVE_FORMAT_VERSION,
	savedAt: now.toISOString(),
	configuration: { ...configuration, difficulty: state.difficulty },
	fog: { ...fog },
	state: {
		afflictions: state.afflictions.map((a) => ({
			kind: a.kind,
			remaining: a.remaining,
			source: a.source,
		})),
		townPortal: state.townPortal
			? { ...state.townPortal, coordinate: { ...state.townPortal.coordinate } }
			: null,
		...(state.displacedFloors?.length
			? { displacedFloors: [...state.displacedFloors] }
			: {}),
		...(state.hunger ? { hunger: { fedTurn: state.hunger.fedTurn } } : {}),
		omens: state.omens.map((omen) => ({ ...omen })),
		arenas: state.arenas.map((arena) => ({ ...arena })),
		...(state.ranked ? { ranked: true as const } : {}),
		townEquipmentStock: state.townEquipmentStock.map(savedItem),
		townEquipmentPurchases: [...state.townEquipmentPurchases],
		townPotionStock: { ...state.townPotionStock },
		townScrollStock: { ...state.townScrollStock },
		townStorage: state.townStorage.map(savedItem),
		town: state.town
			? { ...state.town, coordinate: { ...state.town.coordinate } }
			: null,
		gold: state.gold,
		merchantStock: { ...state.merchantStock },
		escape: state.escape,
		turn: state.turn,
		objects: state.objects.map(
			({
				id,
				kind,
				floorNumber,
				coordinate,
				activated,
				noticed,
				sarcophagusOutcome,
				forgeResult,
				wellResult,
				mirrorResult,
				portalDestination,
			}) => ({
				id,
				kind,
				floorNumber,
				coordinate: { ...coordinate },
				activated,
				...(noticed ? { noticed } : {}),
				...(sarcophagusOutcome ? { sarcophagusOutcome } : {}),
				...(forgeResult ? { forgeResult: { ...forgeResult } } : {}),
				...(wellResult ? { wellResult: { ...wellResult } } : {}),
				...(mirrorResult ? { mirrorResult: { ...mirrorResult } } : {}),
				...(portalDestination
					? {
							portalDestination: {
								floorNumber: portalDestination.floorNumber,
								coordinate: { ...portalDestination.coordinate },
							},
						}
					: {}),
			}),
		),
		mana: state.mana,
		knownSpells: state.knownSpells,
		spellHotbar: state.spellHotbar,
		effects: state.effects,
		quest: state.quest,
		monstersDefeated: state.monstersDefeated,
		player: state.player,
		progression: {
			...state.progression,
			permanentAttributes: { ...permanentAttributeGains(state.progression) },
			perks: chosenPerks(state.progression).map((choice) => ({ ...choice })),
		},
		equipment: {
			mainHand: nullableItem(state.equipment.mainHand),
			offHand: nullableItem(state.equipment.offHand),
			chest: nullableItem(state.equipment.chest),
			head: nullableItem(state.equipment.head),
			leftRing: nullableItem(state.equipment.leftRing),
			rightRing: nullableItem(state.equipment.rightRing),
		},
		bag: { items: state.bag.items.map(savedItem) },
		potionHotbar: state.potionHotbar,
		floorItems: state.floorItems.map(({ item, floorNumber, coordinate }) => ({
			item: savedItem(item),
			floorNumber,
			coordinate: { ...coordinate },
		})),
		monsters: state.monsters.map(
			({
				id,
				kind,
				floorNumber,
				coordinate,
				health,
				intent,
				lastDamagedTurn,
				awareness,
				alarmUsed,
				heroic,
				remedyDrop,
				summons,
				summonedBy,
				empowered,
				warden,
				reflection,
				theft,
				minibossPhase,
				telegraphTurn,
			}) => ({
				id,
				kind,
				floorNumber,
				coordinate,
				health,
				lastDamagedTurn: lastDamagedTurn ?? null,
				awareness,
				alarmUsed,
				...(heroic !== undefined ? { heroic } : {}),
				...(remedyDrop !== undefined ? { remedyDrop } : {}),
				...(summons !== undefined ? { summons: { ...summons } } : {}),
				...(summonedBy !== undefined ? { summonedBy } : {}),
				...(empowered ? { empowered } : {}),
				...(warden ? { warden: { ...warden } } : {}),
				...(reflection !== undefined ? { reflection: { ...reflection } } : {}),
				...(theft !== undefined ? { theft: { ...theft } } : {}),
				...(minibossPhase !== undefined ? { minibossPhase } : {}),
				...(telegraphTurn !== undefined
					? { telegraphTurn: { ...telegraphTurn } }
					: {}),
				intent:
					intent.type === "idle" || intent.type === "recovering-charge"
						? { type: intent.type }
						: intent.type === "preparing-area"
							? {
									type: "preparing-area",
									target: { ...intent.target },
									radius: intent.radius,
									element: intent.element,
									remaining: intent.remaining,
								}
							: { type: intent.type, target: { ...intent.target } },
			}),
		),
		activityHistory: state.activityHistory,
		run: {
			seed: state.run.seed,
			activeFloor: state.run.activeFloor,
			playerCoordinate: state.run.playerCoordinate,
			floors: state.run.floors.map((floor) => ({
				floorNumber: floor.floorNumber,
				partitions: floor.partitions,
				rooms: floor.rooms,
				corridors: floor.corridors,
				upStair: floor.upStair,
				downStair: floor.downStair,
				terrain: floor.terrain.map((row) => row.join("")),
			})),
		},
	},
	explored: [...exploration.explored].map(([floorNumber, grid]) => ({
		floorNumber,
		rows: grid.map((row) => row.map((seen) => (seen ? "1" : "0")).join("")),
	})),
});

export const serializeSave = (document: SaveDocument): string =>
	JSON.stringify(document);

export const parseSave = (text: string): SaveResult<SaveDocument> => {
	if (new TextEncoder().encode(text).length > MAX_SAVE_BYTES)
		return { ok: false, error: "This save file is too large." };
	let data: unknown;
	try {
		data = JSON.parse(text);
	} catch {
		return { ok: false, error: "This is not a valid adventure save file." };
	}
	return validateSaveDocument(data);
};

// Call only with a document accepted by parseSave; storage and import share that boundary.
export const restoreSave = (document: SaveDocument): RestoredAdventure => {
	const state: GameState = {
		...document.state,
		difficulty: document.configuration.difficulty,
		run: {
			...document.state.run,
			floors: document.state.run.floors.map((floor) => ({
				floorNumber: floor.floorNumber,
				partitions: floor.partitions,
				rooms: floor.rooms,
				corridors: floor.corridors,
				upStair: floor.upStair,
				downStair: floor.downStair,
				terrain: floor.terrain.map((row) => [...row]),
			})),
		},
	};
	const explored = new Map(
		document.explored.map(({ floorNumber, rows }) => [
			floorNumber,
			rows.map((row) => [...row].map((cell) => cell === "1")),
		]),
	);
	const sight = omenSightRadius(
		state,
		playerSightRadius(
			document.fog.radius,
			state.progression,
			state.afflictions,
		),
	);
	const initial = updateExploration(navigationRun(state), sight);
	return {
		state,
		configuration: document.configuration,
		fog: document.fog,
		exploration: updateExploration(navigationRun(state), sight, {
			...initial,
			// Force current sight to be recomputed while retaining every floor's memory.
			origin: { row: -1, col: -1 },
			explored,
		}),
	};
};

export const saveSummary = (document: SaveDocument): string =>
	`Seed ${document.state.run.seed} · ${document.state.town ? "Town · Level 0" : `Floor ${document.state.run.activeFloor} of ${document.state.run.floors.length}`} · Level ${levelForExperience(document.state.progression.experience)} · Turn ${document.state.turn} · ${difficultyLabel(document.configuration.difficulty)}`;
