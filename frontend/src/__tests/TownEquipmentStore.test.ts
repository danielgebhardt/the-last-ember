import { describe, expect, it } from "vitest";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { BAG_CAPACITY } from "../domain/items/Bag";
import { compareEquipment } from "../domain/items/EquipmentComparison";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
} from "../domain/saves/SaveFormat";
import {
	createTownEquipmentStock,
	TOWN_EQUIPMENT_OFFERS,
} from "../domain/town/TownEquipmentStock";
import { createTownLocation } from "../domain/town/TownLocation";
import { savedAdventure } from "./SaveTestHelpers";

const shop = (store: "armor" | "weapons") => {
	const doc = savedAdventure();
	const state = restoreSave(doc).state;
	return {
		...state,
		gold: 5000,
		town: {
			...createTownLocation(),
			coordinate: { row: 13, col: store === "armor" ? 7 : 16 },
		},
	};
};
const offers = Object.values(TOWN_EQUIPMENT_OFFERS);
const required = <T>(value: T | undefined): T => {
	if (!value) throw new Error("Missing authored offer");
	return value;
};
describe.each(["armor", "weapons"] as const)("town %s store", (store) => {
	it("buys an actual copy atomically without equipping, recovery or a dungeon phase", () => {
		const state = shop(store),
			offer = required(offers.find((x) => x.store === store));
		const result = resolvePlayerAction(state, {
			type: "buy-town-equipment",
			offerId: offer.item.id,
		});
		expect(result.error).toBeUndefined();
		expect(result.turnAdvanced).toBe(false);
		expect(result.state.gold).toBe(state.gold - offer.price);
		expect(result.state.bag.items.at(-1)).toEqual(offer.item);
		expect(result.state.townEquipmentStock).not.toContainEqual(offer.item);
		for (const key of [
			"equipment",
			"player",
			"effects",
			"run",
			"progression",
			"monsters",
			"townPotionStock",
		] as const)
			expect(result.state[key]).toBe(state[key]);
		expect(result.state.turn).toBe(state.turn);
		expect(result.state.mana).toBe(state.mana);
		const duplicate = resolvePlayerAction(result.state, {
			type: "buy-town-equipment",
			offerId: offer.item.id,
		});
		expect(duplicate.error).toMatch(/sold|changed/i);
		expect(duplicate.state).toBe(result.state);
	});
	it("rejects wrong store, full bag, insufficient gold and closed adventures without partial changes", () => {
		const state = shop(store),
			offer = required(offers.find((x) => x.store === store));
		const cases = [
			{ ...state, gold: offer.price - 1 },
			{ ...state, town: null },
			{ ...state, town: createTownLocation() },
			{ ...state, player: { ...state.player, health: 0 } },
			{ ...state, quest: { ...state.quest, cureRecovered: true } },
			{
				...state,
				bag: {
					items: Array.from({ length: BAG_CAPACITY }, (_, i) => ({
						id: `full:${i}`,
						kind: "short-sword" as const,
					})),
				},
			},
		];
		for (const invalid of cases) {
			const result = resolvePlayerAction(invalid, {
				type: "buy-town-equipment",
				offerId: offer.item.id,
			});
			expect(result.error).toBeTruthy();
			expect(result.state).toBe(invalid);
		}
		const wrong = required(offers.find((x) => x.store !== store));
		expect(
			resolvePlayerAction(state, {
				type: "buy-town-equipment",
				offerId: wrong.item.id,
			}).error,
		).toBeTruthy();
	});
	it("preserves depletion and enchantments through save/load and rejects forged stock ownership", () => {
		const state = shop(store),
			offer = required(
				offers.find((x) => x.store === store && x.item.enchantment === 1),
			);
		const bought = resolvePlayerAction(state, {
			type: "buy-town-equipment",
			offerId: offer.item.id,
		}).state;
		const original = savedAdventure();
		const doc = createSaveDocument(
			bought,
			restoreSave(original).exploration,
			original.configuration,
			original.fog,
		);
		const result = parseSave(JSON.stringify(doc));
		expect(result.ok).toBe(true);
		if (!result.ok) throw new Error(result.error);
		expect(restoreSave(result.value).state.bag.items).toContainEqual(
			offer.item,
		);
		expect(result.value.state.townEquipmentStock).not.toContainEqual(
			offer.item,
		);
		expect(
			parseSave(
				JSON.stringify({
					...doc,
					state: {
						...doc.state,
						townEquipmentStock: createTownEquipmentStock(),
					},
				}),
			).ok,
		).toBe(false);
	});
	it("compares full loadouts at early and late levels without mutating ownership", () => {
		const state = shop(store);
		for (const offer of offers.filter((x) => x.store === store)) {
			for (const experience of [0, 5000]) {
				const comparison = compareEquipment(offer.item, {
					...state,
					progression: { ...state.progression, experience },
				});
				expect(comparison).not.toBeNull();
				if (!comparison) throw new Error("Expected equipment comparison");
				const stronger = compareEquipment(offer.item, {
					...state,
					progression: { ...state.progression, experience },
					equipment: {
						...state.equipment,
						[comparison.slot]: {
							...offer.item,
							id: "already-worn",
							enchantment: 3,
						},
					},
				});
				expect(stronger?.label).toBe("Lower");
			}
		}
		expect(state.townEquipmentStock).toEqual(createTownEquipmentStock());
	});
});
it("stocks separate duplicate and enchanted copies deterministically, without rare or strongest gear", () => {
	const first = createTownEquipmentStock();
	expect(first).toEqual(createTownEquipmentStock());
	expect(first).not.toBe(createTownEquipmentStock());
	expect(first.filter((x) => x.kind === "iron-sword")).toHaveLength(3);
	expect(
		first.some(
			(x) =>
				x.kind === "star-forged-blade" ||
				x.kind === "runeblade" ||
				x.kind === "relic-band",
		),
	).toBe(false);
});

it("keeps duplicate kinds independently owned and accepts later enchanting without refilling stock", () => {
	let state = shop("weapons");
	const copies = offers.filter(
		(x) => x.item.kind === "iron-sword" && !x.item.enchantment,
	);
	for (const copy of copies)
		state = resolvePlayerAction(state, {
			type: "buy-town-equipment",
			offerId: copy.item.id,
		}).state as typeof state;
	expect(
		state.bag.items.filter((item) => item.kind === "iron-sword"),
	).toHaveLength(2);
	const original = savedAdventure();
	const document = createSaveDocument(
		state,
		restoreSave(original).exploration,
		original.configuration,
		original.fog,
	);
	const enchanted = {
		...document,
		state: {
			...document.state,
			bag: {
				items: document.state.bag.items.map((item) =>
					item.id.startsWith("town-gear:") ? { ...item, enchantment: 2 } : item,
				),
			},
		},
	};
	expect(parseSave(JSON.stringify(enchanted)).ok).toBe(true);
});
it("migrates v24 potion depletion and played data without inventing owned equipment", () => {
	const document = savedAdventure();
	const old = {
		...document,
		version: 24,
		state: {
			...document.state,
			townPotionStock: { ...document.state.townPotionStock, antidote: 2 },
		},
	};
	Reflect.deleteProperty(old.state, "townEquipmentStock");
	Reflect.deleteProperty(old.state.progression, "permanentAttributes");
	const result = parseSave(JSON.stringify(old));
	expect(result.ok).toBe(true);
	if (!result.ok) throw new Error(result.error);
	expect(result.value.state).toEqual({
		...old.state,
		townEquipmentStock: createTownEquipmentStock(),
		progression: {
			...old.state.progression,
			permanentAttributes: { strength: 0, dexterity: 0, intelligence: 0 },
		},
	});
});
it("rejects duplicate, unknown and modified unsold stock copies", () => {
	const document = savedAdventure(),
		first = createTownEquipmentStock()[0];
	for (const stock of [
		[first, first],
		[{ ...first, id: "forged" }],
		[{ ...first, enchantment: 3 }],
		[{ ...first, kind: "star-forged-blade" }],
	]) {
		expect(
			parseSave(
				JSON.stringify({
					...document,
					state: { ...document.state, townEquipmentStock: stock },
				}),
			).ok,
		).toBe(false);
	}
});
