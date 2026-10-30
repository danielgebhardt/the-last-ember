// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { updateExploration } from "../domain/dungeon/Exploration";
import type { Difficulty } from "../domain/game/Difficulty";
import { createGameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { chargeLine } from "../domain/monsters/MonsterCharge";
import { maximumMonsterHealth } from "../domain/monsters/MonsterStats";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { withFlameOnFloor } from "./SaveTestHelpers";
import { COMPACT_TEST_CONFIGURATION } from "./TestRunConfiguration";

const preparedSave = (difficulty: Difficulty) => {
	const configuration = {
		...COMPACT_TEST_CONFIGURATION,
		rows: 20,
		cols: 20,
		floorCount: 20,
		difficulty,
	};
	const run = connectDungeonFloors(generateDungeonRun(123, 20, configuration));
	const fresh = withFlameOnFloor(createGameState(run, difficulty));
	const terrain = run.floors[19].terrain;
	const offsets = [
		{ row: 0, col: 2 },
		{ row: 2, col: 0 },
		{ row: 0, col: -2 },
		{ row: -2, col: 0 },
	];
	const actor = fresh.monsters.find(
		(m) =>
			m.floorNumber === 20 &&
			offsets.some(
				(offset) =>
					chargeLine(
						terrain,
						m,
						{
							row: m.coordinate.row + offset.row,
							col: m.coordinate.col + offset.col,
						},
						4,
					).length === 2,
			),
	);
	if (!actor) throw new Error("Expected a clear floor-20 charge line");
	const target = offsets
		.map((offset) => ({
			row: actor.coordinate.row + offset.row,
			col: actor.coordinate.col + offset.col,
		}))
		.find((point) => chargeLine(terrain, actor, point, 4).length === 2);
	if (!target) throw new Error("Expected a fixed charge target");
	const state = {
		...fresh,
		objects: [],
		monsters: [
			{
				...actor,
				id: "20:20001",
				kind: "iron-champion" as const,
				health: maximumMonsterHealth("iron-champion", difficulty, 20) - 7,
				intent: { type: "preparing-charge" as const, target },
			},
		],
	};
	return {
		state,
		document: createSaveDocument(
			state,
			updateExploration(run, 8),
			configuration,
			{ enabled: true, radius: 8 },
		),
	};
};
describe("Depth-scaled elite save continuation", () => {
	it.each([0.75, 1, 1.25] as const)(
		"retains wounded health and prepared identity at difficulty %s",
		(difficulty) => {
			const { document, state: original } = preparedSave(difficulty),
				parsed = parseSave(serializeSave(document));
			if (!parsed.ok) throw new Error(parsed.error);
			const restored = restoreSave(parsed.value).state;
			expect(restored.monsters).toEqual(document.state.monsters);
			expect(
				resolvePlayerAction(restored, { type: "wait" }).state.monsters,
			).toEqual(restored.monsters);
			const actor = restored.monsters[0];
			if (actor.intent.type !== "preparing-charge")
				throw new Error("Expected saved preparation");
			const activate = (state: typeof restored) => ({
				...state,
				run: {
					...state.run,
					activeFloor: 20,
					playerCoordinate:
						actor.intent.type === "preparing-charge"
							? actor.intent.target
							: state.run.playerCoordinate,
				},
			});
			expect(resolvePlayerAction(activate(restored), { type: "wait" })).toEqual(
				resolvePlayerAction(activate(original), { type: "wait" }),
			);
		},
	);
	it("does not refill a previously saved 23-health champion", () => {
		const { document } = preparedSave(1);
		document.state.monsters[0].health = 23;
		const parsed = parseSave(serializeSave(document));
		if (!parsed.ok) throw new Error(parsed.error);
		expect(restoreSave(parsed.value).state.monsters[0].health).toBe(23);
	});
	it("rejects health exceeding the champion's actual floor/difficulty capacity", () => {
		const { document } = preparedSave(1.25);
		document.state.monsters[0].health = 181;
		expect(parseSave(serializeSave(document))).toMatchObject({ ok: false });
	});
});
