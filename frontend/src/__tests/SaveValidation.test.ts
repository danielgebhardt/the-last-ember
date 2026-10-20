// @vitest-environment node
import { describe, expect, it } from "vitest";
import { validateSaveDocument } from "../domain/saves/SaveValidation";
import { savedAdventure } from "./SaveTestHelpers";

describe("Current save validation", () => {
	it("loads the current format without mutating its source", () => {
		const source = savedAdventure();
		const before = structuredClone(source);
		const result = validateSaveDocument(source);
		expect(result.ok).toBe(true);
		if (!result.ok) throw new Error(result.error);
		expect(result.value.version).toBe(28);
		expect(result.value.state.turn).toBe(source.state.turn);
		expect(result.value.state.run).toEqual(source.state.run);
		expect(source).toEqual(before);
		// A valid snapshot remains valid without normalization.
		expect(validateSaveDocument(result.value)).toEqual(result);
	});
	it("rejects duplicate item ownership in the current format", () => {
		const source = savedAdventure();
		// Both copies have a valid item shape; the problem is simultaneous ownership.
		source.state.bag = {
			items: [
				...source.state.bag.items,
				{
					id: source.state.equipment.mainHand?.id ?? "",
					kind: "short-sword",
				},
			],
		};
		expect(validateSaveDocument(source)).toEqual({
			ok: false,
			error: "This save contains inconsistent adventure data.",
		});
	});
	it("rejects nonreciprocal stairs in the current format", () => {
		const source = savedAdventure();
		const stair = source.state.run.floors[0].downStair;
		if (!stair) throw new Error("Fixture needs downward stairs");
		stair.destinationFloor = 1;
		expect(validateSaveDocument(source)).toEqual({
			ok: false,
			error: "This save contains inconsistent adventure data.",
		});
	});
	it("rejects future activity history in the current format", () => {
		const source = savedAdventure();
		source.state.activityHistory = {
			nextId: 1,
			entries: [
				{
					id: 0,
					event: {
						type: "level-gained",
						level: 2,
						healthGain: 2,
						turn: source.state.turn + 1,
					},
				},
			],
		};
		expect(validateSaveDocument(source)).toEqual({
			ok: false,
			error: "This save contains inconsistent adventure data.",
		});
	});
	it.each([undefined, null, [], "save", { version: 28 }])(
		"reports malformed adventure data for %j",
		(source) => {
			expect(validateSaveDocument(source)).toEqual({
				ok: false,
				error: "This save contains invalid or missing adventure data.",
			});
		},
	);
	it.each([
		{},
		{ version: 0 },
		{ version: 27 },
		{ version: 29 },
		{ version: "19" },
		{ version: "toString" },
	])("reports unsupported versions for %j", (source) => {
		expect(validateSaveDocument(source)).toEqual({
			ok: false,
			error: "This save uses an unsupported format version.",
		});
	});
});

it.each(Array.from({ length: 26 }, (_, index) => index + 1))(
	"rejects retired v%i before inspecting its payload",
	(version) => {
		expect(validateSaveDocument({ version })).toEqual({
			ok: false,
			error: "This save uses an unsupported format version.",
		});
	},
);
