// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	corpusAdventure,
	corpusCsv,
	recordAdventure,
	seedCorpusReport,
	summarizeCorpus,
} from "../domain/dev/SeedCorpus";
import { MONSTER_DEFINITIONS } from "../domain/monsters/Monster";
import { OBJECT_DEFINITIONS } from "../domain/objects/DungeonObject";
import { COMPACT_TEST_CONFIGURATION as config } from "./TestRunConfiguration";

const seeds = Array.from({ length: 40 }, (_, seed) => seed);
const records = seeds.map((seed) =>
	recordAdventure(corpusAdventure(seed, config)),
);

describe("seed corpus report", () => {
	it("records each adventure from the real generated state", () => {
		const state = corpusAdventure(7, config);
		const record = recordAdventure(state);
		expect(record.monstersPerFloor.reduce((a, b) => a + b, 0)).toBe(
			state.monsters.length,
		);
		expect(record.monstersPerFloor).toHaveLength(config.floorCount);
		// The cure floor gets no return wave.
		expect(record.huntersPerReturnFloor).toHaveLength(
			state.quest.goalFloor - 1,
		);
	});

	it("respects the placement rules it reports on", () => {
		for (const record of records) {
			if (record.discovery)
				expect(record.discovery.floor).toBeGreaterThanOrEqual(
					OBJECT_DEFINITIONS[record.discovery.kind].minFloor,
				);
			// The sparse budget allows at most one dedicated source per floor.
			const sparse = record.afflictionSources.filter(
				({ kind }) => MONSTER_DEFINITIONS[kind].afflictionSource,
			);
			expect(new Set(sparse.map((s) => s.floor)).size).toBe(sparse.length);
		}
	});

	it("is deterministic and summarizes shares between 0 and 1", async () => {
		const first = await seedCorpusReport(seeds, config);
		const second = await seedCorpusReport(seeds, config);
		expect(first.summary).toEqual(second.summary);
		expect(first.summary).toEqual(summarizeCorpus(records));
		const { discoveries } = first.summary;
		expect(discoveries.any).toBeGreaterThan(0);
		expect(discoveries.any).toBeLessThanOrEqual(1);
		const kindShares = discoveries.byKind.reduce((a, d) => a + d.share, 0);
		expect(kindShares).toBeCloseTo(discoveries.any, 10);
		expect(first.summary.economy.cumulativeGold.at(-1)).toBeCloseTo(
			first.summary.economy.goldPerFloor.reduce((a, b) => a + b, 0),
			6,
		);
	});

	it("exports one CSV row per adventure", () => {
		const lines = corpusCsv(records).split("\n");
		expect(lines[0]).toMatch(/^seed,discovery,/);
		expect(lines).toHaveLength(records.length + 1);
	});
});
