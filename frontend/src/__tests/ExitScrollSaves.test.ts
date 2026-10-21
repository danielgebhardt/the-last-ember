import { expect, it } from "vitest";
import { updateExploration } from "../domain/dungeon/Exploration";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { navigationRun } from "../domain/objects/NavigationTerrain";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { corridorContinuationAdventure } from "./CorridorContinuationTestHelpers";

const snapshot = () => {
	const base = corridorContinuationAdventure();
	const state = {
		...base.state,
		effects: [],
		monsters: [],
		bag: {
			items: [
				{ id: "scroll:1", kind: "exit-scroll" as const },
				{ id: "scroll:2", kind: "exit-scroll" as const },
			],
		},
	};
	return createSaveDocument(
		state,
		base.exploration,
		base.configuration,
		base.fog,
	);
};
it("round-trips scroll copies and the explicit exit event, then continues deterministically", () => {
	const document = snapshot();
	const loaded = parseSave(serializeSave(document));
	if (!loaded.ok) throw new Error(loaded.error);
	expect(loaded.value.version).toBe(32);
	const restored = restoreSave(loaded.value);
	const result = resolvePlayerAction(restored.state, {
		type: "exit-dungeon",
		itemId: "scroll:1",
	});
	expect(result.turnAdvanced).toBe(true);
	const after = createSaveDocument(
		result.state,
		updateExploration(
			navigationRun(result.state),
			restored.fog.radius,
			restored.exploration,
		),
		restored.configuration,
		restored.fog,
	);
	const reread = parseSave(serializeSave(after));
	if (!reread.ok) throw new Error(reread.error);
	const current = restoreSave(reread.value).state;
	expect(current.bag.items.map((x) => x.id)).toEqual(["scroll:2"]);
	expect(current.activityHistory).toEqual(result.state.activityHistory);
	expect(current.townPortal).toEqual(result.state.townPortal);
	expect(current.townPortal?.floorNumber).toBe(restored.state.run.activeFloor);
	expect(
		resolvePlayerAction(current, { type: "return-town-portal" }).state,
	).toEqual(
		resolvePlayerAction(result.state, { type: "return-town-portal" }).state,
	);
});
it("restores ember possession and denies every scroll use without consuming or spending a turn", () => {
	const document = snapshot();
	document.state.quest = { ...document.state.quest, cureRecovered: true };
	document.state.floorItems = [];
	document.state.escape = { startedTurn: 20, activatedFloors: [2] };
	const parsed = parseSave(serializeSave(document));
	if (!parsed.ok) throw new Error(parsed.error);
	const state = restoreSave(parsed.value).state;
	const result = resolvePlayerAction(state, {
		type: "exit-dungeon",
		itemId: "scroll:1",
	});
	expect(result.turnAdvanced).toBe(false);
	expect(result.state).toBe(state);
	expect(result.error).toMatch(/ember/i);
});
it.each([1, 19, 20])(
	"rejects new scroll ownership declared as legacy v%s",
	(version) => {
		expect(parseSave(JSON.stringify({ ...snapshot(), version })).ok).toBe(
			false,
		);
	},
);
it.each([0, 6, 1.5, "2", null])(
	"rejects malformed or out-of-adventure exit origin %s",
	(fromFloor) => {
		const document = snapshot();
		document.state.activityHistory = {
			nextId: 1,
			entries: [
				{
					id: 0,
					event: {
						type: "exit-scroll-used",
						fromFloor: fromFloor as number,
						turn: document.state.turn,
					},
				},
			],
		};
		expect(parseSave(serializeSave(document)).ok).toBe(false);
	},
);
it("rejects unknown item kinds, invalid enhancement and duplicate scroll ownership", () => {
	const document = snapshot();
	expect(
		parseSave(
			JSON.stringify({
				...document,
				state: {
					...document.state,
					bag: { items: [{ id: "scroll:1", kind: "future-scroll" }] },
				},
			}),
		).ok,
	).toBe(false);
	expect(
		parseSave(
			JSON.stringify({
				...document,
				state: {
					...document.state,
					bag: {
						items: [{ id: "scroll:1", kind: "exit-scroll", enchantment: 1 }],
					},
				},
			}),
		).ok,
	).toBe(false);
	expect(
		parseSave(
			JSON.stringify({
				...document,
				state: {
					...document.state,
					bag: {
						items: [document.state.bag.items[0], document.state.bag.items[0]],
					},
				},
			}),
		).ok,
	).toBe(false);
});
it.each(["floor", "coordinate", "outside town", "ember", "legacy", "missing"])(
	"rejects inconsistent portal data: %s",
	(reason) => {
		const doc = snapshot();
		const original = restoreSave(doc);
		const departed = resolvePlayerAction(original.state, {
			type: "exit-dungeon",
			itemId: "scroll:1",
		}).state;
		const saved = createSaveDocument(
			departed,
			original.exploration,
			original.configuration,
			original.fog,
		);
		if (!saved.state.townPortal) throw new Error("Expected open portal");
		if (reason === "floor") saved.state.townPortal.floorNumber = 999;
		if (reason === "coordinate") saved.state.townPortal.coordinate.row = -1;
		if (reason === "outside town") saved.state.town = null;
		if (reason === "ember")
			saved.state.quest = { ...saved.state.quest, cureRecovered: true };
		if (reason === "missing") Reflect.deleteProperty(saved.state, "townPortal");
		const serialized =
			reason === "legacy"
				? JSON.stringify({ ...saved, version: 26 })
				: serializeSave(saved);
		expect(parseSave(serialized).ok).toBe(false);
	},
);
