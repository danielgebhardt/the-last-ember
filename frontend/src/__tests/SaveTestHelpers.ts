import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { updateExploration } from "../domain/dungeon/Exploration";
import { DEFAULT_FOG_CONFIGURATION } from "../domain/dungeon/RunConfiguration";
import { createGameState, type GameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { isWarden } from "../domain/monsters/EmberWarden";
import { createSaveDocument } from "../domain/saves/SaveFormat";
import { COMPACT_TEST_CONFIGURATION } from "./TestRunConfiguration";

// The Warden has fallen where it stood and its flame waits there to be claimed: a real
// game state that lets scenarios replace the monsters without losing the flame.
export const withFlameOnFloor = (state: GameState): GameState => {
	const warden = state.monsters.find(isWarden);
	if (!warden || state.floorItems.some((entry) => entry.item.kind === "cure"))
		return state;
	return {
		...state,
		monsters: state.monsters.filter((monster) => monster !== warden),
		floorItems: [
			...state.floorItems,
			{
				item: { id: "quest:cure", kind: "cure" },
				floorNumber: warden.floorNumber,
				coordinate: { ...warden.coordinate },
			},
		],
	};
};

const buildSavedAdventure = () => {
	const run = connectDungeonFloors(
		generateDungeonRun(
			123,
			COMPACT_TEST_CONFIGURATION.floorCount,
			COMPACT_TEST_CONFIGURATION,
		),
	);
	let state = withFlameOnFloor(createGameState(run));
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

// Build expensive deterministic geometry once per test module; every caller owns a deep clone.
let cachedAdventure: ReturnType<typeof buildSavedAdventure> | undefined;
export const savedAdventure = () => {
	cachedAdventure ??= buildSavedAdventure();
	return structuredClone(cachedAdventure);
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
