export const RELIQUARY_HEALTH_COST = 10;
export const TRAP_DISARM_EXPERIENCE = 5;

import type { Coordinate } from "../dungeon/DungeonTypes";
export const OBJECT_DEFINITIONS = {
	sarcophagus: {
		name: "Ancient sarcophagus",
		freshLabel: "sealed ancient sarcophagus",
		usedLabel: "opened ancient sarcophagus",
		minFloor: 2,
		maxFloor: 20,
		maxPerFloor: 1,
		chance: 0.2,
		placement: "rare-discovery",
	},
	merchant: {
		name: "Wandering potion merchant",
		freshLabel: "potion merchant",
		usedLabel: "potion merchant",
		minFloor: 5,
		maxFloor: 19,
		maxPerFloor: 1,
		chance: 1,
		placement: "merchant",
	},
	"elite-door": {
		name: "Elite chamber gate",
		freshLabel: "closed skull-marked elite gate",
		usedLabel: "open skull-marked elite gate",
		minFloor: 8,
		maxFloor: 20,
		maxPerFloor: 1,
		chance: 0.2,
		placement: "elite-room",
	},
	door: {
		name: "Door",
		freshLabel: "closed door",
		usedLabel: "open door",
		minFloor: 1,
		maxFloor: 20,
		maxPerFloor: 2,
		chance: 1,
		placement: "passage",
	},
	shrine: {
		name: "Shrine of insight",
		freshLabel: "shrine of insight",
		usedLabel: "spent shrine",
		minFloor: 3,
		maxFloor: 20,
		maxPerFloor: 1,
		chance: 0.3,
		placement: "room",
	},
	throne: {
		name: "Forgotten throne",
		freshLabel: "forgotten throne",
		usedLabel: "spent throne",
		minFloor: 4,
		maxFloor: 20,
		maxPerFloor: 1,
		chance: 0.25,
		placement: "room",
	},
	fountain: {
		name: "Ancient fountain",
		freshLabel: "ancient fountain",
		usedLabel: "dry fountain",
		minFloor: 2,
		maxFloor: 20,
		maxPerFloor: 1,
		chance: 0.45,
		placement: "room",
	},
	trap: {
		name: "Visible trap",
		freshLabel: "visible trap",
		usedLabel: "spent trap",
		minFloor: 2,
		maxFloor: 20,
		maxPerFloor: 2,
		chance: 0.6,
		placement: "room",
	},
	chest: {
		name: "Treasure chest",
		freshLabel: "treasure chest",
		usedLabel: "opened chest",
		minFloor: 1,
		maxFloor: 20,
		maxPerFloor: 1,
		chance: 0.8,
		placement: "room",
	},
	gold: {
		name: "Gold",
		freshLabel: "gold coins",
		usedLabel: "empty coin cache",
		minFloor: 1,
		maxFloor: 20,
		maxPerFloor: 2,
		chance: 1,
		placement: "room",
	},
	reliquary: {
		name: "Sealed reliquary",
		freshLabel: "sealed reliquary",
		usedLabel: "opened reliquary",
		minFloor: 8,
		maxFloor: 20,
		maxPerFloor: 1,
		chance: 0.12,
		placement: "room",
	},
	archive: {
		name: "Abandoned spell archive",
		freshLabel: "abandoned spell archive",
		usedLabel: "searched archive",
		minFloor: 3,
		maxFloor: 20,
		maxPerFloor: 1,
		chance: 0.12,
		placement: "room",
	},
} as const;
export type DungeonObjectKind = keyof typeof OBJECT_DEFINITIONS;
export type DungeonObject = Readonly<{
	id: string;
	kind: DungeonObjectKind;
	floorNumber: number;
	coordinate: Coordinate;
	activated: boolean;
	sarcophagusOutcome?: import("./AncientSarcophagi").SarcophagusOutcome;
}>;
export const objectLabel = (
	object: Pick<DungeonObject, "kind" | "activated">,
): string =>
	object.activated
		? OBJECT_DEFINITIONS[object.kind].usedLabel
		: OBJECT_DEFINITIONS[object.kind].freshLabel;

export const isDoor = (object: Pick<DungeonObject, "kind">): boolean =>
	object.kind === "door" || object.kind === "elite-door";
