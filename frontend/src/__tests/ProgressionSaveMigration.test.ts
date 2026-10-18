// @vitest-environment node

import { expect, it } from "vitest";
import { levelForExperience } from "../domain/game/Progression";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { historicalSaveText, savedAdventure } from "./SaveTestHelpers";

it.each([false, true])(
	"migrates a capped legacy character preserving XP and wounds (dead=%s)",
	(dead) => {
		const legacy = {
			...savedAdventure(),
			version: 2,
			state: {
				...savedAdventure().state,
				progression: { experience: 1000 },
				player: { health: dead ? 0 : 7, maxHealth: 18 },
				mana: 4,
			},
		};
		const parsed = parseSave(historicalSaveText(legacy));
		expect(parsed.ok).toBe(true);
		if (!parsed.ok) throw new Error(parsed.error);
		expect(parsed.value.version).toBe(27);
		const restored = restoreSave(parsed.value);
		expect(restored.state.progression.experience).toBe(1000);
		expect(levelForExperience(restored.state.progression.experience)).toBe(11);
		expect(restored.state.player).toEqual({
			health: dead ? 0 : 19,
			maxHealth: 30,
		});
		expect(restored.state.mana).toBe(10);
		const roundTrip = parseSave(
			serializeSave(
				createSaveDocument(
					restored.state,
					restored.exploration,
					restored.configuration,
					restored.fog,
				),
			),
		);
		expect(roundTrip.ok).toBe(true);
		if (!roundTrip.ok) throw new Error(roundTrip.error);
		expect(restoreSave(roundTrip.value).state).toEqual(restored.state);
	},
);
it("rejects legacy capacity corruption rather than repairing unvalidated data", () => {
	const legacy = savedAdventure();
	const result = parseSave(
		historicalSaveText({
			...legacy,
			version: 2,
			state: {
				...legacy.state,
				progression: { experience: 1000 },
				player: { health: 7, maxHealth: 99 },
			},
		}),
	);
	expect(result.ok).toBe(false);
});
