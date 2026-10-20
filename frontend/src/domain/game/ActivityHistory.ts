import type { Coordinate } from "../dungeon/DungeonTypes";
import type { ConsumptionEvent } from "../items/Consumables";
import type { EquipmentChangeEvent } from "../items/EquipmentChanges";
import type { FloorItemEvent } from "../items/FloorItems";
import type { ItemKind } from "../items/Item";
import type { MonsterKind } from "../monsters/Monster.ts";
import type { SanctuaryCondition, SanctuaryService } from "../town/Sanctuary";
import type { AfflictionKind } from "./AfflictionDefinitions";
import type { AreaElement, DamageElement } from "./DamageElements";
import type { SpellKind } from "./Spells";
import type { EffectKind } from "./TimedEffects";

export type ActivityEvent = { turn: number } & (
	| {
			type: "sanctuary-treated";
			service: SanctuaryService;
			gold: number;
			health: number;
			conditions: readonly SanctuaryCondition[];
	  }
	| {
			type: "affliction-changed";
			condition: AfflictionKind;
			change: "applied" | "refreshed" | "rejected" | "cured" | "expired";
			source: string;
	  }
	| { type: "player-spell-hit"; spell: SpellKind; damage: number }
	| {
			type: "monster-door-opened";
			monster: MonsterKind;
			actorId: string;
			objectId: string;
	  }
	| { type: "equipment-enchanted"; item: ItemKind; enchantment: number }
	| { type: "merchant-bought" | "merchant-sold"; item: ItemKind; gold: number }
	| {
			type: "monster-alarm-prepared" | "monster-alarm-sounded";
			actorId: string;
			monster: MonsterKind;
			target: Coordinate;
	  }
	| {
			type: "monster-charge-prepared";
			actorId: string;
			monster: MonsterKind;
			target: Coordinate;
	  }
	| { type: "monster-charge-hit"; monster: MonsterKind; damage: number }
	| {
			type: "monster-charge-ended";
			actorId: string;
			monster: MonsterKind;
			outcome: "blocked" | "avoided" | "missed" | "interrupted";
	  }
	| { type: "escape-started" }
	| { type: "escape-floor-activated"; floorNumber: number }
	| {
			type: "monster-awareness-changed";
			monster: MonsterKind;
			awareness: "idle" | "pursuing" | "searching";
	  }
	| {
			type: "discovery-opened";
			kind: import("../objects/DungeonObject").DungeonObjectKind;
			item: ItemKind;
			damage: number;
	  }
	| {
			type: "object-seen";
			kind: import("../objects/DungeonObject").DungeonObjectKind;
			activated: boolean;
	  }
	| {
			type: "well-offered";
			gold: 50 | 100 | 250;
			outcome: "positive" | "neutral" | "negative";
			item?: ItemKind;
			attribute?: "strength" | "dexterity" | "intelligence";
			escaped: boolean;
	  }
	| { type: "library-learned"; spell: SpellKind; gold: number }
	| {
			type: "town-forged";
			item: ItemKind;
			enchantment: number;
			gold: number;
	  }
	| {
			type: "forge-used";
			service: "reliable" | "risky";
			outcome: "improved" | "unchanged" | "destroyed";
			item: ItemKind;
			enchantment: number;
			gold: number;
	  }
	| {
			type: "sarcophagus-opened";
			outcome: "treasure" | "guardian" | "both" | "empty";
			escaped: boolean;
	  }
	| { type: "shrine-offered"; gold: number }
	| {
			type: "throne-used";
			outcome: import("../objects/DungeonThrones").ThroneOutcome;
	  }
	| { type: "throne-wound"; damage: number }
	| { type: "fountain-restored"; health: number; mana: number }
	| { type: "fountain-poisoned"; damage: number }
	| { type: "trap-disarmed" }
	| { type: "trap-sprung"; damage: number }
	| { type: "chest-opened"; item: ItemKind }
	| { type: "gold-collected"; amount: number }
	| {
			type: "spell-hit";
			spell: SpellKind;
			monster: MonsterKind;
			damage: number;
	  }
	| {
			type: "condition-applied";
			monster: MonsterKind;
			condition: EffectKind;
			duration: number;
	  }
	| {
			type: "condition-hit";
			condition: EffectKind;
			monster: MonsterKind;
			damage: number;
	  }
	| {
			type: "player-condition-applied";
			condition: EffectKind;
			duration: number;
	  }
	| { type: "spell-repositioned"; spell: SpellKind; monster?: MonsterKind }
	| { type: "player-condition-hit"; condition: AfflictionKind; damage: number }
	| { type: "monster-regenerated"; monster: MonsterKind; recovered: number }
	| {
			type: "monster-spell-hit";
			monster: MonsterKind;
			spell: SpellKind;
			damage: number;
	  }
	| {
			type: "monster-spell-healed";
			monster: MonsterKind;
			spell: SpellKind;
			recovered: number;
	  }
	| {
			type: "monster-resisted" | "monster-vulnerable";
			monster: MonsterKind;
			element: DamageElement;
			damage: number;
	  }
	| {
			type: "monster-area-prepared";
			monster: MonsterKind;
			element: AreaElement;
			target: Coordinate;
			radius: number;
			remaining: number;
	  }
	| {
			type: "monster-area-hit";
			monster: MonsterKind;
			element: AreaElement;
			damage: number;
	  }
	| {
			type: "monster-area-avoided" | "monster-area-blocked";
			monster: MonsterKind;
			element: AreaElement;
	  }
	| { type: "door-changed"; opened: boolean }
	| { type: "player-mana-drained"; monster: MonsterKind; mana: number }
	| { type: "monster-hex-hit"; monster: MonsterKind; damage: number }
	| { type: "spell-healed"; spell: SpellKind; recovered: number }
	| {
			type:
				| "player-hit"
				| "monster-hit"
				| "monster-withdrawal-hit"
				| "monster-shot-hit"
				| "monster-heavy-hit";
			monster: MonsterKind;
			damage: number;
	  }
	| {
			type:
				| "monster-prepared"
				| "monster-web-prepared"
				| "monster-hex-prepared";
			monster: MonsterKind;
			target: Coordinate;
	  }
	| {
			type:
				| "monster-heavy-missed"
				| "monster-heavy-avoided"
				| "monster-web-hit"
				| "monster-web-avoided"
				| "monster-hex-avoided"
				| "monster-shot-missed"
				| "player-missed"
				| "monster-missed"
				| "monster-withdrawal-missed";
			monster: MonsterKind;
	  }
	| { type: "monster-died"; monster: MonsterKind }
	| { type: "experience-gained"; amount: number }
	| { type: "level-gained"; level: number; healthGain: number }
	| {
			type: "attribute-gained";
			attribute: "Strength" | "Dexterity" | "Intelligence";
			value: number;
	  }
	| { type: "player-died" }
	| { type: "quest-completed" }
	| { type: "entrance-reminder"; goalFloor: number }
	| EquipmentChangeEvent
	| FloorItemEvent
	| ConsumptionEvent
	| { type: "monster-loot"; monster: MonsterKind; item: ItemKind }
	| { type: "items-seen"; items: readonly ItemKind[] }
	| { type: "floor-changed"; fromFloor: number; toFloor: number }
	| { type: "exit-scroll-used"; fromFloor: number; destination?: "town" }
	| { type: "town-portal-returned"; toFloor: number }
);

export type ActivityEntry = { id: number; event: ActivityEvent };
export type ActivityHistory = {
	entries: readonly ActivityEntry[];
	nextId: number;
};
export const ACTIVITY_LOG_LIMIT = 100;

export const createActivityHistory = (): ActivityHistory => ({
	entries: [],
	nextId: 0,
});

export const appendActivityEvents = (
	history: ActivityHistory,
	events: readonly ActivityEvent[],
): ActivityHistory => {
	if (events.length === 0) return history;
	const added = events.map((event, index) => ({
		id: history.nextId + index,
		event,
	}));
	return {
		entries: [...history.entries, ...added].slice(-ACTIVITY_LOG_LIMIT),
		nextId: history.nextId + events.length,
	};
};
