// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createAdventureSession } from "../components/game/useAdventureSession";
import { DEFAULT_FOG_CONFIGURATION } from "../domain/dungeon/RunConfiguration";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
} from "../domain/saves/SaveFormat";
import { TOWN } from "../domain/town/TownDefinition";
import { TOWN_EQUIPMENT_OFFERS } from "../domain/town/TownEquipmentStock";
import { COMPACT_TEST_CONFIGURATION } from "./TestRunConfiguration";

const fresh = (seed = 123) =>
	createAdventureSession(
		seed,
		COMPACT_TEST_CONFIGURATION,
		DEFAULT_FOG_CONFIGURATION,
	);

describe("starting town budget", () => {
	it.each([0, 123, 241547927])(
		"starts seed %i in town with 300 gold and no spent turns",
		(seed) => {
			const { state } = fresh(seed);
			expect(state.gold).toBe(300);
			expect(state.town).not.toBeNull();
			expect(state.turn).toBe(0);
		},
	);
	it.each(["iron-sword", "leather-armor"] as const)(
		"can buy a modest %s upgrade without equipping it",
		(kind) => {
			const state = fresh().state;
			const offer = Object.values(TOWN_EQUIPMENT_OFFERS).find(
				(entry) => entry.item.kind === kind && !entry.item.enchantment,
			);
			if (!offer || !state.town)
				throw new Error("Expected starting town and equipment offer");
			const shop = {
				...state,
				town: {
					...state.town,
					coordinate: { row: 13, col: kind === "iron-sword" ? 16 : 7 },
				},
			};
			const result = resolvePlayerAction(shop, {
				type: "buy-town-equipment",
				offerId: offer.item.id,
			});
			expect(result.error).toBeUndefined();
			expect(result.state.gold).toBe(300 - offer.price);
			expect(result.state.bag.items).toContainEqual(offer.item);
			expect(result.state.equipment).toBe(state.equipment);
			expect(result.turnAdvanced).toBe(false);
		},
	);
	it("buys two healing bottles, then preserves the spent balance through travel and loading", () => {
		const session = fresh();
		if (!session.state.town) throw new Error("Expected starting town");
		let state = {
			...session.state,
			town: { ...session.state.town, coordinate: { row: 13, col: 3 } },
		};
		for (const expectedStock of [4, 3]) {
			const result = resolvePlayerAction(state, {
				type: "buy-town-potion",
				kind: "healing-potion",
				expectedStock,
			});
			expect(result.error).toBeUndefined();
			state = { ...state, ...result.state, town: state.town };
		}
		expect(state.gold).toBe(0);
		expect(
			state.bag.items.filter((item) => item.kind === "healing-potion"),
		).toHaveLength(3);
		const third = resolvePlayerAction(state, {
			type: "buy-town-potion",
			kind: "healing-potion",
			expectedStock: 2,
		});
		expect(third.error).toBeDefined();
		expect(third.state).toBe(state);
		const departure = {
			...state,
			town: { ...state.town, coordinate: TOWN.gate },
		};
		const dungeon = resolvePlayerAction(departure, {
			type: "travel",
			destination: "dungeon",
		});
		expect(dungeon.error).toBeUndefined();
		const returned = resolvePlayerAction(dungeon.state, {
			type: "travel",
			destination: "town",
		});
		expect(returned.error).toBeUndefined();
		expect(returned.state.gold).toBe(0);
		const doc = createSaveDocument(
			returned.state,
			session.exploration,
			session.configuration,
			session.fog,
		);
		const parsed = parseSave(JSON.stringify(doc));
		if (!parsed.ok) throw new Error(parsed.error);
		expect(restoreSave(parsed.value).state.gold).toBe(0);
		expect(fresh().state.gold).toBe(300);
	});
});
