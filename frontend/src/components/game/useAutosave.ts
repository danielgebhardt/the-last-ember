import { useEffect, useRef } from "react";
import type { ExplorationState } from "../../domain/dungeon/Exploration";
import type {
	FogConfiguration,
	RunConfiguration,
} from "../../domain/dungeon/RunConfiguration";
import type { GameState } from "../../domain/game/GameState";
import { autosaveAction } from "../../domain/saves/Autosave";
import { createSaveDocument } from "../../domain/saves/SaveFormat";
import {
	clearAutosave,
	writeAutosave,
} from "../../persistence/LocalAdventureSave";

// Writes the autosave slot after qualifying state changes. Failures are quiet: the
// slot keeps its previous contents and play continues.
export const useAutosave = (
	state: GameState,
	exploration: ExplorationState,
	configuration: RunConfiguration,
	fog: FogConfiguration,
) => {
	const previous = useRef<GameState | null>(null);
	const latest = useRef({ exploration, configuration, fog });
	latest.current = { exploration, configuration, fog };

	useEffect(() => {
		const before = previous.current;
		previous.current = state;
		if (before === state) return;
		// On mount, compare against an empty run so a fresh adventure saves its start.
		const action = autosaveAction(
			before ?? { ...state, run: { ...state.run, floors: [] } },
			state,
		);
		if (action === "clear") clearAutosave();
		if (action !== "save") return;
		try {
			const { exploration, configuration, fog } = latest.current;
			writeAutosave(createSaveDocument(state, exploration, configuration, fog));
		} catch {
			// The snapshot could not be prepared; keep the previous autosave.
		}
	}, [state]);
};
