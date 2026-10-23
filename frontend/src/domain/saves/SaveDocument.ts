import type { DungeonFloor } from "../dungeon/DungeonRun";
import type { Coordinate } from "../dungeon/DungeonTypes";
import type {
	FogConfiguration,
	RunConfiguration,
} from "../dungeon/RunConfiguration";
import type { Difficulty } from "../game/Difficulty";
import type { GameState } from "../game/GameState";
import type { PerkChoice } from "../game/Perks";
import type { PermanentAttributes } from "../game/PermanentAttributes";

// Explicit persisted fields keep incidental UI/runtime additions out of the format.
// Pre-release: only the current format loads. Breaking changes bump the version.
type SavedFloor = Pick<
	DungeonFloor,
	"floorNumber" | "partitions" | "rooms" | "corridors" | "upStair" | "downStair"
> & { terrain: string[] };
export type SaveDocument = {
	version: 32;
	savedAt: string;
	configuration: RunConfiguration & {
		difficulty: Difficulty;
	};
	fog: FogConfiguration;
	state: Pick<
		GameState,
		| "afflictions"
		| "rareEquipment"
		| "townPortal"
		| "displacedFloors"
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
		};
	};
	explored: { floorNumber: number; rows: string[] }[];
};
