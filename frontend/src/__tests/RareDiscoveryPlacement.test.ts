// @vitest-environment node
import { expect, it } from "vitest";
import {
	connectDungeonFloors,
	generateDungeonRun,
	hashStringToUint32,
} from "../domain/dungeon/DungeonRun";
import { createSeededRandom } from "../domain/dungeon/Seed";
import { createGameState } from "../domain/game/GameState";
import {
	coordinateKey,
	protectedSpawnLocations,
} from "../domain/monsters/MonsterLocations";
import { OBJECT_DEFINITIONS } from "../domain/objects/DungeonObject";
import {
	placeRareDiscovery,
	rareDiscoverySelection,
} from "../domain/objects/RareDiscoveryPlacement";
import { COMPACT_TEST_CONFIGURATION } from "./TestRunConfiguration";

it("keeps the shared discovery pool rare, singular, deterministic and safely inside rooms across 200 full-depth seeds", () => {
	const counts = { sarcophagus: 0, throne: 0, fountain: 0, reliquary: 0 };
	for (let seed = 0; seed < 200; seed++) {
		const run = connectDungeonFloors(
			generateDungeonRun(seed, 20, COMPACT_TEST_CONFIGURATION),
		);
		const state = createGameState(run);
		const tombs = state.objects.filter((o) => o.kind === "sarcophagus");
		expect(tombs.length).toBeLessThanOrEqual(1);
		for (const object of state.objects)
			if (object.kind in counts) counts[object.kind as keyof typeof counts]++;
		// Preserve each old object's isolated presence stream and first-reliquary cap.
		for (const kind of ["throne", "fountain", "reliquary"] as const) {
			const definition = OBJECT_DEFINITIONS[kind];
			const eligible = run.floors.filter(
				(f) =>
					f.floorNumber >= definition.minFloor &&
					createSeededRandom(
						hashStringToUint32(
							`${seed}:${f.floorNumber}:object:${kind}:1:present`,
						),
					)() < definition.chance,
			);
			const placed = state.objects.filter((o) => o.kind === kind);
			expect(placed.length).toBeLessThanOrEqual(
				kind === "reliquary" ? 1 : eligible.length,
			);
			for (const object of placed)
				expect(eligible.map((f) => f.floorNumber)).toContain(
					object.floorNumber,
				);
		}
		for (const tomb of tombs) {
			const floor = run.floors[tomb.floorNumber - 1];
			expect(
				floor.rooms.some(
					(r) =>
						tomb.coordinate.row > r.startRow &&
						tomb.coordinate.row < r.endRow &&
						tomb.coordinate.col > r.startCol &&
						tomb.coordinate.col < r.endCol,
				),
			).toBe(true);
			const occupied = [
				...state.monsters,
				...state.floorItems,
				...state.objects.filter((o) => o !== tomb),
			]
				.filter((e) => e.floorNumber === tomb.floorNumber)
				.map((e) => coordinateKey(e.coordinate));
			expect(occupied).not.toContain(coordinateKey(tomb.coordinate));
			expect(
				protectedSpawnLocations(run, tomb.floorNumber).map(coordinateKey),
			).not.toContain(coordinateKey(tomb.coordinate));
			expect(rareDiscoverySelection(run)).toEqual({
				kind: "sarcophagus",
				floorNumber: tomb.floorNumber,
			});
			expect(createGameState(run).objects).toEqual(state.objects);
		}
	}
	// 60% of adventures, shared by five ordinary kinds and a half-weight hourglass:
	// about 22 of 200.
	expect(counts.sarcophagus).toBeGreaterThan(10);
	expect(counts.sarcophagus).toBeLessThan(40);
	expect(counts.sarcophagus).toBeLessThan(counts.throne / 10);
	expect(counts.sarcophagus).toBeLessThan(counts.fountain / 10);
	console.info("200-seed discovery corpus", counts);
});
it("omits deterministically without eligible floors or safe room interiors", () => {
	const run = generateDungeonRun(0, 1, COMPACT_TEST_CONFIGURATION);
	expect(rareDiscoverySelection(run)).toBeUndefined();
	let seed = 0;
	const full = generateDungeonRun(0, 5, COMPACT_TEST_CONFIGURATION);
	while (!rareDiscoverySelection({ ...full, seed })) seed++;
	const noRooms = {
		...full,
		seed,
		floors: full.floors.map((f) => ({ ...f, rooms: [] })),
	};
	expect(placeRareDiscovery(noRooms, [], [], [])).toEqual([]);
});
