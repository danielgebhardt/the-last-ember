// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { createGameState } from "../domain/game/GameState";
import { isRareEquipmentKind } from "../domain/items/Item";
import { spawnRunItems } from "../domain/items/ItemPlacement";
import {
	LEGACY_RARE_KINDS,
	selectRunRareEquipment,
} from "../domain/items/RareEquipment";
import {
	RARE_FIND_BANDS,
	rareFindBands,
	rareFindId,
	selectRunRareFinds,
} from "../domain/items/RareFinds";
import { spawnRunMonsters } from "../domain/monsters/MonsterPlacement";
import { parseSave, serializeSave } from "../domain/saves/SaveFormat";
import { tacticalSnapshot } from "./TacticalReplayTestHelpers";
import { COMPACT_TEST_CONFIGURATION } from "./TestRunConfiguration";

// Saves are checked against the compact five-floor configuration, whose floor 5 is a
// single third.
const adventure = (seed: number) =>
	createGameState(
		connectDungeonFloors(
			generateDungeonRun(seed, 5, COMPACT_TEST_CONFIGURATION),
		),
	);

describe("Rare equipment finds", () => {
	it("splits floors 5–20 into three contiguous thirds, and short dungeons into fewer", () => {
		expect(rareFindBands(20)).toEqual([
			[5, 9],
			[10, 14],
			[15, 20],
		]);
		expect(rareFindBands(6)).toEqual([
			[5, 5],
			[6, 6],
		]);
		expect(rareFindBands(4)).toEqual([]);
	});

	it("rolls each third once, picks distinct kinds that fit its floors, and puts a find in about 58% of runs", () => {
		let withFind = 0;
		for (let seed = 0; seed < 600; seed++) {
			const finds = selectRunRareFinds(seed, 20);
			expect(selectRunRareFinds(seed, 20)).toEqual(finds);
			expect(finds.length).toBeLessThanOrEqual(RARE_FIND_BANDS);
			expect(new Set(finds.map((find) => find.kind)).size).toBe(finds.length);
			if (finds.length) withFind++;
		}
		// 1 − 0.75³ ≈ 58%.
		expect(withFind / 600).toBeGreaterThan(0.5);
		expect(withFind / 600).toBeLessThan(0.66);
	});

	it("hides each selected find once on a free tile in its third without moving ordinary loot", () => {
		let checked = 0;
		for (let seed = 0; seed < 40; seed++) {
			const run = connectDungeonFloors(
				generateDungeonRun(seed, 20, COMPACT_TEST_CONFIGURATION),
			);
			const state = createGameState(run);
			expect(state.rareEquipment).toBeNull();
			// The arena replaces its floor whole, so whatever lay there is gone.
			const arena = state.arenas?.[0]?.floorNumber;
			for (const ordinary of spawnRunItems(run, spawnRunMonsters(run)))
				if (ordinary.floorNumber !== arena)
					expect(state.floorItems).toContainEqual(ordinary);
			const placed = state.floorItems.filter(
				(entry) =>
					isRareEquipmentKind(entry.item.kind) &&
					!entry.item.id.startsWith("arena-reward:"),
			);
			const finds = selectRunRareFinds(seed, 20).filter((find) =>
				placed.some((entry) => entry.item.kind === find.kind),
			);
			for (const find of selectRunRareFinds(seed, 20))
				if (!finds.some((kept) => kept.kind === find.kind)) {
					expect(arena).toBeGreaterThanOrEqual(find.minFloor);
					expect(arena).toBeLessThanOrEqual(find.maxFloor);
				}
			expect(placed.map((entry) => entry.item)).toEqual(
				finds.map((find) => ({ id: rareFindId(find.kind), kind: find.kind })),
			);
			for (const [index, entry] of placed.entries()) {
				expect(entry.floorNumber).toBeGreaterThanOrEqual(finds[index].minFloor);
				expect(entry.floorNumber).toBeLessThanOrEqual(finds[index].maxFloor);
				checked++;
			}
		}
		expect(checked).toBeGreaterThan(10);
	});

	it("keeps the original single selection to its two kinds, so new rares never change older saves", () => {
		const kinds = new Set<string>();
		for (let seed = 0; seed < 400; seed++) {
			const legacy = selectRunRareEquipment(seed, 20);
			if (legacy) kinds.add(legacy.kind);
		}
		expect([...kinds].sort()).toEqual([...LEGACY_RARE_KINDS].sort());
	});

	it("saves a find and rejects a duplicate copy or a kind the seed never selected", () => {
		let seed = 0;
		while (!selectRunRareFinds(seed, 5).length) seed++;
		const state = adventure(seed);
		const document = tacticalSnapshot(state);
		expect(parseSave(serializeSave(document)).ok).toBe(true);
		const find = state.floorItems.find((entry) =>
			entry.item.id.startsWith("rare-find:"),
		);
		if (!find) throw new Error("Expected a placed find");
		const duplicate = {
			...document,
			state: { ...document.state, bag: { items: [find.item] } },
		};
		expect(parseSave(JSON.stringify(duplicate)).ok).toBe(false);
		const other = (["warding-cloak", "spellguard-shield"] as const).find(
			(kind) => !selectRunRareFinds(seed, 5).some((f) => f.kind === kind),
		);
		if (other) {
			const unselected = {
				...document,
				state: {
					...document.state,
					bag: { items: [{ id: rareFindId(other), kind: other }] },
				},
			};
			expect(parseSave(JSON.stringify(unselected)).ok).toBe(false);
		}
	});
});
