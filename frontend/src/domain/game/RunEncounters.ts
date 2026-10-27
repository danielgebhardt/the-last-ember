import type { VisibilityGrid } from "../dungeon/Visibility";
import { isThief } from "../monsters/TreasureThief";
import { recordPressure } from "./CombatTelemetry";
import type { GameState } from "./GameState";
import type { OmenKind } from "./Omens";

// Optional in v33. Older adventures start collecting at their load turn; that
// provenance prevents partial historical data being mistaken for a complete run.
export type RunEncounters = {
	sinceTurn: number;
	omens: OmenKind[];
	thieves: string[];
	mimicFloors: number[];
	arenaEntered: boolean;
	theft?: {
		sinceTurn: number;
		stolen: number;
		recovered: number;
		nextId: number;
	};
};
export const emptyRunEncounters = (sinceTurn: number): RunEncounters => ({
	sinceTurn,
	omens: [],
	thieves: [],
	mimicFloors: [],
	arenaEntered: false,
	theft: { sinceTurn, stolen: 0, recovered: 0, nextId: 0 },
});

// Observe the rendered dungeon and new events at the session boundary, before the
// rolling activity log can forget them. No seeded stream or gameplay rule reads this.
export const recordRunEncounters = (
	before: GameState,
	after: GameState,
	visible?: VisibilityGrid,
): GameState => {
	const previous = after.encounters;
	const facts = previous ?? emptyRunEncounters(before.turn);
	const omens = new Set(facts.omens);
	const thieves = new Set(facts.thieves);
	const mimicFloors = new Set(facts.mimicFloors);
	let arenaEntered = facts.arenaEntered;
	const theft = facts.theft ?? {
		sinceTurn: before.turn,
		stolen: 0,
		recovered: 0,
		nextId: before.activityHistory.nextId,
	};
	let stolen = theft.stolen,
		recovered = theft.recovered,
		nextId = theft.nextId;
	for (const { id, event } of after.activityHistory.entries) {
		if (id < before.activityHistory.nextId) continue;
		if (event.type === "omen-revealed") omens.add(event.omen);
		if (event.type === "mimic-revealed") mimicFloors.add(after.run.activeFloor);
		if (event.type === "arena-entered") arenaEntered = true;
		if (id >= theft.nextId) {
			if (event.type === "monster-theft-hit") {
				stolen += event.gold;
				nextId = id + 1;
			}
			if (event.type === "monster-theft-recovered") {
				recovered += event.gold;
				nextId = id + 1;
			}
		}
	}
	if (!after.town)
		for (const monster of after.monsters) {
			if (
				isThief(monster) &&
				monster.health > 0 &&
				monster.floorNumber === after.run.activeFloor &&
				(!visible || visible[monster.coordinate.row]?.[monster.coordinate.col])
			)
				thieves.add(monster.id);
		}
	if (
		previous &&
		omens.size === previous.omens.length &&
		thieves.size === previous.thieves.length &&
		mimicFloors.size === previous.mimicFloors.length &&
		arenaEntered === previous.arenaEntered &&
		previous.theft &&
		stolen === theft.stolen &&
		recovered === theft.recovered &&
		theft.nextId === nextId
	)
		return after;
	return {
		...recordPressure(after, "thief-met", thieves.size - facts.thieves.length),
		encounters: {
			sinceTurn: facts.sinceTurn,
			omens: [...omens],
			thieves: [...thieves],
			mimicFloors: [...mimicFloors],
			arenaEntered,
			theft: { sinceTurn: theft.sinceTurn, stolen, recovered, nextId },
		},
	};
};
