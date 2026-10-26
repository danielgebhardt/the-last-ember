import { expect, it } from "vitest";
import {
	emptyRunEncounters,
	recordRunEncounters,
} from "../domain/game/RunEncounters";
import { summarizeRun } from "../domain/saves/RunStatistics";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
} from "../domain/saves/SaveFormat";
import { savedAdventure } from "./SaveTestHelpers";

it("retains stolen/recovered totals after the activity log rolls over and does not count an event twice", () => {
	const session = restoreSave(savedAdventure()),
		before = { ...session.state, encounters: emptyRunEncounters(0) };
	const after = {
		...before,
		activityHistory: {
			nextId: before.activityHistory.nextId + 2,
			entries: [
				...before.activityHistory.entries,
				{
					id: before.activityHistory.nextId,
					event: {
						type: "monster-theft-hit" as const,
						monster: "treasure-thief" as const,
						gold: 100,
						turn: before.turn,
					},
				},
				{
					id: before.activityHistory.nextId + 1,
					event: {
						type: "monster-theft-recovered" as const,
						monster: "treasure-thief" as const,
						gold: 60,
						turn: before.turn,
					},
				},
			],
		},
	};
	const tracked = recordRunEncounters(before, after);
	expect(tracked.encounters?.theft).toMatchObject({
		stolen: 100,
		recovered: 60,
		sinceTurn: 0,
	});
	expect(recordRunEncounters(before, tracked).encounters?.theft).toEqual(
		tracked.encounters?.theft,
	);
	const rolled = {
		...tracked,
		activityHistory: { ...tracked.activityHistory, entries: [] },
	};
	const document = createSaveDocument(
		rolled,
		session.exploration,
		session.configuration,
		session.fog,
	);
	expect(parseSave(JSON.stringify(document)).ok).toBe(true);
	expect(summarizeRun(document, null).thiefTake).toEqual({
		stolen: 100,
		recovered: 60,
		sinceTurn: 0,
	});
	expect(restoreSave(document).state.encounters?.theft).toEqual(
		tracked.encounters?.theft,
	);
});
it("starts separate theft provenance when loading an older adventure, and rejects impossible counters", () => {
	const document = savedAdventure();
	expect(summarizeRun(document, null).thiefTake).toBeNull();
	const state = restoreSave(document).state,
		loaded = recordRunEncounters(state, state);
	expect(loaded.encounters?.theft).toMatchObject({
		stolen: 0,
		recovered: 0,
		sinceTurn: state.turn,
	});
	document.state.encounters = {
		...emptyRunEncounters(0),
		theft: { sinceTurn: 0, stolen: 1, recovered: 2, nextId: 0 },
	};
	expect(parseSave(JSON.stringify(document)).ok).toBe(false);
});
