import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { updateExploration } from "../domain/dungeon/Exploration";
import { DEFAULT_FOG_CONFIGURATION } from "../domain/dungeon/RunConfiguration";
import { createGameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { createSaveDocument } from "../domain/saves/SaveFormat";
import { COMPACT_TEST_CONFIGURATION } from "./TestRunConfiguration";

export const savedAdventure = () => {
	const run = connectDungeonFloors(
		generateDungeonRun(
			123,
			COMPACT_TEST_CONFIGURATION.floorCount,
			COMPACT_TEST_CONFIGURATION,
		),
	);
	let state = createGameState(run);
	let exploration = updateExploration(run, DEFAULT_FOG_CONFIGURATION.radius);
	for (let i = 0; i < 3; i++) {
		state = resolvePlayerAction(state, { type: "wait" }).state;
		exploration = updateExploration(
			state.run,
			DEFAULT_FOG_CONFIGURATION.radius,
			exploration,
		);
	}
	return createSaveDocument(
		state,
		exploration,
		COMPACT_TEST_CONFIGURATION,
		DEFAULT_FOG_CONFIGURATION,
		new Date("2026-10-11T12:00:00.000Z"),
	);
};

// A quiet saved run with both shortcuts immediately usable after restoration.
export const savedAdventureWithPickupAndHealing = () => {
	const document = savedAdventure();
	return {
		...document,
		state: {
			...document.state,
			monsters: [],
			player: { health: 5, maxHealth: 10 },
			mana: 10,
			floorItems: [
				...document.state.floorItems,
				{
					item: { id: "save-review:potion", kind: "healing-potion" as const },
					floorNumber: document.state.run.activeFloor,
					coordinate: document.state.run.playerCoordinate,
				},
			],
		},
	};
};

// Build historical inputs without the stock field introduced in v24. Played fields remain intact.
export const historicalSaveText = (document: {
	version: number;
	state: object;
}): string => {
	const state = { ...document.state };
	if (document.version < 27) Reflect.deleteProperty(state, "townPortal");
	if (
		document.version < 26 &&
		"progression" in state &&
		typeof state.progression === "object" &&
		state.progression !== null
	) {
		const progression = { ...state.progression };
		Reflect.deleteProperty(progression, "permanentAttributes");
		Reflect.set(state, "progression", progression);
	}
	if (document.version < 25)
		Reflect.deleteProperty(state, "townEquipmentStock");
	if (document.version < 24) Reflect.deleteProperty(state, "townPotionStock");
	return JSON.stringify({ ...document, state });
};
