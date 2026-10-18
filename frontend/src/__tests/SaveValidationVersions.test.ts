// @vitest-environment node
import { describe, expect, it } from "vitest";
import { validateSaveDocument } from "../domain/saves/SaveValidation";
import versionOneFile from "./fixtures/adventure-v1.json?raw";
import { savedAdventure } from "./SaveTestHelpers";

// Dispatch coverage complements captured historical fixtures and the feature-
// specific migration tests. This represents only fields shared by these versions.
const sourceForVersion = (version: number) => {
	const source = version <= 2 ? JSON.parse(versionOneFile) : savedAdventure();
	source.version = version;
	if (version < 27) Reflect.deleteProperty(source.state, "townPortal");
	if (version < 26)
		Reflect.deleteProperty(source.state.progression, "permanentAttributes");
	if (version < 25) Reflect.deleteProperty(source.state, "townEquipmentStock");
	if (version < 24) Reflect.deleteProperty(source.state, "townPotionStock");
	if (version === 2)
		source.state.monsters = source.state.monsters.map((actor: object) => ({
			...actor,
			intent: { type: "idle" },
		}));
	if (version >= 3 && version <= 11)
		source.state.spellHotbar = ["magic-missile", "heal", null, null];
	return source;
};
const versions = Array.from({ length: 27 }, (_, index) => index + 1);

describe("Supported save versions", () => {
	it.each(versions)(
		"loads version %i without mutating its source",
		(version) => {
			const source = sourceForVersion(version);
			const before = structuredClone(source);
			const result = validateSaveDocument(source);
			expect(result.ok).toBe(true);
			if (!result.ok) throw new Error(result.error);
			expect(result.value.version).toBe(27);
			expect(result.value.state.turn).toBe(source.state.turn);
			expect(result.value.state.run).toEqual(source.state.run);
			expect(source).toEqual(before);
			// Once migrated, it remains a valid current snapshot.
			expect(validateSaveDocument(result.value)).toEqual(result);
		},
	);
	it.each(versions)(
		"rejects inconsistent resources in version %i before migration",
		(version) => {
			const source = sourceForVersion(version);
			source.state.mana = 999;
			expect(validateSaveDocument(source)).toEqual({
				ok: false,
				error: "This save contains inconsistent adventure data.",
			});
		},
	);
	it.each(versions)(
		"rejects duplicate item ownership in version %i",
		(version) => {
			const source = sourceForVersion(version);
			// Both copies have a valid item shape; the problem is simultaneous ownership.
			source.state.bag.items.push({ ...source.state.equipment.mainHand });
			expect(validateSaveDocument(source)).toEqual({
				ok: false,
				error: "This save contains inconsistent adventure data.",
			});
		},
	);
	it.each(versions)("rejects nonreciprocal stairs in version %i", (version) => {
		const source = sourceForVersion(version);
		source.state.run.floors[0].downStair.destinationFloor = 1;
		expect(validateSaveDocument(source)).toEqual({
			ok: false,
			error: "This save contains inconsistent adventure data.",
		});
	});
	it.each(versions)(
		"rejects future activity history in version %i",
		(version) => {
			const source = sourceForVersion(version);
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
		},
	);
	it.each([undefined, null, [], "save", { version: 19 }, { version: 1 }])(
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
		{ version: 28 },
		{ version: "19" },
		{ version: "toString" },
	])("reports unsupported versions for %j", (source) => {
		expect(validateSaveDocument(source)).toEqual({
			ok: false,
			error: "This save uses an unsupported format version.",
		});
	});
});
