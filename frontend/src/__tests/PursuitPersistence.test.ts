// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { updateExploration } from "../domain/dungeon/Exploration";
import { DEFAULT_FOG_CONFIGURATION } from "../domain/dungeon/RunConfiguration";
import { createGameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import type { MonsterAwareness } from "../domain/monsters/Monster";
import { detectsPlayer } from "../domain/monsters/MonsterPursuit";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { withFlameOnFloor } from "./SaveTestHelpers";
import { COMPACT_TEST_CONFIGURATION } from "./TestRunConfiguration";

const configuration = { ...COMPACT_TEST_CONFIGURATION, rows: 60, cols: 60 };
const freshAdventure = () =>
	withFlameOnFloor(
		createGameState(
			connectDungeonFloors(
				generateDungeonRun(123, configuration.floorCount, configuration),
			),
		),
	);
const resume = (state: ReturnType<typeof freshAdventure>) => {
	const document = createSaveDocument(
		state,
		updateExploration(state.run, 8),
		configuration,
		DEFAULT_FOG_CONFIGURATION,
	);
	const parsed = parseSave(serializeSave(document));
	if (!parsed.ok) throw new Error(parsed.error);
	return restoreSave(parsed.value).state;
};

describe("Pursuit across save and replay boundaries", () => {
	it.each(["pursuing", "searching"] as const)(
		"continues %s identically after loading",
		(type) => {
			const fresh = freshAdventure();
			// An undetected actor isolates remembered pursuit from renewed detection.
			const monster = fresh.monsters.find(
				(actor) => actor.floorNumber === 1 && !detectsPlayer(fresh.run, actor),
			);
			if (!monster) throw new Error("Expected an undetected floor-one actor");
			const awareness: MonsterAwareness =
				type === "searching"
					? { type, target: monster.coordinate, remaining: 2 }
					: { type, target: monster.coordinate, remaining: 7, blocked: 1 };
			let uninterrupted: ReturnType<typeof freshAdventure> = {
				...fresh,
				monsters: [{ ...monster, awareness }],
			};
			let loaded = resume(uninterrupted);
			for (let turn = 0; turn < 4; turn++) {
				uninterrupted = resolvePlayerAction(uninterrupted, {
					type: "wait",
				}).state;
				loaded = resolvePlayerAction(loaded, { type: "wait" }).state;
				expect(loaded).toEqual(uninterrupted);
			}
			expect(loaded.monsters[0].awareness).toEqual({ type: "idle" });
		},
	);
	it("retains a blocked chase budget after loading closed doors", () => {
		const fresh = freshAdventure();
		const monster = fresh.monsters.find(
			(actor) => actor.floorNumber === 1 && !detectsPlayer(fresh.run, actor),
		);
		if (!monster) throw new Error("Expected an undetected actor");
		const neighbors = [
			{ row: -1, col: 0 },
			{ row: 0, col: 1 },
			{ row: 1, col: 0 },
			{ row: 0, col: -1 },
		]
			.map((offset) => ({
				row: monster.coordinate.row + offset.row,
				col: monster.coordinate.col + offset.col,
			}))
			.filter(
				(point) => fresh.run.floors[0].terrain[point.row]?.[point.col] === ".",
			);
		if (!neighbors.length) throw new Error("Expected a walkable neighbor");
		const trapped = {
			...fresh,
			objects: neighbors.map((coordinate, index) => ({
				id: `floor:1:object:door:${index}`,
				kind: "door" as const,
				floorNumber: 1,
				coordinate,
				activated: false,
			})),
			monsters: [
				{
					...monster,
					awareness: {
						type: "pursuing" as const,
						target: neighbors[0],
						remaining: 7,
						blocked: 2,
					},
				},
			],
		};
		const continued = resolvePlayerAction(trapped, { type: "wait" }).state;
		const loaded = resolvePlayerAction(resume(trapped), { type: "wait" }).state;
		expect(loaded).toEqual(continued);
		expect(loaded.monsters[0].coordinate).toEqual(monster.coordinate);
		expect(loaded.monsters[0].awareness).toEqual({ type: "idle" });
	});
	it("freezes saved inactive-floor memory and resets awareness on replay", () => {
		const fresh = freshAdventure();
		const monster = fresh.monsters.find((actor) => actor.floorNumber === 2);
		if (!monster) throw new Error("Expected a floor-two actor");
		const awareness = {
			type: "searching" as const,
			target: monster.coordinate,
			remaining: 2,
		};
		const loaded = resume({ ...fresh, monsters: [{ ...monster, awareness }] });
		expect(
			resolvePlayerAction(loaded, { type: "wait" }).state.monsters[0].awareness,
		).toEqual(awareness);
		const replay = freshAdventure();
		expect(
			replay.monsters.every(
				(actor) => (actor.awareness?.type ?? "idle") === "idle",
			),
		).toBe(true);
		expect(replay.monsters).toEqual(fresh.monsters);
	});
});
