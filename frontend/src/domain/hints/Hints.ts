import type { ActivityEvent } from "../game/ActivityHistory";
import { AFFLICTION_DEFINITIONS } from "../game/AfflictionDefinitions";
import type { GameState } from "../game/GameState";
import { BAG_CAPACITY, bagSlots } from "../items/Bag";
import { equipmentSlotFor } from "../items/Equipment";
import { OBJECT_DEFINITIONS } from "../objects/DungeonObject";

// Each hint is shown at most once per browser; the id is its "seen" key.
export const HINT_IDS = [
	"affliction",
	"rare-discovery",
	"telegraph",
	"alarm",
	"bleeding",
	"town-portal",
	"bag-full",
	"gear-drag",
] as const;
export type HintId = (typeof HINT_IDS)[number];
export type Hint = Readonly<{
	id: HintId;
	title: string;
	text: string;
	// The Help element id that explains the mechanic in full.
	help: string;
}>;

// Help sections for the rare discoveries that have one.
const DISCOVERY_HELP: Partial<Record<string, string>> = {
	sarcophagus: "help-sarcophagi",
	hourglass: "help-hourglass",
	"runic-portal": "help-runic-portal",
	mirror: "help-mirror",
	well: "help-well",
	forge: "help-forge",
};

const eventHint = (event: ActivityEvent): Hint | undefined => {
	switch (event.type) {
		case "affliction-changed": {
			if (event.change !== "applied") return;
			const definition = AFFLICTION_DEFINITIONS[event.condition];
			return {
				id: "affliction",
				title: `You have a condition: ${definition.name}`,
				text: `${definition.appliedText} Select its icon in the player bar to see the time left and its cure.`,
				help: "help-status-effects",
			};
		}
		case "object-seen": {
			const definition = OBJECT_DEFINITIONS[event.kind];
			if (definition.placement !== "rare-discovery" || event.activated) return;
			return {
				id: "rare-discovery",
				title: `Rare discovery: ${definition.name}`,
				text: "A one-use find with its own risks and rewards. Stand next to it and press Enter; the notice below the map describes what it offers before you commit.",
				help: DISCOVERY_HELP[event.kind] ?? "help-sarcophagi",
			};
		}
		case "monster-charge-prepared":
		case "monster-area-prepared":
			return {
				id: "telegraph",
				title: "Telegraphed attack",
				text: "A monster has marked tiles for a heavy attack. Step off the marked tiles with your next action to dodge it; it can't re-aim.",
				help: "help-enemy-tactics",
			};
		case "monster-alarm-sounded":
			return {
				id: "alarm",
				title: "The alarm is sounding",
				text: "The sentry keeps calling monsters into its room until it's killed. Kill it quickly, or leave before the room fills.",
				help: "help-enemy-tactics",
			};
		case "player-condition-hit":
			return event.condition === "bleeding"
				? {
						id: "bleeding",
						title: "Bleeding",
						text: "Every step costs 1 health, and it can kill. Waiting and attacking don't bleed. Bandages or the sanctuary stop it; healing doesn't.",
						help: "help-status-effects",
					}
				: undefined;
	}
};

// Hints for what just happened: the new Activity entries, plus a few state changes
// the log doesn't describe. Purely presentational; nothing here is saved.
export const detectHints = (
	previous: GameState,
	next: GameState,
): readonly Hint[] => {
	const hints: Hint[] = [];
	for (const { id, event } of next.activityHistory.entries) {
		if (id < previous.activityHistory.nextId) continue;
		const hint = eventHint(event);
		if (hint) hints.push(hint);
	}
	if (!previous.townPortal && next.townPortal)
		hints.push({
			id: "town-portal",
			title: "Town portal",
			text: `The circle west of the beacon now leads back to floor ${next.townPortal.floorNumber}. Stand on it and press Enter to return; it closes after one use.`,
			help: "help-town-portals",
		});
	const full = (state: GameState) => bagSlots(state.bag).length >= BAG_CAPACITY;
	if (!full(previous) && full(next))
		hints.push({
			id: "bag-full",
			title: "Your bag is full",
			text: "Nothing new fits until you make room. Drop or sell items, or move them to the storage chest in town.",
			help: "help-equipment",
		});
	const carried = new Set(previous.bag.items.map((item) => item.id));
	if (
		next.bag.items.some(
			(item) => !carried.has(item.id) && equipmentSlotFor(item) !== null,
		)
	)
		hints.push({
			id: "gear-drag",
			title: "New gear",
			text: "Open Character (C) and drag it onto a slot to wear it, or focus it and press M to move it by keyboard.",
			help: "help-equipment",
		});
	// The first of each kind wins when one action triggers it twice.
	return hints.filter(
		(hint, index) => hints.findIndex((other) => other.id === hint.id) === index,
	);
};
