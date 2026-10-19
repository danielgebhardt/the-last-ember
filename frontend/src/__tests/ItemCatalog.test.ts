// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	eligibleLootKinds,
	ITEM_DEFINITIONS,
	validateItemDefinition,
} from "../domain/items/Item";

describe("Depth-eligible item catalog", () => {
	it("offers basic armor early and stronger armor from floor three", () => {
		expect(eligibleLootKinds(1, "found")).toContain("leather-armor");
		expect(eligibleLootKinds(1, "found")).toContain("leather-cap");
		expect(eligibleLootKinds(2, "found")).not.toContain("chain-armor");
		expect(eligibleLootKinds(3, "found")).toContain("chain-armor");
		expect(eligibleLootKinds(3, "drop")).toContain("iron-helmet");
	});
	it.each([1, 4, 5, 20])(
		"keeps healing eligible from both sources on floor %i",
		(floor) => {
			expect(eligibleLootKinds(floor, "found")).toContain("healing-potion");
			expect(eligibleLootKinds(floor, "drop")).toContain("healing-potion");
		},
	);
	it.each([
		{ minFloor: 0 },
		{ maxFloor: 21 },
		{ minFloor: 5, maxFloor: 4 },
		{ foundWeight: -1 },
		{ dropWeight: Infinity },
		{ foundWeight: 0, dropWeight: 0 },
		{ armor: -1 },
		{ attackBonus: 1.5 },
		{ magicResistance: -1 },
		{ magicResistance: 1.5 },
		{ magicResistance: 51 },
	])("rejects unusable item metadata: %j", (overrides) => {
		expect(() =>
			validateItemDefinition({
				...ITEM_DEFINITIONS["leather-armor"],
				...overrides,
			}),
		).toThrow(RangeError);
	});
});
