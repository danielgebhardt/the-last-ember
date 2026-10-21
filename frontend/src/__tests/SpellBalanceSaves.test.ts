// @vitest-environment node

import { expect, it } from "vitest";
import { appendActivityEvents } from "../domain/game/ActivityHistory";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import {
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { savedAdventure } from "./SaveTestHelpers";

it("round-trips friendly fire and twenty-turn buffs, then continues deterministically", () => {
	const source = savedAdventure();
	source.state.activityHistory = appendActivityEvents(
		source.state.activityHistory,
		[
			{
				type: "player-spell-hit",
				spell: "fireball",
				damage: 8,
				turn: source.state.turn,
			},
		],
	);
	source.state.effects = [
		{ actorId: "player", floorNumber: null, kind: "protected", remaining: 19 },
	];
	const parsed = parseSave(serializeSave(source));
	if (!parsed.ok) throw new Error(parsed.error);
	expect(parsed.value).toEqual(source);
	expect(parsed.value.version).toBe(32);
	expect(
		resolvePlayerAction(restoreSave(parsed.value).state, { type: "wait" }),
	).toEqual(resolvePlayerAction(restoreSave(source).state, { type: "wait" }));
	for (const version of [20, 21])
		expect(parseSave(JSON.stringify({ ...source, version })).ok).toBe(false);
});
it.each([
	{ spell: "heal", damage: 8 },
	{ spell: "fireball", damage: -1 },
	{ spell: "fireball", damage: 1.5 },
	{ spell: "fireball", damage: "8" },
])("rejects malformed friendly-fire events %s", (fields) => {
	const source = savedAdventure();
	const history = source.state.activityHistory;
	expect(
		parseSave(
			JSON.stringify({
				...source,
				state: {
					...source.state,
					activityHistory: {
						entries: [
							{
								id: 0,
								event: {
									type: "player-spell-hit",
									...fields,
									turn: source.state.turn,
								},
							},
						],
						nextId: history.nextId + 1,
					},
				},
			}),
		).ok,
	).toBe(false);
});
