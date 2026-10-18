// @vitest-environment node
import { describe, expect, it } from "vitest";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import {
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { savedAdventure } from "./SaveTestHelpers";

const preparedSave = () => {
	const document = savedAdventure();
	const monster = document.state.monsters.find(
		(actor) => actor.floorNumber === 2,
	);
	if (!monster) throw new Error("Expected inactive actor");
	const floor = document.state.run.floors[1];
	const offsets = [
		{ row: 0, col: 2 },
		{ row: 2, col: 0 },
		{ row: 0, col: -2 },
		{ row: -2, col: 0 },
	];
	const target = offsets
		.map((offset) => ({
			row: monster.coordinate.row + offset.row,
			col: monster.coordinate.col + offset.col,
		}))
		.find((point) => floor.terrain[point.row]?.[point.col] === ".");
	if (!target) throw new Error("Expected straight target");
	return {
		...document,
		state: {
			...document.state,
			monsters: [
				{
					...monster,
					kind: "horned-charger" as const,
					health: 14,
					intent: { type: "preparing-charge" as const, target },
				},
			],
		},
	};
};
describe("Saved charger preparation", () => {
	it("retains the fixed line and pauses it on an inactive floor", () => {
		const document = preparedSave(),
			parsed = parseSave(serializeSave(document));
		if (!parsed.ok) throw new Error(parsed.error);
		const loaded = restoreSave(parsed.value).state;
		expect(loaded.monsters[0].intent).toEqual(
			document.state.monsters[0].intent,
		);
		expect(resolvePlayerAction(loaded, { type: "wait" }).state.monsters).toBe(
			loaded.monsters,
		);
	});
	it("reproduces an active charge and recovery after loading", () => {
		const document = preparedSave();
		const target = document.state.monsters[0].intent.target;
		const active = {
			...document,
			state: {
				...document.state,
				objects: [],
				run: {
					...document.state.run,
					activeFloor: 2,
					playerCoordinate: target,
				},
			},
		};
		const parsed = parseSave(serializeSave(active));
		if (!parsed.ok) throw new Error(parsed.error);
		const original = restoreSave(active).state,
			loaded = restoreSave(parsed.value).state;
		const charged = resolvePlayerAction(original, { type: "wait" }).state;
		expect(resolvePlayerAction(loaded, { type: "wait" }).state).toEqual(
			charged,
		);
		const recovery = resolvePlayerAction(charged, { type: "wait" }).state;
		expect(recovery.monsters[0].intent).toEqual({ type: "idle" });
	});
	it("rejects charge intent on an ordinary actor", () => {
		const document = preparedSave();
		expect(
			parseSave(
				JSON.stringify({
					...document,
					state: {
						...document.state,
						monsters: [
							{ ...document.state.monsters[0], kind: "goblin", health: 4 },
						],
					},
				}),
			).ok,
		).toBe(false);
	});
});
