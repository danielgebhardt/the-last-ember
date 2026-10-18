// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { savedAdventure } from "./SaveTestHelpers";

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
	it("round-trips the start turn and already activated floors", () => {
		const document = escapingAdventure();
		const parsed = parseSave(serializeSave(document));
		if (!parsed.ok) throw new Error(parsed.error);
		expect(restoreSave(parsed.value).state.escape).toEqual(
			document.state.escape,
		);
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
				JSON.stringify({
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
				JSON.stringify({
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
