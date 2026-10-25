import { useEffect, useRef } from "react";
import type { ExplorationState } from "../../domain/dungeon/Exploration";
import type {
	FogConfiguration,
	RunConfiguration,
} from "../../domain/dungeon/RunConfiguration";
import type { GameState } from "../../domain/game/GameState";
import { autosaveAction } from "../../domain/saves/Autosave";
import { createSaveDocument } from "../../domain/saves/SaveFormat";
import { useSaves } from "../../saves/SavesProvider";

// Writes the autosave slot after qualifying state changes. Failures are quiet: the
// slot keeps its previous contents and play continues.
export const useAutosave = (
	state: GameState,
	exploration: ExplorationState,
	configuration: RunConfiguration,
	fog: FogConfiguration,
) => {
	const saves = useSaves();
	const previous = useRef<GameState | null>(null);
	const latest = useRef({ exploration, configuration, fog, saves });
	latest.current = { exploration, configuration, fog, saves };

	useEffect(() => {
		const before = previous.current;
		previous.current = state;
		if (before === state) return;
		// On mount, compare against an empty run so a fresh adventure saves its start.
		const action = autosaveAction(
			before ?? { ...state, run: { ...state.run, floors: [] } },
			state,
		);
		const { exploration, configuration, fog, saves } = latest.current;
		if (action === "clear") saves.clear("autosave");
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
