// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { DEFAULT_RUN_CONFIGURATION } from "../domain/dungeon/RunConfiguration";
import { createGameState } from "../domain/game/GameState";
import { generateEscapeEncounters } from "../domain/monsters/EscapeEncounters";
import { MONSTER_DEFINITIONS, type Monster } from "../domain/monsters/Monster";
import {
	maximumMonsterHealth,
	monsterDamageRange,
} from "../domain/monsters/MonsterStats";

const identities = (monsters: readonly Monster[]) =>
	monsters.map(({ health: _health, ...identity }) => identity);

describe("Matched difficulty generation", () => {
	it.each([
		["compact", 20, 5],
		["recommended", 40, 20],
	] as const)(
		"preserves %s content and scales fresh and return actors",
		(_label, size, floors) => {
			const configuration = {
				...DEFAULT_RUN_CONFIGURATION,
				rows: size,
				cols: size,
			};
			const run = connectDungeonFloors(
				generateDungeonRun(123, floors, configuration),
			);
			const normal = structuredClone(createGameState(run));
			expect(normal.monsters.length).toBeGreaterThan(0);
			const normalReturn = generateEscapeEncounters(normal, 1);
			expect(normalReturn.length).toBeGreaterThan(0);
			for (const difficulty of [0.75, 1, 1.25] as const) {
				const state = createGameState(run, difficulty);
				const { monsters, difficulty: _difficulty, ...unchanged } = state;
				const {
					monsters: normalMonsters,
					difficulty: _normalDifficulty,
					...baseline
				} = normal;
				expect(unchanged).toEqual(baseline); // Includes terrain, objects, loot, rewards and player resources.
				expect(identities(monsters)).toEqual(identities(normalMonsters));
				for (const actor of monsters) {
					const original = normalMonsters.find(
						(normalActor) => normalActor.id === actor.id,
					);
					if (!original)
						throw new Error(
							"Expected the same seeded actor at every difficulty",
						);
					expect(actor.health).toBe(
						Math.max(1, Math.round(original.health * difficulty)),
					);
				}
				const returning = generateEscapeEncounters(state, 1);
				expect(identities(returning)).toEqual(identities(normalReturn));
				for (const actor of returning)
					expect(actor.health).toBe(
						Math.max(
							1,
							Math.round(
								MONSTER_DEFINITIONS[actor.kind].maxHealth * difficulty,
							),
						),
					);
			}
		},
	);
	it("reports correctly rounded health and physical damage for every catalog kind", () => {
		for (const kind of Object.keys(
			MONSTER_DEFINITIONS,
		) as (keyof typeof MONSTER_DEFINITIONS)[]) {
			const definition = MONSTER_DEFINITIONS[kind];
			for (const difficulty of [0.75, 1, 1.25] as const) {
				expect(maximumMonsterHealth(kind, difficulty)).toBe(
					Math.max(1, Math.round(definition.maxHealth * difficulty)),
				);
				expect(monsterDamageRange(kind, difficulty)).toEqual({
					minDamage: Math.max(
						1,
						Math.round(Math.max(1, definition.attackDamage - 1) * difficulty),
					),
					maxDamage: Math.max(
						1,
						Math.round((definition.attackDamage + 1) * difficulty),
					),
				});
			}
		}
	});
});
