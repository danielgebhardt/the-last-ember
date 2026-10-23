// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { updateExploration } from "../domain/dungeon/Exploration";
import {
	DEFAULT_FOG_CONFIGURATION,
	DEFAULT_RUN_CONFIGURATION,
} from "../domain/dungeon/RunConfiguration";
import { createGameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { coordinateKey } from "../domain/monsters/MonsterLocations";
import { navigationRun } from "../domain/objects/NavigationTerrain";
import { sealedEliteTiles } from "../domain/objects/OptionalEliteRooms";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { withFlameOnFloor } from "./SaveTestHelpers";

const encounter = () => {
	const config = DEFAULT_RUN_CONFIGURATION;
	const state = withFlameOnFloor(
		createGameState(connectDungeonFloors(generateDungeonRun(123, 20, config))),
	);
	const gate = state.objects.find((o) => o.kind === "elite-door");
	if (!gate) throw new Error("Expected seeded gate");
	const floor = state.run.floors[gate.floorNumber - 1],
		sealed = sealedEliteTiles(floor, state.objects);
	const outside = [
		{ row: gate.coordinate.row - 1, col: gate.coordinate.col },
		{ row: gate.coordinate.row, col: gate.coordinate.col + 1 },
		{ row: gate.coordinate.row + 1, col: gate.coordinate.col },
		{ row: gate.coordinate.row, col: gate.coordinate.col - 1 },
	].find(
		(p) =>
			floor.terrain[p.row]?.[p.col] === "." && !sealed.has(coordinateKey(p)),
	);
	if (!outside) throw new Error("Expected outside approach");
	return {
		gate,
		state: {
			...state,
			run: {
				...state.run,
				activeFloor: gate.floorNumber,
				playerCoordinate: outside,
			},
			monsters: state.monsters.filter((m) => m.kind === "iron-champion"),
		},
	};
};
describe("Deliberate elite gate actions", () => {
	it("leaves cancel and unconfirmed opening free and keeps the champion sealed", () => {
		const { gate, state } = encounter();
		expect(
			resolvePlayerAction(state, {
				type: "interact",
				objectId: gate.id,
				choice: "leave",
			}).state,
		).toBe(state);
		expect(
			resolvePlayerAction(state, { type: "interact", objectId: gate.id }).state,
		).toBe(state);
		const waited = resolvePlayerAction(state, { type: "wait" }).state;
		expect(waited.objects).toBe(state.objects);
		expect(waited.monsters).toEqual(state.monsters);
	});
	it("opens for one committed turn and retains gate state and actor ownership on reload", () => {
		const { gate, state } = encounter();
		const opened = resolvePlayerAction(state, {
			type: "interact",
			objectId: gate.id,
			choice: "open-elite",
		});
		expect(opened.turnAdvanced).toBe(true);
		expect(opened.state.turn).toBe(1);
		expect(opened.state.objects.find((o) => o.id === gate.id)?.activated).toBe(
			true,
		);
		const actor = opened.state.monsters.find(
			(m) => m.floorNumber === gate.floorNumber,
		);
		expect(actor?.awareness?.type).toBe("pursuing");
		const document = createSaveDocument(
			opened.state,
			updateExploration(navigationRun(opened.state), 8),
			DEFAULT_RUN_CONFIGURATION,
			DEFAULT_FOG_CONFIGURATION,
		);
		const parsed = parseSave(serializeSave(document));
		if (!parsed.ok) throw new Error(parsed.error);
		const loaded = restoreSave(parsed.value).state;
		expect(loaded).toEqual(opened.state);
		expect(resolvePlayerAction(loaded, { type: "wait" })).toEqual(
			resolvePlayerAction(opened.state, { type: "wait" }),
		);
	});
});
