// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createGameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { savedAdventure } from "./SaveTestHelpers";

// Use a real floor-2 actor and one neighbouring walkable tile. The player
// is on floor 1, so the saved target deliberately differs from their position.
const preparedAdventure = () => {
	const document = savedAdventure();
	const monster = document.state.monsters.find(
		(actor) => actor.floorNumber === 2,
	);
	if (!monster) throw new Error("Fixture requires a floor-2 monster");
	const floor = document.state.run.floors[1];
	const { row, col } = monster.coordinate;
	const target = [
		{ row: row - 1, col },
		{ row: row + 1, col },
		{ row, col: col - 1 },
		{ row, col: col + 1 },
	].find((point) => floor.terrain[point.row]?.[point.col] === ".");
	if (!target) throw new Error("Fixture requires an adjacent walkable target");
	const preparing = {
		...monster,
		intent: { type: "preparing-attack" as const, target },
	};
	document.state.monsters = [preparing];
	return { document, preparing };
};

describe("Monster intent and versioned saves", () => {
	it("initializes all generated monsters idle, including a fresh replay", () => {
		const document = savedAdventure();
		const state = restoreSave(document).state;
		const replay = createGameState(state.run);
		expect(replay.monsters.length).toBeGreaterThan(0);
		for (const monster of [...state.monsters, ...replay.monsters])
			expect(monster.intent).toEqual({ type: "idle" });
	});

	it("round-trips a fixed prepared target on an inactive floor in the current format", () => {
		const { document, preparing } = preparedAdventure();
		const parsed = parseSave(serializeSave(document));
		if (!parsed.ok) throw new Error(parsed.error);
		const restored = restoreSave(parsed.value);
		expect(parsed.value.version).toBe(27);
		expect(restored.state.monsters).toEqual([preparing]);
		const written = createSaveDocument(
			restored.state,
			restored.exploration,
			restored.configuration,
			restored.fog,
			new Date(document.savedAt),
		);
		expect(written).toEqual(document);
		const waited = resolvePlayerAction(restored.state, { type: "wait" });
		expect(waited.turnAdvanced).toBe(true);
		expect(waited.state.monsters).toBe(restored.state.monsters);
	});

	it("retains intent during rejected actions and free hotbar changes", () => {
		const { document } = preparedAdventure();
		const state = restoreSave(document).state;
		const rejected = resolvePlayerAction(state, {
			type: "pickup",
			itemId: "missing",
		});
		expect(rejected.turnAdvanced).toBe(false);
		expect(rejected.state).toBe(state);
		const assigned = resolvePlayerAction(state, {
			type: "clear-hotbar",
			slot: 1,
		});
		expect(assigned.turnAdvanced).toBe(false);
		expect(assigned.state.monsters).toBe(state.monsters);
		expect(assigned.state.turn).toBe(state.turn);
	});

	it.each([
		{ name: "missing intent", intent: undefined },
		{ name: "null intent", intent: null },
		{ name: "unknown variant", intent: { type: "charging" } },
		{
			name: "idle with a target",
			intent: { type: "idle", target: { row: 1, col: 1 } },
		},
		{
			name: "preparation without a target",
			intent: { type: "preparing-attack" },
		},
		{
			name: "negative target",
			intent: { type: "preparing-attack", target: { row: -1, col: 1 } },
		},
		{
			name: "fractional target",
			intent: { type: "preparing-attack", target: { row: 1.5, col: 1 } },
		},
		{
			name: "string target",
			intent: { type: "preparing-attack", target: { row: "1", col: 1 } },
		},
	])("rejects $name in v2", ({ intent }) => {
		const { document } = preparedAdventure();
		Reflect.set(document.state.monsters[0], "intent", intent);
		expect(parseSave(serializeSave(document)).ok).toBe(false);
	});

	it.each([
		"wall",
		"outside the floor",
		"distant walkable tile",
		"actor's own tile",
	])("rejects a prepared target on %s", (location) => {
		const { document, preparing } = preparedAdventure();
		const floor = document.state.run.floors[1];
		const tiles = floor.terrain.flatMap((tiles, row) =>
			[...tiles].map((tile, col) => ({ tile, row, col })),
		);
		const distance = (point: { row: number; col: number }) =>
			Math.abs(point.row - preparing.coordinate.row) +
			Math.abs(point.col - preparing.coordinate.col);
		const targets = {
			"outside the floor": { row: document.configuration.rows, col: 1 },
			"actor's own tile": preparing.coordinate,
			wall: tiles.find((point) => point.tile === "#"),
			"distant walkable tile": tiles.find(
				(point) => point.tile === "." && distance(point) > 1,
			),
		};
		const target = targets[location as keyof typeof targets];
		if (!target) throw new Error("Fixture requires the named target location");
		preparing.intent.target = { row: target.row, col: target.col };
		expect(parseSave(serializeSave(document)).ok).toBe(false);
	});
});
