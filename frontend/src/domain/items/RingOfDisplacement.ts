import { appendActivityEvents } from "../game/ActivityHistory";
import type { GameState } from "../game/GameState";
import { repositionSpell } from "../game/RepositionSpells";
import { SPELL_DEFINITIONS } from "../game/Spells";
import { ITEM_DEFINITIONS, type ItemDefinition } from "./Item";

// Below this share of maximum health after a monster phase's hits, the ring Blinks you.
export const DISPLACEMENT_HEALTH_SHARE = 0.25;

export const wearsDisplacement = (equipment: GameState["equipment"]) =>
	Object.values(equipment).some(
		(item) =>
			item !== null &&
			(ITEM_DEFINITIONS[item.kind] as ItemDefinition).displacement === true,
	);

// Once per floor per adventure: a phase that hurt you and left you alive but below a
// quarter of your maximum health Blinks you as the spell would, at no mana cost. Floors
// it has fired on are saved, so swapping rings or reloading cannot reset it.
export const displaceAfterHits = (
	before: Pick<GameState, "player">,
	after: GameState,
): GameState => {
	const floor = after.run.activeFloor;
	const used = after.displacedFloors ?? [];
	if (
		after.town ||
		after.player.health <= 0 ||
		after.player.health >= before.player.health ||
		after.player.health >= after.player.maxHealth * DISPLACEMENT_HEALTH_SHARE ||
		used.includes(floor) ||
		!wearsDisplacement(after.equipment)
	)
		return after;
	const moved = repositionSpell(
		after,
		"blink",
		0,
		SPELL_DEFINITIONS.blink.range,
	);
	if ("error" in moved) return after;
	// The ring speaks for itself; keep anything the landing reveals, not the spell's line.
	const revealed = moved.state.activityHistory.entries
		.filter(
			(entry) =>
				entry.id >= after.activityHistory.nextId &&
				entry.event.type !== "spell-repositioned",
		)
		.map((entry) => entry.event);
	return {
		...moved.state,
		displacedFloors: [...used, floor],
		activityHistory: appendActivityEvents(after.activityHistory, [
			{ type: "ring-displaced", turn: after.turn },
			...revealed,
		]),
	};
};
