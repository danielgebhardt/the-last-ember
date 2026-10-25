// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { updateExploration } from "../domain/dungeon/Exploration";
import {
	DEFAULT_FOG_CONFIGURATION,
	DEFAULT_RUN_CONFIGURATION,
} from "../domain/dungeon/RunConfiguration";
import { createGameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import {
	coordinateKey,
	protectedFloorLocations,
} from "../domain/monsters/MonsterLocations";
import { navigationRun } from "../domain/objects/NavigationTerrain";
import {
	addOptionalEliteRooms,
	findOptionalEliteRooms,
} from "../domain/objects/OptionalEliteRooms";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { withFlameOnFloor } from "./SaveTestHelpers";
import { COMPACT_TEST_CONFIGURATION } from "./TestRunConfiguration";

const configuration = { ...COMPACT_TEST_CONFIGURATION, floorCount: 20 };
const fresh = () =>
	withFlameOnFloor(
		createGameState(
			connectDungeonFloors(generateDungeonRun(123, 20, configuration)),
		),
	);
const atMerchant = (state: ReturnType<typeof fresh>, floor: number) => {
	const merchant = state.objects.find(
		(o) => o.kind === "merchant" && o.floorNumber === floor,
	);
	if (!merchant) throw new Error("Expected merchant");
	return {
		...state,
		run: {
			...state.run,
			activeFloor: floor,
			playerCoordinate: merchant.coordinate,
		},
	};
};
const snapshot = (state: ReturnType<typeof fresh>) =>
	createSaveDocument(
		state,
		updateExploration(navigationRun(state), 8),
		configuration,
		DEFAULT_FOG_CONFIGURATION,
	);
describe("Shared merchant economy continuation", () => {
	it("shares stock across stalls and preserves purchase, consumption and sale ownership on resume", () => {
		let state = atMerchant(
			{
				...fresh(),
				monsters: [],
				gold: 2000,
				player: { health: 5, maxHealth: 10 },
				bag: { items: [{ id: "bag:sale", kind: "iron-sword" }] },
			},
			5,
		);
		const merchant5 = state.objects.find(
			(o) => o.kind === "merchant" && o.floorNumber === 5,
		);
		if (!merchant5) throw new Error("Expected floor-five merchant");
		state = resolvePlayerAction(state, {
			type: "buy",
			merchantId: merchant5.id,
			kind: "healing-potion",
		}).state;
		const bottle = state.bag.items.find((i) => i.kind === "healing-potion");
		if (!bottle) throw new Error("Expected purchased bottle");
		state = resolvePlayerAction(state, {
			type: "consume",
			itemId: bottle.id,
		}).state;
		state = resolvePlayerAction(state, {
			type: "sell",
			merchantId: merchant5.id,
			itemId: "bag:sale",
		}).state;
		state = atMerchant(state, 10);
		const merchant10 = state.objects.find(
			(o) => o.kind === "merchant" && o.floorNumber === 10,
		);
		if (!merchant10) throw new Error("Expected floor-ten merchant");
		state = resolvePlayerAction(state, {
			type: "buy",
			merchantId: merchant10.id,
			kind: "healing-potion",
		}).state;
		expect(state.merchantStock["healing-potion"]).toBe(8);
		expect(state.bag.items).toHaveLength(1);
		expect(state.bag.items[0].id).not.toBe(bottle.id);
		expect(state.gold).toBe(1720);
		const parsed = parseSave(serializeSave(snapshot(state)));
		if (!parsed.ok) throw new Error(parsed.error);
		const loaded = restoreSave(parsed.value).state;
		expect(loaded).toEqual(state);
		const action = {
			type: "buy" as const,
			merchantId: merchant10.id,
			kind: "mana-potion" as const,
		};
		expect(resolvePlayerAction(loaded, action)).toEqual(
			resolvePlayerAction(state, action),
		);
		expect(atMerchant(loaded, 5).merchantStock["healing-potion"]).toBe(8);
		expect(fresh().merchantStock["healing-potion"]).toBe(10);
	});
	it("rejects purchased-copy identity beyond spent stock or with the wrong supply kind", () => {
		const state = fresh();
		const document = snapshot(state);
		for (const item of [
			{ id: "merchant:healing-potion:1", kind: "healing-potion" },
			{ id: "merchant:mana-potion:1", kind: "healing-potion" },
		])
			expect(
				parseSave(
					JSON.stringify({
						...document,
						state: { ...document.state, bag: { items: [item] } },
					}),
				).ok,
			).toBe(false);
	});
	it("keeps the shared stock through a real staircase ascent and return-wave activation", () => {
		let state = fresh();
		state = {
			...state,
			monsters: [],
			merchantStock: { ...state.merchantStock, "mana-potion": 2 },
			quest: { ...state.quest, cureRecovered: true },
			floorItems: state.floorItems.filter((i) => i.item.kind !== "cure"),
			escape: { startedTurn: 0, activatedFloors: [] },
		};
		const floor = state.run.floors[5],
			stair = floor.upStair;
		if (!stair) throw new Error("Expected floor-six up stair");
		const approach = [
			{
				direction: "down",
				row: stair.coordinate.row - 1,
				col: stair.coordinate.col,
			},
			{
				direction: "left",
				row: stair.coordinate.row,
				col: stair.coordinate.col + 1,
			},
			{
				direction: "up",
				row: stair.coordinate.row + 1,
				col: stair.coordinate.col,
			},
			{
				direction: "right",
				row: stair.coordinate.row,
				col: stair.coordinate.col - 1,
			},
		] as const;
		const point = approach.find((p) => floor.terrain[p.row]?.[p.col] === ".");
		if (!point) throw new Error("Expected stair approach");
		state = {
			...state,
			run: {
				...state.run,
				activeFloor: 6,
				playerCoordinate: { row: point.row, col: point.col },
			},
		};
		const returned = resolvePlayerAction(state, {
			type: "move",
			direction: point.direction,
		}).state;
		expect(returned.run.activeFloor).toBe(5);
		expect(returned.escape?.activatedFloors).toContain(5);
		expect(returned.merchantStock).toBe(state.merchantStock);
		expect(returned.merchantStock["mana-potion"]).toBe(2);
		expect(returned.objects).toBe(state.objects);
	});
	it("rejects imported merchants inside an elite chamber even behind an opened gate", () => {
		const chamberConfiguration = {
			...DEFAULT_RUN_CONFIGURATION,
			rows: 40,
			cols: 40,
		};
		// The first seed with a chamber on a merchant's floor.
		const found = (() => {
			for (let seed = 123; seed < 400; seed++) {
				const base = withFlameOnFloor(
					createGameState(
						connectDungeonFloors(
							generateDungeonRun(seed, 20, chamberConfiguration),
						),
					),
				);
				const encounters = addOptionalEliteRooms(base, { chance: 1 });
				const gate = encounters.objects.find(
					(o) =>
						o.kind === "elite-door" &&
						encounters.objects.some(
							(m) => m.kind === "merchant" && m.floorNumber === o.floorNumber,
						),
				);
				if (gate) return { base, encounters, gate };
			}
			throw new Error("Expected a chamber on a merchant's floor");
		})();
		const { base, encounters, gate } = found;
		const chamberFloor = gate.floorNumber;
		const floor = base.run.floors[chamberFloor - 1],
			chamber = findOptionalEliteRooms(
				floor,
				protectedFloorLocations(base.run, chamberFloor),
			).find((c) => coordinateKey(c.gate) === coordinateKey(gate.coordinate));
		if (!chamber) throw new Error("Expected chamber geometry");
		const state = {
			...base,
			...encounters,
			objects: encounters.objects.map((o) =>
				o.id === gate.id
					? { ...o, activated: true }
					: o.kind === "merchant" && o.floorNumber === chamberFloor
						? {
								...o,
								coordinate: {
									row: chamber.room.startRow,
									col: chamber.room.startCol,
								},
							}
						: o,
			),
		};
		const document = createSaveDocument(
			state,
			updateExploration(navigationRun(state), 8),
			chamberConfiguration,
			DEFAULT_FOG_CONFIGURATION,
		);
		expect(parseSave(serializeSave(document)).ok).toBe(false);
	}, 15000);
});
