// @vitest-environment node

import { describe, expect, it } from "vitest";
import { updateExploration } from "../domain/dungeon/Exploration";
import { createGameState } from "../domain/game/GameState";
import { damageMonster } from "../domain/game/MonsterDamage";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { savedAdventure } from "./SaveTestHelpers";

describe("Difficulty save continuation", () => {
	it.each([0.75, 1, 1.25])(
		"round-trips played difficulty %s and continues the same seeded turn",
		(difficulty) => {
			const base = restoreSave(savedAdventure());
			const fresh = createGameState(base.state.run, difficulty);
			const defeated = fresh.monsters[1];
			if (!defeated) throw new Error("Fixture requires two monsters");
			let played: typeof fresh = {
				...fresh,
				turn: 29,
				mana: 2,
				bag: {
					items: [
						{
							id: "carried:enchanted",
							kind: "iron-sword" as const,
							enchantment: 2,
						},
					],
				},
			};
			played = damageMonster(played, defeated, 99, { type: "player-hit" });
			played = damageMonster(played, played.monsters[0], 1, {
				type: "player-hit",
			});
			const document = createSaveDocument(
				played,
				updateExploration(played.run, base.fog.radius),
				base.configuration,
				base.fog,
			);
			const parsed = parseSave(serializeSave(document));
			expect(parsed.ok).toBe(true);
			if (!parsed.ok) throw new Error(parsed.error);
			expect(parsed.value.version).toBe(29);
			const restored = restoreSave(parsed.value);
			expect(restored.state).toEqual(played);
			expect(
				restored.state.monsters.some((actor) => actor.id === defeated.id),
			).toBe(false);
			expect(restored.state.monstersDefeated).toBe(1);
			expect(restored.configuration).toMatchObject({ difficulty });
			expect(resolvePlayerAction(restored.state, { type: "wait" })).toEqual(
				resolvePlayerAction(played, { type: "wait" }),
			);
		},
	);
	it.each([undefined, null, 0, 2, "1", 1.1])(
		"rejects missing/unsupported current difficulty %s",
		(difficulty) => {
			const source = savedAdventure();
			const corrupted = {
				...source,
				version: 27,
				configuration: { ...source.configuration, difficulty },
			};
			expect(parseSave(JSON.stringify(corrupted)).ok).toBe(false);
		},
	);
	it("rejects easier actors above their scaled limit before restoring", () => {
		const base = restoreSave(savedAdventure());
		const fresh = createGameState(base.state.run, 0.75);
		const source = createSaveDocument(
			fresh,
			base.exploration,
			base.configuration,
			base.fog,
		);
		source.state.monsters[0].health = 4; // A fresh easier goblin has a maximum of 3.
		expect(parseSave(JSON.stringify(source)).ok).toBe(false);
	});
});
