import { appendActivityEvents } from "../game/ActivityHistory";
import type { GameState } from "../game/GameState";
import { objectAvailable } from "../merchant/MerchantAvailability";
import {
	type DungeonObject,
	type DungeonObjectKind,
	objectLabel,
	RELIQUARY_HEALTH_COST,
	TRAP_DISARM_EXPERIENCE,
} from "./DungeonObject";

const hints: Record<DungeonObjectKind, { fresh: string; spent: string }> = {
	merchant: {
		fresh:
			"Press E within reach to trade. All stalls share finite supplies; successful trades give monsters a turn.",
		spent: "Press E within reach to trade.",
	},
	"elite-door": {
		fresh:
			"Optional elite chamber. Press E to review the danger before opening. Enemies cannot open this gate.",
		spent:
			"Press E within reach to close an unoccupied gate. Its chamber remains optional.",
	},
	reliquary: {
		fresh: `Press E to review the seal’s ${RELIQUARY_HEALTH_COST}-damage cost and rare ring reward.`,
		spent: "Seal broken; any remaining reward is on the floor for G pickup.",
	},
	archive: {
		fresh: "Press E to search for a spellbook or mana supply.",
		spent:
			"Already searched; any remaining reward is on the floor for G pickup.",
	},
	door: {
		fresh: "Bump to open, or press E within reach. Enemies cannot open doors.",
		spent:
			"Press E within reach to close after stepping out of the doorway. Occupied doors cannot close.",
	},
	chest: {
		fresh:
			"Press E within reach to open. On the chest tile, E opens loot selection; G also collects floor items.",
		spent:
			"Already opened; any remaining reward is on the floor. Press E on its tile to choose loot, or G to collect items here.",
	},
	trap: {
		fresh: `Cross for 2–6 damage, or press E within reach to attempt disarm. Success grants ${TRAP_DISARM_EXPERIENCE} XP once; failure springs it.`,
		spent: "Already spent; it cannot hurt you again.",
	},
	fountain: {
		fresh:
			"Press E within reach to choose a safe sip or risky draw. Escape cancels freely.",
		spent: "Dry; no more water remains.",
	},
	throne: {
		fresh:
			"Press E within reach to review the risks of sitting or prying treasure. Escape leaves it untouched.",
		spent: "Its power is spent; it cannot grant another reward.",
	},
	shrine: {
		fresh:
			"Press E within reach to review the gold-for-XP offering. Escape cancels freely.",
		spent: "Already blessed; it accepts no further offering.",
	},
	gold: {
		fresh: "Walk onto the coins to collect them without bag space.",
		spent: "Already collected.",
	},
};
export const describeObject = (
	object: Pick<DungeonObject, "kind" | "activated">,
): string => {
	const label = objectLabel(object);
	return `${label[0].toUpperCase()}${label.slice(1)}. ${object.activated ? hints[object.kind].spent : hints[object.kind].fresh}`;
};
export const announceObjectArrival = (
	before: GameState,
	after: GameState,
): GameState => {
	if (after.player.health <= 0) return after;
	if (
		before.run.activeFloor === after.run.activeFloor &&
		before.run.playerCoordinate.row === after.run.playerCoordinate.row &&
		before.run.playerCoordinate.col === after.run.playerCoordinate.col
	)
		return after;
	const object = after.objects.find(
		(entry) =>
			entry.floorNumber === after.run.activeFloor &&
			entry.kind !== "gold" &&
			objectAvailable(entry) &&
			entry.coordinate.row === after.run.playerCoordinate.row &&
			entry.coordinate.col === after.run.playerCoordinate.col,
	);
	return object
		? {
				...after,
				activityHistory: appendActivityEvents(after.activityHistory, [
					{
						type: "object-seen",
						kind: object.kind,
						activated: object.activated,
						turn: after.turn,
					},
				]),
			}
		: after;
};
