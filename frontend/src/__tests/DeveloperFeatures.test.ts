import { expect, it } from "vitest";
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
	RARE_DISCOVERY_KINDS,
} from "../domain/game/DeveloperFeatures";
import { createGameState, type GameState } from "../domain/game/GameState";
import { createTestSeedState } from "../domain/game/TestSeed";
import { isMimicChest } from "../domain/objects/MimicChests";
import { openChest } from "../domain/objects/TreasureChests";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
} from "../domain/saves/SaveFormat";

const features = Object.keys(DEVELOPER_FEATURES) as DeveloperFeature[];
const run = (seed: number) =>
	connectDungeonFloors(generateDungeonRun(seed, 20, DEFAULT_RUN_CONFIGURATION));
const count = (state: GameState, feature: DeveloperFeature) => {
	switch (feature) {
		case "omens":
			return state.omens.length;
		case "arena":
			return state.arenas.length;
		case "pacts":
			return state.objects.filter((o) => o.kind === "dark-altar").length;
		case "thieves":
			return state.monsters.filter((m) => m.kind === "treasure-thief").length;
		case "mimics":
			return (
				state.monsters.filter((m) => m.kind === "treasure-mimic").length +
				state.objects.filter((o) =>
					isMimicChest(state.run.seed, o, state.disabledFeatures),
				).length
			);
		case "vaults":
			return state.objects.filter((o) => o.kind === "cracked-wall").length;
		case "discoveries":
			return state.objects.filter((o) =>
				(RARE_DISCOVERY_KINDS as readonly string[]).includes(o.kind),
			).length;
		case "elites":
			return state.objects.filter((o) => o.kind === "elite-door").length;
		case "merchants":
			return state.objects.filter((o) => o.kind === "merchant").length;
		case "rareFinds":
			return state.floorItems.filter((e) => e.item.id.startsWith("rare-find:"))
				.length;
	}
};
it.each(features)(
	"excludes %s deterministically without changing unrelated ordinary content",
	(feature) => {
		let present = 0;
		for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
			const dungeon = run(seed),
				normal = createGameState(dungeon),
				disabled = createGameState(dungeon, 1, [feature]);
			present += count(normal, feature);
			expect(count(disabled, feature)).toBe(0);
			expect(disabled).toEqual(createGameState(dungeon, 1, [feature]));
			expect(disabled.developerRun).toBe(true);
			if (feature !== "omens") {
				const arenaFloor =
					feature === "arena" ? normal.arenas[0]?.floorNumber : undefined;
				const comparable = (state: GameState) =>
					state.monsters.filter(
						(m) =>
							m.floorNumber !== arenaFloor &&
							!(feature === "thieves" && m.kind === "treasure-thief") &&
							!(feature === "elites" && m.kind === "iron-champion"),
					);
				expect(comparable(disabled)).toEqual(comparable(normal));
			}
			const saved = createSaveDocument(
				disabled,
				updateExploration(disabled.run, 8),
				DEFAULT_RUN_CONFIGURATION,
				DEFAULT_FOG_CONFIGURATION,
			);
			const parsed = parseSave(JSON.stringify(saved));
			expect(parsed.ok, parsed.ok ? undefined : parsed.error).toBe(true);
			if (parsed.ok)
				expect(restoreSave(parsed.value).state.disabledFeatures).toEqual([
					feature,
				]);
		}
		expect(present).toBeGreaterThan(0);
	},
);
it("keeps all-enabled generation unchanged, and applies every switch to the derived test seed", () => {
	expect(createGameState(run(123), 1, [])).toEqual(createGameState(run(123)));
	const state = createTestSeedState(DEFAULT_RUN_CONFIGURATION, features);
	for (const feature of features)
		expect(count(state, feature), feature).toBe(0);
	const document = createSaveDocument(
		createGameState(run(123), 1, features),
		updateExploration(run(123), 8),
		DEFAULT_RUN_CONFIGURATION,
		DEFAULT_FOG_CONFIGURATION,
	);
	delete document.state.developerRun;
	expect(parseSave(JSON.stringify(document)).ok).toBe(false);
});
it("turns a seeded mimic into an ordinary chest without moving its reward", () => {
	for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
		const dungeon = run(seed),
			normal = createGameState(dungeon);
		const chest = normal.objects.find((o) => isMimicChest(seed, o));
		if (!chest) continue;
		const disabled = createGameState(dungeon, 1, ["mimics"]),
			result = openChest(disabled, chest);
		expect("error" in result).toBe(false);
		if ("error" in result) throw Error(result.error);
		expect(result.activityHistory.entries.at(-1)?.event.type).toBe(
			"chest-opened",
		);
		expect(result.monsters.some((m) => m.kind === "treasure-mimic")).toBe(
			false,
		);
		return;
	}
	throw Error("A test seed must contain a mimic chest");
});
