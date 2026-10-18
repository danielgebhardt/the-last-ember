// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { savedAdventure } from "./SaveTestHelpers";

describe("Saved monster awareness", () => {
	it("retains the last seen tile and remaining pursuit phases", () => {
		const document = savedAdventure();
		const monster = document.state.monsters[0];
		document.state = {
			...document.state,
			monsters: [
				{
					...monster,
					awareness: {
						type: "pursuing",
						target: { ...monster.coordinate },
						remaining: 7,
						blocked: 0,
					},
				},
				...document.state.monsters.slice(1),
			],
		};
		const parsed = parseSave(serializeSave(document));
		expect(parsed.ok).toBe(true);
		if (!parsed.ok) throw new Error(parsed.error);
		expect(restoreSave(parsed.value).state.monsters[0].awareness).toEqual({
			type: "pursuing",
			target: monster.coordinate,
			remaining: 7,
			blocked: 0,
		});
	});
	it.each(["wall", "negative duration", "invalid state"])(
		"rejects %s memory without loading it",
		(kind) => {
			const document = savedAdventure();
			const monster = document.state.monsters[0];
			const awareness = {
				type: kind === "invalid state" ? "hunting" : "pursuing",
				target: kind === "wall" ? { row: 0, col: 0 } : monster.coordinate,
				remaining: kind === "negative duration" ? -1 : 7,
				blocked: 0,
			};
			expect(
				parseSave(
					JSON.stringify({
						...document,
						state: {
							...document.state,
							monsters: [
								{ ...monster, awareness },
								...document.state.monsters.slice(1),
							],
						},
					}),
				).ok,
			).toBe(false);
		},
	);
});
