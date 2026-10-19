import type { DungeonFloor } from "../dungeon/DungeonRun";
import type { Coordinate } from "../dungeon/DungeonTypes";
import type {
	FogConfiguration,
	RunConfiguration,
} from "../dungeon/RunConfiguration";
import type { Difficulty } from "../game/Difficulty";
import type { GameState } from "../game/GameState";
import type { PermanentAttributes } from "../game/PermanentAttributes";

// Explicit persisted fields keep incidental UI/runtime additions out of the format.
// v27 is the pre-public-release compatibility baseline; older formats are retired.
type SavedFloor = Pick<
	DungeonFloor,
	"floorNumber" | "partitions" | "rooms" | "corridors" | "upStair" | "downStair"
> & { terrain: string[] };
export type SaveDocument = {
	version: 27;
	savedAt: string;
	configuration: RunConfiguration & {
		difficulty: Difficulty;
	};
	fog: FogConfiguration;
	state: Pick<
		GameState,
		| "dungeonRemedies"
		| "afflictions"
		| "rareEquipment"
		| "townPortal"
		| "townEquipmentStock"
		| "townEquipmentPurchases"
		| "townPotionStock"
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
		};
	};
	explored: { floorNumber: number; rows: string[] }[];
};
