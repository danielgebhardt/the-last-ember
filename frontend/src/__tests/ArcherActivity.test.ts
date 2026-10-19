// @vitest-environment node
import { describe, expect, it } from "vitest";
import { formatActivityEvent } from "../components/game/ActivityMessages";
import {
	type ActivityEvent,
	appendActivityEvents,
} from "../domain/game/ActivityHistory";
import {
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { savedAdventure } from "./SaveTestHelpers";

const shotEvents = [
	{ type: "monster-shot-hit", turn: 3, monster: "goblin-archer", damage: 2 },
	{ type: "monster-shot-missed", turn: 3, monster: "goblin-archer" },
] satisfies ActivityEvent[];

describe("Archer shot history", () => {
	it.each([
		{
			event: shotEvents[0],
			message: "Turn 3 — The goblin archer shoots you for 2 damage.",
		},
		{
			event: shotEvents[1],
			message: "Turn 3 — The goblin archer's shot misses you.",
		},
	])("describes $event.type separately from melee", ({ event, message }) => {
		expect(formatActivityEvent(event)).toBe(message);
	});

	it("preserves archer actors and shot history through the existing v2 save boundary", () => {
		const document = savedAdventure();
		document.state.monsters = document.state.monsters.map((monster) =>
			monster.floorNumber === 2
				? // Reassigned kinds cannot keep a carrier's guaranteed-remedy marker.
					{
						...monster,
						kind: "goblin-archer",
						health: 5,
						remedyDrop: undefined,
					}
				: monster,
		);
		expect(
			document.state.monsters.some(
				(monster) => monster.kind === "goblin-archer",
			),
		).toBe(true);
		document.state.activityHistory = appendActivityEvents(
			document.state.activityHistory,
			shotEvents,
		);
		const parsed = parseSave(serializeSave(document));
		if (!parsed.ok) throw new Error(parsed.error);
		expect(parsed.value).toEqual(document);
		expect(restoreSave(parsed.value).state.monsters).toEqual(
			document.state.monsters,
		);
	});
});
