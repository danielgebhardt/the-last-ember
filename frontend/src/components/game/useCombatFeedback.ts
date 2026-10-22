import { useEffect, useRef, useState } from "react";
import type { VisibilityGrid } from "../../domain/dungeon/Visibility";
import { combatFeedback } from "../../domain/game/CombatFeedback";
import type { GameState } from "../../domain/game/GameState";
import type { FeedbackMark } from "../dungeon/CombatFeedbackLayer";

export const FEEDBACK_LIFETIME_MS = 900;
// Rapid actions and corridor runs never pile up more than this on one tile.
export const FEEDBACK_PER_TILE = 3;

const tileKey = ({
	coordinate,
}: {
	coordinate: { row: number; col: number };
}) => `${coordinate.row}:${coordinate.col}`;

// Short-lived marks for each committed state change; never part of the game state.
export const useCombatFeedback = (
	state: GameState,
	visible: VisibilityGrid | undefined,
): readonly FeedbackMark[] => {
	const [marks, setMarks] = useState<readonly FeedbackMark[]>([]);
	const previous = useRef(state);
	const nextKey = useRef(0);
	const visibleRef = useRef(visible);
	visibleRef.current = visible;
	// Each batch expires on its own; a later action never cancels an earlier timer.
	const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
	useEffect(() => {
		const pending = timers.current;
		return () => {
			for (const timer of pending) clearTimeout(timer);
		};
	}, []);

	useEffect(() => {
		const before = previous.current;
		previous.current = state;
		if (before === state) return;
		if (before.run.floors !== state.run.floors) {
			setMarks([]);
			return;
		}
		if (state.town || before.run.activeFloor !== state.run.activeFloor) {
			setMarks([]);
			return;
		}
		const seen = visibleRef.current;
		const found = combatFeedback(before, state).filter(
			({ coordinate }) => !seen || seen[coordinate.row]?.[coordinate.col],
		);
		if (!found.length) return;
		const keys = found.map(() => nextKey.current++);
		setMarks((current) => {
			const next = [...current];
			found.forEach((feedback, index) => {
				const onTile = next.filter(
					(mark) => tileKey(mark) === tileKey(feedback),
				);
				if (onTile.length >= FEEDBACK_PER_TILE)
					next.splice(next.indexOf(onTile[0]), 1);
				const stack =
					(Math.max(
						-1,
						...next
							.filter((mark) => tileKey(mark) === tileKey(feedback))
							.map((mark) => mark.stack),
					) +
						1) %
					FEEDBACK_PER_TILE;
				next.push({ ...feedback, key: keys[index], stack });
			});
			return next;
		});
		const timer = setTimeout(() => {
			timers.current.delete(timer);
			setMarks((current) => current.filter((mark) => !keys.includes(mark.key)));
		}, FEEDBACK_LIFETIME_MS);
		timers.current.add(timer);
	}, [state]);

	return marks;
};
