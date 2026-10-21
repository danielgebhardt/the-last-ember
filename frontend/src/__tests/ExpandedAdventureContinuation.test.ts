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
import { awardExperience } from "../domain/game/ExperienceRewards";
import { createGameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { experienceThreshold } from "../domain/game/Progression";
import { navigationRun } from "../domain/objects/NavigationTerrain";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";

describe("Generated expanded adventure continuation", () => {
	it.each([60, 100])(
		"retains a real %ix20-floor adventure and reproduces subsequent phases",
		(size) => {
			const configuration = {
				...DEFAULT_RUN_CONFIGURATION,
				rows: size,
				cols: size,
			};
			const makeState = () =>
				createGameState(
					connectDungeonFloors(generateDungeonRun(123, 20, configuration)),
				);
			const initial = makeState();
			expect(makeState()).toEqual(initial);
			expect(initial.run.floors).toHaveLength(20);
			expect(
				initial.monsters.filter(
					(actor) =>
						actor.kind !== "iron-champion" && actor.kind !== "ember-warden",
				),
			).toHaveLength(240);
			expect(initial.bag.items.map((item) => item.kind)).toEqual([
				"healing-potion",
				"mana-potion",
			]);
			// An earned late-game character keeps this continuation check alive while
			// real generated actors, discoveries and deterministic rolls remain intact.
			let original = awardExperience(initial, experienceThreshold(20));
			original = { ...original, turn: 28, mana: 2 };
			let explored = updateExploration(
				navigationRun(original),
				DEFAULT_FOG_CONFIGURATION.radius,
			);
			const document = createSaveDocument(
				original,
				explored,
				configuration,
				DEFAULT_FOG_CONFIGURATION,
			);
			const parsed = parseSave(serializeSave(document));
			expect(parsed.ok).toBe(true);
			if (!parsed.ok) throw new Error(parsed.error);
			const restored = restoreSave(parsed.value);
			let loaded = restored.state;
			let loadedExplored = restored.exploration;
			expect(loaded).toEqual(original);
			for (let step = 0; step < 8; step++) {
				original = resolvePlayerAction(original, { type: "wait" }).state;
				loaded = resolvePlayerAction(loaded, { type: "wait" }).state;
				explored = updateExploration(
					navigationRun(original),
					DEFAULT_FOG_CONFIGURATION.radius,
					explored,
				);
				loadedExplored = updateExploration(
					navigationRun(loaded),
					DEFAULT_FOG_CONFIGURATION.radius,
					loadedExplored,
				);
				expect(loaded).toEqual(original);
				expect(loadedExplored.explored).toEqual(explored.explored);
			}
			expect(original.turn).toBe(36);
			expect(original.player.health).toBeGreaterThan(0);
			expect(original.mana).toBe(3);
		},
		15000,
	);
});
