import { useMemo, useState } from "react";
import {
	connectDungeonFloors,
	type DungeonRun,
	generateDungeonRun,
} from "../../domain/dungeon/DungeonRun";
import { updateExploration } from "../../domain/dungeon/Exploration";
import type {
	FogConfiguration,
	RunConfiguration,
} from "../../domain/dungeon/RunConfiguration";
import { appendActivityEvents } from "../../domain/game/ActivityHistory";
import { afflictedSightRadius } from "../../domain/game/AfflictionDefinitions";
import { createGameState } from "../../domain/game/GameState";
import {
	type PlayerAction,
	resolvePlayerAction,
} from "../../domain/game/PlayerActions";
import { createTestSeedState, isTestSeed } from "../../domain/game/TestSeed";
import { itemsAtPlayer } from "../../domain/items/FloorItems";
import { objectAvailable } from "../../domain/merchant/MerchantAvailability";
import {
	visibleAwarenessEvents,
	visibleThreatHistory,
} from "../../domain/monsters/VisibleAwareness";
import { navigationRun } from "../../domain/objects/NavigationTerrain";
import {
	type RestoredAdventure,
	restoreSave,
	type SaveDocument,
} from "../../domain/saves/SaveFormat";

const createRun = (
	seed: number,
	configuration: RunConfiguration,
): DungeonRun => {
	const {
		floorCount,
		difficulty: _difficulty,
		...dungeonConfig
	} = configuration;
	return connectDungeonFloors(
		generateDungeonRun(seed, floorCount, dungeonConfig),
	);
};

import { createTownLocation } from "../../domain/town/TownLocation";

type Session = RestoredAdventure & { actionError: string };
type SessionOptions = {
	initialSeed?: number;
	initialAdventure?: RestoredAdventure;
	initialConfiguration: RunConfiguration;
	initialFogConfiguration: FogConfiguration;
};

export const createAdventureSession = (
	seed: number,
	configuration: RunConfiguration,
	fog: FogConfiguration,
): Session => {
	const state = isTestSeed(seed)
		? createTestSeedState(configuration)
		: createGameState(
				createRun(seed, configuration),
				configuration.difficulty ?? 1,
			);
	return {
		state: { ...state, town: createTownLocation() },
		configuration,
		fog,
		exploration: updateExploration(
			navigationRun(state),
			afflictedSightRadius(fog.radius, state.afflictions),
		),
		actionError: "",
	};
};

// One state replacement keeps terrain, resources, settings and discovery together.
// Dialog lifecycle and focus belong to Home, not to the adventure session.
export const useAdventureSession = ({
	initialSeed,
	initialAdventure,
	initialConfiguration,
	initialFogConfiguration,
}: SessionOptions) => {
	const [session, setSession] = useState<Session>(() =>
		initialAdventure
			? { ...initialAdventure, actionError: "" }
			: createAdventureSession(
					initialSeed ?? 0,
					initialConfiguration,
					initialFogConfiguration,
				),
	);
	const { run } = session.state;
	const currentItems = session.state.town ? [] : itemsAtPlayer(session.state);
	const activeFloor = navigationRun(session.state).floors[run.activeFloor - 1];
	const activeObjects = useMemo(
		() =>
			session.state.objects.filter(
				(object) =>
					!session.state.town &&
					object.floorNumber === run.activeFloor &&
					objectAvailable(object) &&
					!(object.kind === "gold" && object.activated),
			),
		[session.state.objects, session.state.town, run.activeFloor],
	);
	const activeMonsters = useMemo(
		() =>
			session.state.monsters.filter(
				(monster) =>
					!session.state.town &&
					monster.floorNumber === run.activeFloor &&
					monster.health > 0,
			),
		[session.state.monsters, session.state.town, run.activeFloor],
	);
	const activeItems = useMemo(
		() =>
			session.state.floorItems.filter(
				(item) => !session.state.town && item.floorNumber === run.activeFloor,
			),
		[session.state.floorItems, session.state.town, run.activeFloor],
	);

	const start = (seed: number, configuration: RunConfiguration): boolean => {
		try {
			const next = createAdventureSession(seed, configuration, session.fog);
			setSession(next);
			return true;
		} catch {
			return false;
		}
	};
	const restore = (document: SaveDocument) => {
		const loaded = restoreSave(document);
		setSession({ ...loaded, actionError: "" });
		return loaded;
	};
	const setActionError = (actionError: string) =>
		setSession((current) => ({ ...current, actionError }));
	const setFogEnabled = (enabled: boolean) =>
		setSession((current) => ({ ...current, fog: { ...current.fog, enabled } }));
	const applyFogRadius = (radius: number) =>
		setSession((current) => ({
			...current,
			fog: { ...current.fog, radius },
			exploration: updateExploration(
				navigationRun(current.state),
				afflictedSightRadius(radius, current.state.afflictions),
				current.exploration,
			),
		}));
	const requestAction = (action: PlayerAction) => {
		setSession((current) => {
			const result = resolvePlayerAction(current.state, action);
			if (result.error) return { ...current, actionError: result.error };
			if (
				result.state === current.state &&
				!current.actionError &&
				!result.message
			)
				return current;
			const nextExploration =
				result.turnAdvanced ||
				(current.state.town !== null && result.state.town === null)
					? updateExploration(
							navigationRun(result.state),
							afflictedSightRadius(
								current.fog.radius,
								result.state.afflictions,
							),
							current.exploration,
						)
					: current.exploration;
			if (!result.turnAdvanced)
				return {
					...current,
					state: result.state,
					actionError: result.message ?? "",
					exploration: nextExploration,
				};
			const events =
				result.turnAdvanced &&
				result.state.player.health > 0 &&
				!result.state.quest.victory
					? visibleAwarenessEvents(
							current.state.monsters,
							result.state.monsters,
							result.state.run.activeFloor,
							result.state.turn,
							current.fog.enabled ? nextExploration.visible : undefined,
						)
					: [];
			const history = visibleThreatHistory(
				current.state.activityHistory,
				result.state.activityHistory,
				result.state.monsters,
				result.state.run.activeFloor,
				current.fog.enabled ? nextExploration.visible : undefined,
			);
			const projected = appendActivityEvents(history, events);
			return {
				...current,
				state:
					projected === result.state.activityHistory
						? result.state
						: { ...result.state, activityHistory: projected },
				actionError: "",
				exploration: nextExploration,
			};
		});
	};

	return {
		game: session,
		configuration: session.configuration,
		fogConfiguration: session.fog,
		currentItems,
		activeFloor,
		activeObjects,
		activeMonsters,
		activeItems,
		start,
		restore,
		requestAction,
		setActionError,
		setFogEnabled,
		applyFogRadius,
	};
};
