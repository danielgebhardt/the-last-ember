// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	createProgression,
	gainExperience,
	levelForExperience,
	progressionProgress,
} from "../domain/game/Progression";
import {
	MONSTER_DEFINITIONS,
	validateMonsterDefinition,
} from "../domain/monsters/Monster";

describe("Experience and health growth", () => {
	it("starts at level one with ten XP until the next level", () => {
		expect(createProgression()).toEqual({
			experience: 0,
			perks: [],
			permanentAttributes: { strength: 0, dexterity: 0, intelligence: 0 },
		});
		expect(progressionProgress(createProgression())).toEqual({
			level: 1,
			earned: 0,
			needed: 10,
			remaining: 10,
		});
	});
	it.each([
		[9, 1],
		[10, 2],
		[29, 2],
		[30, 3],
		[59, 3],
		[60, 4],
		[99, 4],
		[100, 5],
		[1000, 11],
	])("assigns the correct level for %i total XP", (experience, level) => {
		expect(levelForExperience(experience)).toBe(level);
	});
	it("shows progress within the current level instead of total XP as the numerator", () => {
		expect(progressionProgress({ experience: 18 })).toEqual({
			level: 2,
			earned: 8,
			needed: 20,
			remaining: 12,
		});
		expect(progressionProgress({ experience: 100 })).toEqual({
			level: 5,
			earned: 0,
			needed: 100,
			remaining: 100,
		});
	});
	it("gains a level without a full heal or mutating the original character", () => {
		const player = { health: 6, maxHealth: 10 };
		const result = gainExperience({ experience: 9 }, player, 2);
		expect(result.progression).toEqual({ experience: 11 });
		expect(result.player).toEqual({ health: 8, maxHealth: 12 });
		expect(result.levels).toEqual([2]);
		expect(player).toEqual({ health: 6, maxHealth: 10 });
	});
	it("crosses the early levels and retains wounds without reaching the next milestone", () => {
		const result = gainExperience(
			createProgression(),
			{ health: 3, maxHealth: 10 },
			120,
		);
		expect(result.player).toEqual({ health: 11, maxHealth: 18 });
		expect(result.levels).toEqual([2, 3, 4, 5]);
		const capped = gainExperience(result.progression, result.player, 10);
		expect(capped.progression.experience).toBe(130);
		expect(capped.player).toBe(result.player);
		expect(capped.levels).toEqual([]);
	});
	it("does not heal for an ordinary reward below the next threshold", () => {
		const player = { health: 3, maxHealth: 10 };
		expect(gainExperience(createProgression(), player, 5).player).toBe(player);
	});
	it.each([-1, 1.5, Infinity, Number.MAX_SAFE_INTEGER + 1])(
		"rejects invalid total XP: %s",
		(experience) => {
			expect(() => levelForExperience(experience)).toThrow(RangeError);
		},
	);
	it("defines positive whole XP rewards for each monster kind", () => {
		for (const definition of Object.values(MONSTER_DEFINITIONS)) {
			expect(Number.isSafeInteger(definition.experienceReward)).toBe(true);
			expect(definition.experienceReward).toBeGreaterThan(0);
		}
		expect(
			Object.fromEntries(
				Object.entries(MONSTER_DEFINITIONS).map(([kind, value]) => [
					kind,
					value.experienceReward,
				]),
			),
		).toMatchObject({
			"giant-rat": 2,
			goblin: 5,
			orc: 10,
			"goblin-archer": 6,
			"dungeon-brute": 12,
		});
		expect(() =>
			validateMonsterDefinition({
				...MONSTER_DEFINITIONS.goblin,
				experienceReward: 0,
			}),
		).toThrow(RangeError);
	});
});
