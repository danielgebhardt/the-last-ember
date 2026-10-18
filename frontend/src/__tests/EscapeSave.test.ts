// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import versionThirteenFile from "./fixtures/adventure-v13.json?raw";
import { historicalSaveText, savedAdventure } from "./SaveTestHelpers";

const escapingAdventure = () => {
	const document = savedAdventure();
	return {
		...document,
		state: {
			...document.state,
			quest: { ...document.state.quest, cureRecovered: true },
			floorItems: document.state.floorItems.filter(
				(entry) => entry.item.kind !== "cure",
			),
			escape: { startedTurn: document.state.turn, activatedFloors: [1] },
		},
	};
};
describe("Saved escape phase", () => {
	it("loads a captured pre-escape save without altering its searching actor", () => {
		const parsed = parseSave(versionThirteenFile);
		if (!parsed.ok) throw new Error(parsed.error);
		expect(parsed.value.state.escape).toBeNull();
		expect(parsed.value.state.monsters[0].awareness).toEqual(
			JSON.parse(versionThirteenFile).state.monsters[0].awareness,
		);
	});
	it("round-trips the start turn and already activated floors", () => {
		const document = escapingAdventure();
		const parsed = parseSave(serializeSave(document));
		if (!parsed.ok) throw new Error(parsed.error);
		expect(restoreSave(parsed.value).state.escape).toEqual(
			document.state.escape,
		);
	});
	it("starts legacy cure carriers in escape and exempts their current floor from fresh spawns", () => {
		const legacy = { ...escapingAdventure(), version: 13 };
		const parsed = parseSave(historicalSaveText(legacy));
		if (!parsed.ok) throw new Error(parsed.error);
		expect(parsed.value.version).toBe(27);
		expect(parsed.value.state.escape).toEqual({
			startedTurn: legacy.state.turn,
			activatedFloors: [1],
		});
	});
	it.each([
		null,
		{ startedTurn: 999, activatedFloors: [] },
		{ startedTurn: 0, activatedFloors: [5] },
		{ startedTurn: 0, activatedFloors: [1, 1] },
		{ startedTurn: 0, activatedFloors: "1" },
	])("rejects inconsistent escape state %j", (escapeState) => {
		const document = escapingAdventure();
		expect(
			parseSave(
				historicalSaveText({
					...document,
					state: { ...document.state, escape: escapeState },
				}),
			).ok,
		).toBe(false);
	});
	it("rejects escape before the cure is recovered", () => {
		const document = savedAdventure();
		expect(
			parseSave(
				historicalSaveText({
					...document,
					state: {
						...document.state,
						escape: { startedTurn: 0, activatedFloors: [] },
					},
				}),
			).ok,
		).toBe(false);
	});
});
