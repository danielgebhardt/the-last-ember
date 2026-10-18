// @vitest-environment node

import { expect, it } from "vitest";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { BAG_CAPACITY, createBag } from "../domain/items/Bag";
import { createEquipment } from "../domain/items/Equipment";
import { changeEquipment } from "../domain/items/EquipmentChanges";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { savedAdventure } from "./SaveTestHelpers";

const ring = { id: "ring:1", kind: "copper-ring" as const };
it.each(["leftRing", "rightRing"] as const)(
	"equips and unequips a ring in %s without duplicating ownership",
	(slot) => {
		const equipped = changeEquipment(createEquipment(), createBag([ring]), {
			type: "equip",
			itemId: ring.id,
			slot,
		});
		if (!("equipment" in equipped)) throw new Error(equipped.error);
		expect(equipped.equipment[slot]).toEqual(ring);
		expect(equipped.bag.items).toEqual([]);
		const removed = changeEquipment(equipped.equipment, equipped.bag, {
			type: "unequip",
			slot,
		});
		if (!("equipment" in removed)) throw new Error(removed.error);
		expect(removed.equipment[slot]).toBeNull();
		expect(removed.bag.items).toEqual([ring]);
	},
);
it("swaps a ring with a full bag, but rejects unequipping until there is room", () => {
	const equipped = createEquipment(null, null, null, null, ring);
	const replacement = { ...ring, id: "ring:2" };
	const bag = createBag(
		Array.from({ length: BAG_CAPACITY }, (_, i) =>
			i === 0 ? replacement : { id: `gear:${i}`, kind: "short-sword" as const },
		),
	);
	const swapped = changeEquipment(equipped, bag, {
		type: "equip",
		itemId: replacement.id,
		slot: "leftRing",
	});
	if (!("equipment" in swapped)) throw new Error(swapped.error);
	expect(swapped.equipment.leftRing).toEqual(replacement);
	expect(swapped.bag.items[0]).toEqual(ring);
	expect(
		changeEquipment(swapped.equipment, swapped.bag, {
			type: "unequip",
			slot: "leftRing",
		}),
	).toMatchObject({ error: expect.stringMatching(/full/i) });
});
it("rejects rings in armor slots and the same physical ring in two slots", () => {
	expect(
		changeEquipment(createEquipment(), createBag([ring]), {
			type: "equip",
			itemId: ring.id,
			slot: "head",
		}),
	).toMatchObject({ error: expect.stringMatching(/does not fit/) });
	expect(() => createEquipment(null, null, null, null, ring, ring)).toThrow(
		/same item/,
	);
});
it("persists equipped rings", () => {
	const saved = savedAdventure();
	const restored = restoreSave(saved);
	const state = {
		...restored.state,
		equipment: { ...restored.state.equipment, rightRing: ring },
	};
	const parsed = parseSave(
		serializeSave(
			createSaveDocument(
				state,
				restored.exploration,
				restored.configuration,
				restored.fog,
			),
		),
	);
	expect(parsed.ok).toBe(true);
	if (!parsed.ok) throw new Error(parsed.error);
	expect(restoreSave(parsed.value).state.equipment.rightRing).toEqual(ring);
});

it("rejects duplicated ring ownership in imported saves and charges normal turns for ring changes", () => {
	const saved = savedAdventure();
	const restored = restoreSave(saved);
	const initial = { ...restored.state, monsters: [], bag: createBag([ring]) };
	const equipped = resolvePlayerAction(initial, {
		type: "equip",
		itemId: ring.id,
		slot: "rightRing",
	}).state;
	expect(equipped.turn).toBe(initial.turn + 1);
	expect(equipped.equipment.rightRing).toEqual(ring);
	const removed = resolvePlayerAction(equipped, {
		type: "unequip",
		slot: "rightRing",
	}).state;
	expect(removed.turn).toBe(initial.turn + 2);
	expect(removed.bag.items).toEqual([ring]);
	const duplicate = {
		...saved,
		state: {
			...saved.state,
			equipment: { ...saved.state.equipment, leftRing: ring, rightRing: ring },
		},
	};
	expect(parseSave(JSON.stringify(duplicate)).ok).toBe(false);
});
