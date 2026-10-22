import { useEffect, useRef, useState } from "react";
import type { GameState } from "../../domain/game/GameState";
import { detectHints, type Hint } from "../../domain/hints/Hints";
import {
	type HintPreferences,
	readHintPreferences,
	writeHintPreferences,
} from "../../persistence/HintPreferences";

// One hint at a time from a queue of first-time mechanics. Hints are derived after
// each committed state change and never feed back into gameplay.
export const useHints = (state: GameState, onClosed: () => void) => {
	const [preferences, setPreferences] = useState(readHintPreferences);
	const [queue, setQueue] = useState<readonly Hint[]>([]);
	const previous = useRef(state);
	const update = (next: HintPreferences) => {
		setPreferences(next);
		writeHintPreferences(next);
	};

	useEffect(() => {
		const before = previous.current;
		previous.current = state;
		if (before === state) return;
		// A new or loaded adventure starts fresh rather than diffing two runs.
		if (before.run.floors !== state.run.floors) {
			setQueue([]);
			return;
		}
		if (!preferences.enabled) return;
		const found = detectHints(before, state).filter(
			(hint) => !preferences.seen.includes(hint.id),
		);
		if (found.length)
			setQueue((current) => [
				...current,
				...found.filter((hint) => !current.some((q) => q.id === hint.id)),
			]);
	}, [state, preferences]);

	const current = queue[0] ?? null;
	const markSeen = () => {
		if (!current) return;
		setQueue((rest) => rest.filter((hint) => hint.id !== current.id));
		update({
			...preferences,
			seen: [...new Set([...preferences.seen, current.id])],
		});
	};
	const dismiss = () => {
		markSeen();
		onClosed();
	};

	// Escape on the map dismisses the hint, unless something else used the key.
	const dismissRef = useRef(dismiss);
	dismissRef.current = dismiss;
	useEffect(() => {
		if (!current) return;
		const handleKeyDown = (event: KeyboardEvent) => {
			if (
				event.key !== "Escape" ||
				event.repeat ||
				document.querySelector('[role="dialog"]')
			)
				return;
			setTimeout(() => {
				if (!event.defaultPrevented) dismissRef.current();
			});
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [current]);

	return {
		current,
		enabled: preferences.enabled,
		seenCount: preferences.seen.length,
		dismiss,
		// "More in Help" counts as having seen the hint.
		markSeen,
		setEnabled: (enabled: boolean) => {
			if (!enabled) setQueue([]);
			update({ ...preferences, enabled });
		},
		reset: () => update({ ...preferences, seen: [] }),
	};
};
export type Hints = ReturnType<typeof useHints>;
