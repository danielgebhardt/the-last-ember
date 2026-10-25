// @vitest-environment node
import { expect, it } from "vitest";
import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { DEFAULT_RUN_CONFIGURATION } from "../domain/dungeon/RunConfiguration";
import { createGameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { sellCarriedEquipment } from "../domain/merchant/EquipmentSales";
import {
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import {
	createTownEquipmentStock,
	TOWN_EQUIPMENT_OFFERS,
} from "../domain/town/TownEquipmentStock";
import { createTownLocation } from "../domain/town/TownLocation";
import { rareEquipmentAdventure } from "./RareEquipmentTestHelpers";
import { tacticalSnapshot } from "./TacticalReplayTestHelpers";

it("stocks both MR items on every seed without enchanted store offers", () => {
	for (const seed of [0, 8, 11, 12]) {
		const state = createGameState(
			connectDungeonFloors(
				generateDungeonRun(seed, 5, {
					...DEFAULT_RUN_CONFIGURATION,
					rows: 15,
					cols: 15,
				}),
			),
		);
		expect(state.townEquipmentStock.map((i) => i.kind)).toEqual(
			expect.arrayContaining(["warding-cloak", "spellguard-shield"]),
		);
	}
	expect(
		Object.values(TOWN_EQUIPMENT_OFFERS).every((o) => !o.item.enchantment),
	).toBe(true);
	expect(createTownEquipmentStock().filter((i) => i.enchantment)).toEqual([]);
});

// The armor store's one copy of a rare kind.
const townOfferId = (kind: string) => {
	const id = Object.keys(TOWN_EQUIPMENT_OFFERS).find(
		(offer) => TOWN_EQUIPMENT_OFFERS[offer].item.kind === kind,
	);
	if (!id) throw new Error(`Expected a town offer of ${kind}`);
	return id;
};
it("tracks both finite store copies independently after purchase, sale and reload", () => {
	let state = {
		...rareEquipmentAdventure("warding-cloak", "dungeon"),
		gold: 2000,
		town: { ...createTownLocation(), coordinate: { row: 13, col: 7 } },
	};
	for (const kind of ["warding-cloak", "spellguard-shield"] as const) {
		const id = townOfferId(kind);
		const bought = resolvePlayerAction(state, {
			type: "buy-town-equipment",
			offerId: id,
		});
		expect(bought.error).toBeUndefined();
		expect(bought.turnAdvanced).toBe(false);
		const sold = sellCarriedEquipment(bought.state, id);
		if ("error" in sold) throw new Error(sold.error);
		const doc = tacticalSnapshot(sold);
		const restored = parseSave(serializeSave(doc));
		expect(restored.ok).toBe(true);
		if (!restored.ok) throw new Error(restored.error);
		state = { ...restoreSave(restored.value).state, town: state.town };
		expect(state.townEquipmentPurchases).toContain(id);
		expect(
			resolvePlayerAction(state, { type: "buy-town-equipment", offerId: id })
				.state,
		).toBe(state);
		const forged = {
			...doc,
			state: {
				...doc.state,
				townEquipmentStock: [...doc.state.townEquipmentStock, { id, kind }],
			},
		};
		expect(parseSave(JSON.stringify(forged)).ok).toBe(false);
	}
	expect(state.floorItems.some((i) => i.item.id.startsWith("rare-find:"))).toBe(
		true,
	);
	expect(state.townEquipmentPurchases).toHaveLength(2);
});
