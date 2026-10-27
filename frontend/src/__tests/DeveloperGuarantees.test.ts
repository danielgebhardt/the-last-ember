import { expect, it } from "vitest";
import { createAdventureSession } from "../components/game/useAdventureSession";
import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { updateExploration } from "../domain/dungeon/Exploration";
import {
	DEFAULT_FOG_CONFIGURATION,
	DEFAULT_RUN_CONFIGURATION,
} from "../domain/dungeon/RunConfiguration";
import {
	DEVELOPER_FEATURES,
	type DeveloperFeature,
} from "../domain/game/DeveloperFeatures";
import {
	applyDeveloperGuarantees,
	hasDeveloperFeature,
} from "../domain/game/DeveloperGuarantees";
import { createGameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { createTestSeedState } from "../domain/game/TestSeed";
import { selectRunRareFinds } from "../domain/items/RareFinds";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
} from "../domain/saves/SaveFormat";

const features = Object.keys(DEVELOPER_FEATURES) as DeveloperFeature[];
const run = (seed: number) =>
	connectDungeonFloors(generateDungeonRun(seed, 20, DEFAULT_RUN_CONFIGURATION));
it.each(features)(
	"guarantees %s, retains existing content, and saves deterministically",
	(feature) => {
		for (const seed of [1, 2, 3, 7]) {
			const dungeon = run(seed),
				normal = createGameState(dungeon);
			const state = createGameState(dungeon, 1, [], [feature]);
			expect(hasDeveloperFeature(state, feature)).toBe(true);
			expect(state).toEqual(createGameState(dungeon, 1, [], [feature]));
			expect(state.guaranteedFeatures).toEqual([feature]);
			expect(state.developerRun).toBe(true);
			expect(state.ranked).toBeUndefined();
			expect(state.disabledFeatures).toBeUndefined();
			if (hasDeveloperFeature(normal, feature)) {
				expect(state).toEqual({
					...normal,
					developerRun: true,
					guaranteedFeatures: [feature],
					ranked: undefined,
					rankingVersion: undefined,
				});
			}
			const saved = createSaveDocument(
				state,
				updateExploration(state.run, 8),
				DEFAULT_RUN_CONFIGURATION,
				DEFAULT_FOG_CONFIGURATION,
			);
			const parsed = parseSave(JSON.stringify(saved));
			expect(parsed.ok, parsed.ok ? undefined : parsed.error).toBe(true);
			if (parsed.ok) expect(restoreSave(parsed.value).state).toEqual(state);
			delete saved.state.developerRun;
			expect(parseSave(JSON.stringify(saved)).ok).toBe(false);
		}
	},
);
it("keeps no-selection generation normal and marks even already-present guarantees as unranked", () => {
	expect(createGameState(run(123), 1, [], [])).toEqual(
		createGameState(run(123)),
	);
	const state = createAdventureSession(
		123,
		DEFAULT_RUN_CONFIGURATION,
		DEFAULT_FOG_CONFIGURATION,
		true,
		["arena"],
	).state;
	expect(state.guaranteedFeatures).toEqual(["arena"]);
	expect(state.ranked).toBeUndefined();
});
it("honors all guarantees together, independently of checkbox click order, including the test seed", () => {
	for (const seed of [1, 2, 3, 7]) {
		const dungeon = run(seed);
		const state = createGameState(dungeon, 1, [], features);
		for (const feature of features)
			expect(hasDeveloperFeature(state, feature), feature).toBe(true);
		expect(state).toEqual(
			createGameState(dungeon, 1, [], [...features].reverse()),
		);
	}
	const test = createTestSeedState(DEFAULT_RUN_CONFIGURATION, [], features);
	for (const feature of features)
		expect(hasDeveloperFeature(test, feature), feature).toBe(true);
});
it("reports an impossible guarantee without changing the requested dungeon", () => {
	const config = { ...DEFAULT_RUN_CONFIGURATION, floorCount: 2 };
	expect(() =>
		createAdventureSession(123, config, DEFAULT_FOG_CONFIGURATION, false, [
			"arena",
		]),
	).toThrow(/guarantee.*arena/i);
});
it.each(features.filter((feature) => feature !== "arena"))(
	"adds a missing %s without moving ordinary content, and survives continuation",
	(feature) => {
		const base = createGameState(run(1), 1.25, [feature]);
		delete base.disabledFeatures;
		delete base.developerRun;
		// Legacy exclusion keeps ordinary chests. Remove those only for this missing-mimic fixture.
		if (feature === "mimics")
			base.objects = base.objects.filter((object) => object.kind !== "chest");
		expect(hasDeveloperFeature(base, feature)).toBe(false);
		const state = applyDeveloperGuarantees(base, [feature]);
		expect(hasDeveloperFeature(state, feature)).toBe(true);
		for (const monster of base.monsters)
			expect(state.monsters).toContainEqual(monster);
		for (const item of base.floorItems)
			expect(state.floorItems).toContainEqual(item);
		for (const object of base.objects)
			expect(state.objects).toContainEqual(object);
		const document = createSaveDocument(
			state,
			updateExploration(state.run, 8),
			{ ...DEFAULT_RUN_CONFIGURATION, difficulty: 1.25 },
			DEFAULT_FOG_CONFIGURATION,
		);
		const parsed = parseSave(JSON.stringify(document));
		expect(parsed.ok, parsed.ok ? undefined : parsed.error).toBe(true);
		if (!parsed.ok) return;
		const loaded = restoreSave(parsed.value).state;
		expect(resolvePlayerAction(loaded, { type: "wait" }).state).toEqual(
			resolvePlayerAction(state, { type: "wait" }).state,
		);
	},
);
it("preserves forced rare finds after pickup when the seed selected none, while keeping ownership checks", () => {
	let seed = 0;
	while (selectRunRareFinds(seed, 20).length) seed++;
	const state = createGameState(run(seed), 1, [], ["rareFinds"]);
	const find = state.floorItems.find((entry) =>
		entry.item.id.startsWith("rare-find:"),
	);
	if (!find) throw Error("Expected a guaranteed rare find");
	const picked = {
		...state,
		floorItems: state.floorItems.filter((entry) => entry !== find),
		bag: { items: [...state.bag.items, find.item] },
	};
	const document = createSaveDocument(
		picked,
		updateExploration(picked.run, 8),
		DEFAULT_RUN_CONFIGURATION,
		DEFAULT_FOG_CONFIGURATION,
	);
	expect(parseSave(JSON.stringify(document)).ok).toBe(true);
	document.state.floorItems = [...document.state.floorItems, find];
	expect(parseSave(JSON.stringify(document)).ok).toBe(false);
});
it("rejects malformed or contradictory guarantee metadata", () => {
	const state = createGameState(run(1), 1, [], ["arena"]);
	const saved = createSaveDocument(
		state,
		updateExploration(state.run, 8),
		DEFAULT_RUN_CONFIGURATION,
		DEFAULT_FOG_CONFIGURATION,
	);
	for (const flags of [
		{ guaranteedFeatures: [] },
		{ guaranteedFeatures: ["arena", "arena"] },
		{ guaranteedFeatures: ["unknown"] },
		{ ranked: true },
		{ rankingVersion: "0.3.0-alpha" },
		{ disabledFeatures: ["omens"] },
	]) {
		expect(
			parseSave(
				JSON.stringify({ ...saved, state: { ...saved.state, ...flags } }),
			).ok,
		).toBe(false);
	}
});
