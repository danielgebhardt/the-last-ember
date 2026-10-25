import { useEffect, useRef } from "react";
import type { ExplorationState } from "../../domain/dungeon/Exploration";
import type {
	FogConfiguration,
	RunConfiguration,
} from "../../domain/dungeon/RunConfiguration";
import type { GameState } from "../../domain/game/GameState";
import { isTestSeed } from "../../domain/game/TestSeed";
import { autosaveAction } from "../../domain/saves/Autosave";
import { createSaveDocument } from "../../domain/saves/SaveFormat";
import { useSaves } from "../../saves/SavesProvider";
import { useStatistics } from "../../statistics/StatisticsProvider";

// Writes the autosave slot after qualifying state changes. Failures are quiet: the
// slot keeps its previous contents and play continues.
export const useAutosave = (
	state: GameState,
	exploration: ExplorationState,
	configuration: RunConfiguration,
	fog: FogConfiguration,
) => {
	const saves = useSaves();
	const statistics = useStatistics();
	const previous = useRef<GameState | null>(null);
	const latest = useRef({ exploration, configuration, fog, saves, statistics });
	latest.current = { exploration, configuration, fog, saves, statistics };

	useEffect(() => {
		const before = previous.current;
		previous.current = state;
		if (before === state) return;
		// On mount, compare against an empty run so a fresh adventure saves its start.
		const action = autosaveAction(
			before ?? { ...state, run: { ...state.run, floors: [] } },
			state,
		);
		const { exploration, configuration, fog, saves, statistics } =
			latest.current;
		if (before?.runId !== state.runId) statistics.retry();
		if (action === "clear") saves.clear("autosave");
		if (
			(state.player.health <= 0 || state.quest.victory !== null) &&
			!isTestSeed(state.run.seed) &&
			(!before || (before.player.health > 0 && before.quest.victory === null))
		) {
			try {
				statistics.finish(
					createSaveDocument(state, exploration, configuration, fog),
				);
			} catch {
				/* Reviewing the run never waits for statistics. */
			}
		}
		if (action !== "save") return;
		try {
			saves.write(
				"autosave",
				createSaveDocument(state, exploration, configuration, fog),
			);
		} catch {
			// The snapshot could not be prepared; keep the previous autosave.
		}
	}, [state]);
};
