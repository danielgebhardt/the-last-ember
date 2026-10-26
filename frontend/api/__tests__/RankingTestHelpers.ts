import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../../src/domain/dungeon/DungeonRun.ts";
import { updateExploration } from "../../src/domain/dungeon/Exploration.ts";
import {
	DEFAULT_FOG_CONFIGURATION,
	DEFAULT_RUN_CONFIGURATION,
} from "../../src/domain/dungeon/RunConfiguration.ts";
import { createGameState } from "../../src/domain/game/GameState.ts";
import { createSaveDocument } from "../../src/domain/saves/SaveFormat.ts";

export const rankedAdventure = () => {
	const run = connectDungeonFloors(
		generateDungeonRun(123, 20, DEFAULT_RUN_CONFIGURATION),
	);
	const state = {
		...createGameState(run),
		ranked: true as const,
		rankingVersion: "0.3.0-alpha",
		runId: crypto.randomUUID(),
	};
	const document = createSaveDocument(
		state,
		updateExploration(run, 8),
		DEFAULT_RUN_CONFIGURATION,
		DEFAULT_FOG_CONFIGURATION,
	);
	document.state.player.health = 0;
	document.state.town = null;
	return document;
};
