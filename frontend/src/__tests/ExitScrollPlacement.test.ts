// @vitest-environment node
import { expect, it } from "vitest";
import { spawnRunExitScrolls } from "../domain/items/ExitScrollPlacement";
import { spawnRunItems } from "../domain/items/ItemPlacement";
import { spawnRunSpellbooks } from "../domain/items/SpellbookPlacement";
import { equipmentSalePrice } from "../domain/merchant/MerchantRules";
import { corridorContinuationAdventure } from "./CorridorContinuationTestHelpers";

it("uses deterministic rare room placement on deeper floors without ordinary loot or book rerolls", () => {
	const { state } = corridorContinuationAdventure();
	const occupied = state.floorItems;
	const ordinary = spawnRunItems(state.run, []);
	const books = spawnRunSpellbooks(state.run, [], occupied);
	let copies = 0;
	for (let seed = 0; seed < 200; seed++) {
		const run = { ...state.run, seed };
		const scrolls = spawnRunExitScrolls(run, [], occupied);
		expect(spawnRunExitScrolls(run, [], occupied)).toEqual(scrolls);
		expect(new Set(scrolls.map((x) => x.floorNumber)).size).toBe(
			scrolls.length,
		);
		for (const scroll of scrolls) {
			expect(scroll.floorNumber).toBeGreaterThan(1);
			expect(scroll.item.kind).toBe("exit-scroll");
			expect(
				run.floors[scroll.floorNumber - 1].terrain[scroll.coordinate.row][
					scroll.coordinate.col
				],
			).toBe(".");
			expect(
				occupied.some(
					(x) =>
						x.floorNumber === scroll.floorNumber &&
						x.coordinate.row === scroll.coordinate.row &&
						x.coordinate.col === scroll.coordinate.col,
				),
			).toBe(false);
		}
		copies += scrolls.length;
	}
	expect(copies).toBeGreaterThan(60);
	expect(copies).toBeLessThan(180);
	expect(spawnRunItems(state.run, [])).toEqual(ordinary);
	expect(spawnRunSpellbooks(state.run, [], occupied)).toEqual(books);
	expect(equipmentSalePrice({ id: "scroll", kind: "exit-scroll" })).toBeNull();
});
it("skips fully occupied rooms instead of overwriting content", () => {
	const { state } = corridorContinuationAdventure();
	const occupied = state.run.floors.flatMap((floor) =>
		floor.terrain.flatMap((row, r) =>
			row.flatMap((tile, col) =>
				tile === "."
					? [{ floorNumber: floor.floorNumber, coordinate: { row: r, col } }]
					: [],
			),
		),
	);
	expect(
		spawnRunExitScrolls(
			state.run,
			[],
			occupied.map((x, i) => ({
				...x,
				item: { id: `occupied:${i}`, kind: "healing-potion" as const },
			})),
		),
	).toEqual([]);
});
