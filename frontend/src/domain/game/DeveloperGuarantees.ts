import { createSeededRandom, hashStringToUint32 } from "../dungeon/Seed";
import { placeRunRareFinds } from "../items/RareFinds";
import { placeMerchants } from "../merchant/MerchantPlacement";
import {
	coordinateKey,
	orthogonalDistance,
	protectedFloorLocations,
} from "../monsters/MonsterLocations";
import { maximumMonsterHealth } from "../monsters/MonsterStats";
import { placeTreasureThieves } from "../monsters/TreasureThief";
import { altarFloors, altarId } from "../objects/DarkAltar";
import {
	type DungeonObjectKind,
	OBJECT_DEFINITIONS,
} from "../objects/DungeonObject";
import { isMimicChest } from "../objects/MimicChests";
import { addOptionalEliteRooms } from "../objects/OptionalEliteRooms";
import { reachableRoomTiles } from "../objects/RareDiscoveryPlacement";
import { carveFloorVault, VAULT_MIN_FLOOR } from "../objects/SecretVaults";
import {
	DEVELOPER_FEATURES,
	type DeveloperFeature,
	RARE_DISCOVERY_KINDS,
} from "./DeveloperFeatures";
import type { GameState } from "./GameState";
import { OMEN_MIN_FLOOR, type OmenKind } from "./Omens";

export class DeveloperGuaranteeError extends Error {}
export const hasDeveloperFeature = (
	state: GameState,
	feature: DeveloperFeature,
): boolean => {
	switch (feature) {
		case "omens":
			return state.omens.length > 0;
		case "arena":
			return state.arenas.length > 0;
		case "pacts":
			return state.objects.some((o) => o.kind === "dark-altar");
		case "thieves":
			return state.monsters.some((m) => m.kind === "treasure-thief");
		case "mimics":
			return (
				state.monsters.some((m) => m.kind === "treasure-mimic") ||
				state.objects.some((o) =>
					isMimicChest(state.run.seed, o, state.disabledFeatures),
				)
			);
		case "vaults":
			return state.objects.some((o) => o.kind === "cracked-wall");
		case "discoveries":
			return state.objects.some((o) =>
				(RARE_DISCOVERY_KINDS as readonly string[]).includes(o.kind),
			);
		case "elites":
			return state.objects.some((o) => o.kind === "elite-door");
		case "merchants":
			return state.objects.some((o) => o.kind === "merchant");
		case "rareFinds":
			return state.floorItems.some((i) => i.item.id.startsWith("rare-find:"));
	}
};

// An independent stream and stable feature order leave ordinary generation unchanged.
const randomFor = (state: GameState, feature: DeveloperFeature) =>
	createSeededRandom(
		hashStringToUint32(`${state.run.seed}:developer-guarantee:${feature}`),
	);
const eligibleFloors = (state: GameState) =>
	state.run.floors.filter(
		(f) => !state.arenas.some((a) => a.floorNumber === f.floorNumber),
	);
const locationFor = (
	state: GameState,
	feature: DeveloperFeature,
	eligible: (floor: number) => boolean,
	interior = false,
	distance = 0,
) => {
	const candidates = eligibleFloors(state)
		.filter((f) => eligible(f.floorNumber))
		.flatMap((floor) => {
			const origin =
				floor.upStair?.coordinate ??
				(floor.floorNumber === state.run.activeFloor
					? state.run.playerCoordinate
					: undefined);
			if (!origin) return [];
			const taken = new Set(
				[
					...protectedFloorLocations(state.run, floor.floorNumber),
					...(floor.floorNumber === state.run.activeFloor
						? [state.run.playerCoordinate]
						: []),
					...[...state.objects, ...state.monsters, ...state.floorItems]
						.filter((e) => e.floorNumber === floor.floorNumber)
						.map((e) => e.coordinate),
				].map(coordinateKey),
			);
			return reachableRoomTiles(
				state.run,
				floor.floorNumber,
				origin,
				state.objects,
			)
				.filter(
					(tile) =>
						!taken.has(coordinateKey(tile)) &&
						orthogonalDistance(tile, origin) >= distance &&
						(!interior ||
							floor.rooms.some(
								(r) =>
									tile.row > r.startRow &&
									tile.row < r.endRow &&
									tile.col > r.startCol &&
									tile.col < r.endCol,
							)),
				)
				.map((coordinate) => ({ floorNumber: floor.floorNumber, coordinate }));
		});
	return candidates.length
		? candidates[Math.floor(randomFor(state, feature)() * candidates.length)]
		: undefined;
};
const addObject = (
	state: GameState,
	feature: DeveloperFeature,
	kind: DungeonObjectKind,
	eligible: (floor: number) => boolean,
	interior = false,
	distance = 0,
): GameState => {
	const location = locationFor(state, feature, eligible, interior, distance);
	if (!location) return state;
	return {
		...state,
		objects: [
			...state.objects,
			{
				...location,
				kind,
				id:
					kind === "dark-altar"
						? altarId(location.floorNumber)
						: `floor:${location.floorNumber}:object:${kind}:${kind === "chest" ? "mimic" : "1"}`,
				activated: false,
			},
		],
	};
};
const addMissing = (state: GameState, feature: DeveloperFeature): GameState => {
	// Placement helpers must never put extra content inside the fixed arena floor.
	const run = {
		...state.run,
		floors: state.run.floors.map((f) =>
			state.arenas.some((a) => a.floorNumber === f.floorNumber)
				? { ...f, rooms: [] }
				: f,
		),
	};
	switch (feature) {
		case "omens": {
			const floors = eligibleFloors(state).filter(
				(f) =>
					f.floorNumber >= OMEN_MIN_FLOOR &&
					f.floorNumber < state.run.floors.length,
			);
			if (!floors.length) return state;
			const random = randomFor(state, feature);
			// These omens have no gatherings: adding one never removes or relocates content.
			const kinds: OmenKind[] = [
				"bloodied",
				"ember-lit",
				"echoing-halls",
				"arcane-surge",
			];
			return {
				...state,
				omens: [
					{
						floorNumber:
							floors[Math.floor(random() * floors.length)].floorNumber,
						kind: kinds[Math.floor(random() * kinds.length)],
					},
				],
			};
		}
		case "pacts":
			return addObject(
				state,
				feature,
				"dark-altar",
				(f) => altarFloors(run.floors.length).includes(f),
				false,
				3,
			);
		case "mimics": {
			const chests = state.objects.filter(
				(o) =>
					o.kind === "chest" &&
					o.floorNumber >= 4 &&
					!state.arenas.some((a) => a.floorNumber === o.floorNumber),
			);
			if (!chests.length)
				return addObject(
					state,
					feature,
					"chest",
					(f) =>
						f >= 4 &&
						!state.objects.some(
							(o) => o.kind === "chest" && o.floorNumber === f,
						),
				);
			const chest =
				chests[Math.floor(randomFor(state, feature)() * chests.length)];
			return {
				...state,
				objects: state.objects.map((o) =>
					o === chest ? { ...o, id: `${o.id}:mimic` } : o,
				),
			};
		}
		case "vaults": {
			const floors = eligibleFloors(state).filter(
				(f) => f.floorNumber >= VAULT_MIN_FLOOR,
			);
			const random = randomFor(state, feature);
			while (floors.length) {
				const [floor] = floors.splice(Math.floor(random() * floors.length), 1);
				const vault = carveFloorVault(
					floor,
					(count) => Math.floor(random() * count),
					random,
				);
				if (vault)
					return {
						...state,
						run: {
							...state.run,
							floors: state.run.floors.map((f) =>
								f === floor ? vault.floor : f,
							),
						},
						objects: [...state.objects, ...vault.objects],
						floorItems: [...state.floorItems, ...vault.floorItems],
					};
			}
			return state;
		}
		case "discoveries": {
			const kinds = [...RARE_DISCOVERY_KINDS];
			const random = randomFor(state, feature);
			while (kinds.length) {
				const [kind] = kinds.splice(Math.floor(random() * kinds.length), 1);
				const definition = OBJECT_DEFINITIONS[kind];
				const next = addObject(
					state,
					feature,
					kind,
					(f) =>
						f >= definition.minFloor &&
						f <= definition.maxFloor &&
						(kind !== "runic-portal" || f < run.floors.length),
					true,
				);
				if (next !== state) return next;
			}
			return state;
		}
		case "elites": {
			const added = addOptionalEliteRooms({ ...state, run }, { chance: 1 });
			const gate = added.objects.find(
				(o) => !state.objects.some((old) => old.id === o.id),
			);
			const champion =
				gate &&
				added.monsters.find((m) => m.id === `${gate.floorNumber}:20001`);
			return gate && champion
				? {
						...state,
						objects: [...state.objects, gate],
						monsters: [
							...state.monsters,
							{
								...champion,
								health: maximumMonsterHealth(
									champion.kind,
									state.difficulty,
									champion.floorNumber,
								),
							},
						],
					}
				: state;
		}
		case "merchants":
			return { ...state, objects: placeMerchants({ ...state, run }, true) };
		case "rareFinds":
			return {
				...state,
				floorItems: [
					...state.floorItems,
					...placeRunRareFinds(
						run,
						state.monsters,
						state.floorItems,
						state.objects,
						true,
					),
				],
			};
		case "thieves":
			return {
				...state,
				monsters: [
					...state.monsters,
					...placeTreasureThieves(
						run,
						state.monsters,
						state.floorItems,
						state.objects,
						state.difficulty,
					),
				],
			};
		case "arena":
			return state; // The fixed arena requires the normal minimum depth.
	}
};
export const applyDeveloperGuarantees = (
	initial: GameState,
	selected: readonly DeveloperFeature[],
): GameState => {
	if (!selected.length) return initial;
	const guaranteed = (
		Object.keys(DEVELOPER_FEATURES) as DeveloperFeature[]
	).filter((f) => selected.includes(f));
	let state = initial;
	for (const feature of guaranteed) {
		if (!hasDeveloperFeature(state, feature))
			state = addMissing(state, feature);
		if (!hasDeveloperFeature(state, feature))
			throw new DeveloperGuaranteeError(
				`Cannot guarantee ${DEVELOPER_FEATURES[feature].toLowerCase()} in this dungeon. Try a deeper dungeon, larger dimensions or another seed.`,
			);
	}
	return {
		...state,
		developerRun: true,
		guaranteedFeatures: guaranteed,
		ranked: undefined,
		rankingVersion: undefined,
	};
};
