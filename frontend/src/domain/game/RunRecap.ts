import type { RunConfiguration } from "../dungeon/RunConfiguration";
import { EQUIPMENT_SLOT_LABELS, type EquipmentSlot } from "../items/Equipment";
import { ITEM_DEFINITIONS } from "../items/Item";
import { itemName } from "../items/ItemValues";
import {
	type DungeonObject,
	OBJECT_DEFINITIONS,
} from "../objects/DungeonObject";
import { AFFLICTION_DEFINITIONS } from "./AfflictionDefinitions";
import type { GameState } from "./GameState";
import { levelForExperience } from "./Progression";

// What a rare discovery did, in a few words; null when it was never used.
export const discoveryResult = (object: DungeonObject): string | null => {
	if (!object.activated) return null;
	if (object.sarcophagusOutcome)
		return {
			treasure: "treasure",
			guardian: "a heroic guardian",
			both: "treasure and a heroic guardian",
			empty: "empty",
		}[object.sarcophagusOutcome];
	if (object.wellResult)
		return `offered ${object.wellResult.offering} gold: ${
			{
				positive: "a reward",
				neutral: "nothing",
				negative: "a hostile creature",
			}[object.wellResult.outcome]
		}`;
	if (object.forgeResult)
		return `${object.forgeResult.service} forging of ${ITEM_DEFINITIONS[object.forgeResult.item].name}: ${object.forgeResult.outcome}`;
	if (object.mirrorResult)
		return object.mirrorResult.choice === "shatter"
			? `shattered: ${
					{ item: "a reward", empty: "nothing", hostile: "a hostile creature" }[
						object.mirrorResult.outcome
					]
				}`
			: object.mirrorResult.choice === "reveal"
				? "revealed the floor"
				: "faced your reflection";
	if (object.portalDestination)
		return `stepped through to floor ${object.portalDestination.floorNumber}`;
	if (object.kind === "hourglass") return "turned";
	return "used";
};

export type RunRecap = Readonly<{
	afflictions: readonly string[];
	gear: readonly { slot: string; item: string }[];
	discoveries: readonly { name: string; floor: number; result: string }[];
}>;
// Conditions you had when the run ended. The fatal phase still counts durations down,
// so one that expired on the turn you died (often the poison that killed you) counts.
const finalConditions = (state: GameState): readonly string[] => {
	const kinds = new Set(state.afflictions.map((a) => a.kind));
	if (state.player.health <= 0)
		for (const { event } of state.activityHistory.entries)
			if (
				event.type === "affliction-changed" &&
				event.change === "expired" &&
				event.turn === state.turn
			)
				kinds.add(event.condition);
	return [...kinds].map((kind) => AFFLICTION_DEFINITIONS[kind].name);
};
export const runRecap = (state: GameState): RunRecap => ({
	afflictions: finalConditions(state),
	gear: (Object.keys(EQUIPMENT_SLOT_LABELS) as EquipmentSlot[]).flatMap(
		(slot) => {
			const item = state.equipment[slot];
			return item
				? [{ slot: EQUIPMENT_SLOT_LABELS[slot], item: itemName(item) }]
				: [];
		},
	),
	discoveries: state.objects.flatMap((object) => {
		const result =
			OBJECT_DEFINITIONS[object.kind].placement === "rare-discovery"
				? discoveryResult(object)
				: null;
		return result
			? [
					{
						name: OBJECT_DEFINITIONS[object.kind].name,
						floor: object.floorNumber,
						result,
					},
				]
			: [];
	}),
});

// One finished adventure, small enough to keep many in browser storage.
export type RunRecord = Readonly<{
	id: string;
	finishedAt: string;
	outcome: "won" | "died";
	seed: number;
	rows: number;
	cols: number;
	floors: number;
	difficulty: number;
	deepestFloor: number;
	turns: number;
	level: number;
	experience: number;
	monstersDefeated: number;
	gold: number;
	// The last damage line before death, as the Activity log phrased it.
	cause?: string;
	recap: RunRecap;
}>;
export const createRunRecord = (
	state: GameState,
	configuration: RunConfiguration,
	deepestFloor: number,
	cause: string | undefined,
	finishedAt: Date,
): RunRecord => {
	const outcome = state.quest.victory ? "won" : "died";
	return {
		// Stable for the same ending, so reloading a finished save never adds it twice.
		id: [
			state.run.seed,
			configuration.rows,
			configuration.cols,
			configuration.floorCount,
			configuration.difficulty ?? 1,
			state.turn,
			outcome,
		].join(":"),
		finishedAt: finishedAt.toISOString(),
		outcome,
		seed: state.run.seed,
		rows: configuration.rows,
		cols: configuration.cols,
		floors: configuration.floorCount,
		difficulty: configuration.difficulty ?? 1,
		deepestFloor,
		turns: state.turn,
		level: levelForExperience(state.progression.experience),
		experience: state.progression.experience,
		monstersDefeated: state.monstersDefeated,
		gold: state.gold,
		...(cause ? { cause } : {}),
		recap: runRecap(state),
	};
};
