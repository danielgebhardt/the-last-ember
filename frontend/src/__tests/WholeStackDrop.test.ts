// @vitest-environment node
import { expect, it } from "vitest";
import { formatActivityEvent } from "../components/game/ActivityMessages";
import type { GameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { createBag } from "../domain/items/Bag";
import { parseSave, serializeSave } from "../domain/saves/SaveFormat";
import { bruteEncounter } from "./BruteTestHelpers";
import { tacticalSnapshot } from "./TacticalReplayTestHelpers";

const carrying = (): GameState => ({
	...bruteEncounter(),
	monsters: [],
	bag: createBag([
		{ id: "heal-1", kind: "healing-potion" },
		{ id: "sword", kind: "iron-sword" },
		{ id: "heal-2", kind: "healing-potion" },
	]),
});

it("a whole-stack drop puts every copy on your tile for one turn", () => {
	const state = carrying();
	const result = resolvePlayerAction(state, {
		type: "drop",
		itemId: "heal-1",
		wholeStack: true,
	});
	expect(result.turnAdvanced).toBe(true);
	expect(result.state.bag.items.map((i) => i.id)).toEqual(["sword"]);
	const here = result.state.floorItems.filter(
		(entry) =>
			entry.floorNumber === 4 &&
			entry.coordinate.row === 4 &&
			entry.coordinate.col === 4,
	);
	expect(here.map((entry) => entry.item.id).sort()).toEqual([
		"heal-1",
		"heal-2",
	]);
	const entry = result.state.activityHistory.entries.find(
		({ event }) => event.type === "item-dropped",
	);
	expect(entry && formatActivityEvent(entry.event)).toBe(
		"Turn 1 — You drop Healing potion ×2.",
	);
	expect(parseSave(serializeSave(tacticalSnapshot(result.state))).ok).toBe(
		true,
	);
});

it("an ordinary drop still moves one copy", () => {
	const result = resolvePlayerAction(carrying(), {
		type: "drop",
		itemId: "heal-1",
	});
	expect(result.state.bag.items.map((i) => i.id)).toEqual(["heal-2", "sword"]);
});
