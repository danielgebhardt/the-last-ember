import { appendActivityEvents } from "../game/ActivityHistory";
import type { GameState } from "../game/GameState";
import { objectAvailable } from "../merchant/MerchantAvailability";
import {
	type DungeonObject,
	type DungeonObjectKind,
	objectLabel,
	TRAP_BLEEDING_CHANCE,
	TRAP_DISARM_EXPERIENCE,
} from "./DungeonObject";

const hints: Record<DungeonObjectKind, { fresh: string; spent: string }> = {
	sarcophagus: {
		fresh: "Press E to look closer. It may hold treasure, a guardian, or both.",
		spent: "Opened. Anything it held lies on the floor.",
	},
	hourglass: {
		fresh: "Press E to look closer. It can restore you, at a price.",
		spent: "The sand has run out.",
	},
	"runic-portal": {
		fresh: "Press E to look closer. It leads somewhere deeper.",
		spent: "The runes have gone dark.",
	},
	mirror: {
		fresh: "Press E to look closer. Something stirs in the glass.",
		spent: "The mirror has gone dark. Anything it gave lies on the floor.",
	},
	well: {
		fresh: "Press E to make an offering.",
		spent:
			"The well has taken its offering. Anything it gave lies on the floor.",
	},
	forge: {
		fresh: "Press E to improve a weapon or armor piece for gold.",
		spent: "The forge has gone cold.",
	},
	merchant: {
		fresh:
			"Press E within reach to trade. All stalls share finite supplies; successful trades give monsters a turn.",
		spent: "Press E within reach to trade.",
	},
	"elite-door": {
		fresh:
			"An optional elite chamber. Press E to look closer; monsters cannot open it.",
		spent:
			"Press E within reach to close an unoccupied gate. Its chamber remains optional.",
	},
	reliquary: {
		fresh: "Press E to look closer. A rare ring waits behind a blood seal.",
		spent: "Seal broken. Anything left lies on the floor.",
	},
	archive: {
		fresh: "Press E to search for a spellbook.",
		spent: "Already searched. Anything left lies on the floor.",
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
		fresh: `Cross for 2–6 damage with a ${TRAP_BLEEDING_CHANCE * 100}% chance of Bleeding, or press E within reach to attempt disarm. Success grants ${TRAP_DISARM_EXPERIENCE} XP once; failure springs it.`,
		spent: "Already spent; it cannot hurt you again.",
	},
	fountain: {
		fresh: "Press E to drink.",
		spent: "Dry.",
	},
	throne: {
		fresh: "Press E to sit, or to pry at its jewels.",
		spent: "Its power is spent.",
	},
	shrine: {
		fresh: "Press E to make an offering.",
		spent: "Already blessed.",
	},
	"cracked-wall": {
		fresh:
			"Press E within reach to break through. Something lies sealed behind it. One turn.",
		spent: "Broken open; the vault behind it is yours to search.",
	},
	gold: {
		fresh: "Walk onto the coins to collect them without bag space.",
		spent: "Already collected.",
	},
};
// A mimic chest adds its tell to the nearby notice; the activity log never gives it away.
export const describeObject = (
	object: Pick<DungeonObject, "kind" | "activated">,
	tell?: string,
): string => {
	const label = objectLabel(object);
	return `${label[0].toUpperCase()}${label.slice(1)}. ${object.activated ? hints[object.kind].spent : `${hints[object.kind].fresh}${tell ? ` ${tell}` : ""}`}`;
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
