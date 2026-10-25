// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import {
	monsterCountForSpace,
	spawnRunMonsters,
} from "../domain/monsters/MonsterPlacement";
import { COMPACT_TEST_CONFIGURATION } from "./TestRunConfiguration";

describe("Capped monster population density", () => {
	it.each([-1, 1.5, NaN, Infinity])(
		"rejects an invalid safe-space count %s",
		(space) => expect(() => monsterCountForSpace(space)).toThrow(RangeError),
	);

	it.each([
		[0, 0],
		[1, 1],
		[20, 2],
		[60, 2],
		[61, 3],
		[360, 12],
		[5000, 12],
	])("uses %i safe tiles for %i monsters", (space, count) =>
		expect(monsterCountForSpace(space)).toBe(count),
	);
	it("caps large floors, preserves explicit counts, and reproduces populations", () => {
		const run = connectDungeonFloors(
			generateDungeonRun(0, 2, {
				...COMPACT_TEST_CONFIGURATION,
				rows: 40,
				cols: 40,
			}),
		);
		const monsters = spawnRunMonsters(run);
		expect(monsters).toHaveLength(24);
		expect(spawnRunMonsters(run)).toEqual(monsters);
		expect(spawnRunMonsters(run, 1)).toHaveLength(2);
		expect(spawnRunMonsters(run, 0)).toEqual([]);
	});
});
