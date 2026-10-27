import type { DungeonFloor } from "../dungeon/DungeonRun";
import type { Coordinate } from "../dungeon/DungeonTypes";
import type {
	FogConfiguration,
	RunConfiguration,
} from "../dungeon/RunConfiguration";
import type { Difficulty } from "../game/Difficulty";
import type { GameState } from "../game/GameState";
import type { PactKind } from "../game/Pacts";
import type { PerkChoice } from "../game/Perks";
import type { PermanentAttributes } from "../game/PermanentAttributes";

// Explicit persisted fields keep incidental UI/runtime additions out of the format.
// Pre-release: only the current format loads. Breaking changes bump the version.
type SavedFloor = Pick<
	DungeonFloor,
	"floorNumber" | "partitions" | "rooms" | "corridors" | "upStair" | "downStair"
> & { terrain: string[] };
export type SaveDocument = {
	version: 33;
	savedAt: string;
	configuration: RunConfiguration & {
		difficulty: Difficulty;
	};
	fog: FogConfiguration;
	state: Pick<
		GameState,
		| "afflictions"
		| "townPortal"
		| "displacedFloors"
		| "hunger"
		| "omens"
		| "arenas"
		| "ranked"
		| "rankingVersion"
		| "developerRun"
		| "disabledFeatures"
		| "runId"
		| "usage"
		| "encounters"
		| "townEquipmentStock"
		| "townEquipmentPurchases"
		| "townPotionStock"
		| "townScrollStock"
		| "townStorage"
		| "town"
		| "gold"
		| "merchantStock"
		| "escape"
		| "turn"
		| "objects"
		| "mana"
		| "knownSpells"
		| "spellHotbar"
		| "effects"
		| "quest"
		| "monstersDefeated"
		| "player"
		| "equipment"
		| "bag"
		| "potionHotbar"
		| "floorItems"
		| "monsters"
		| "activityHistory"
	> & {
		run: {
			seed: number;
			activeFloor: number;
			playerCoordinate: Coordinate;
			floors: SavedFloor[];
		};
		progression: {
			experience: number;
			permanentAttributes: PermanentAttributes;
			perks: PerkChoice[];
			pact?: PactKind;
		};
	};
	explored: { floorNumber: number; rows: string[] }[];
};
