// @vitest-environment node
import { expect, it } from "vitest";
import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { createGameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import {
	eligibleMonsterKinds,
	MONSTER_DEFINITIONS,
} from "../domain/monsters/Monster";
import { protectedSpawnLocations } from "../domain/monsters/MonsterLocations";
import {
	afflictionSourceKinds,
	spawnRunMonsters,
} from "../domain/monsters/MonsterPlacement";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import { COMPACT_TEST_CONFIGURATION } from "./TestRunConfiguration";

const ranges = [
	{ kind: "skeleton", min: 2, max: 8 },
	{ kind: "zombie", min: 3, max: 10 },
	{ kind: "wolf", min: 2, max: 9 },
	{ kind: "kobold-slinger", min: 3, max: 10 },
	{ kind: "spider", min: 3, max: 12 },
] as const;
it.each(ranges)(
	"$kind appears only in its early floor band",
	({ kind, min, max }) => {
		expect(eligibleMonsterKinds(min - 1)).not.toContain(kind);
		expect(eligibleMonsterKinds(min)).toContain(kind);
		expect(eligibleMonsterKinds(max)).toContain(kind);
		expect(eligibleMonsterKinds(max + 1)).not.toContain(kind);
		expect(MONSTER_DEFINITIONS[kind].experienceReward).toBeGreaterThan(0);
	},
);
it("zombies shamble every other committed turn while a slinger can shoot without advancing", () => {
	const initial = {
		...createGameState(createCorridorEncounter()),
		monsters: [
			{
				id: "1:1",
				kind: "zombie" as const,
				floorNumber: 1,
				coordinate: { row: 1, col: 5 },
				health: 12,
				intent: { type: "idle" as const },
			},
		],
	};
	const first = resolvePlayerAction(initial, { type: "wait" }).state;
	expect(first.monsters[0].coordinate).toEqual({ row: 1, col: 5 });
	const second = resolvePlayerAction(first, { type: "wait" }).state;
	expect(second.monsters[0].coordinate).toEqual({ row: 1, col: 4 });
	const ranged = {
		...initial,
		monsters: [
			{ ...initial.monsters[0], kind: "kobold-slinger" as const, health: 7 },
		],
	};
	const shot = resolvePlayerAction(ranged, { type: "wait" }, () => ({
		d20: () => 20,
		damage: (min) => min,
	})).state;
	expect(shot.monsters[0].coordinate).toEqual({ row: 1, col: 5 });
	expect(shot.player.health).toBeLessThan(10);
	expect(
		shot.activityHistory.entries.some(
			(e) => e.event.type === "monster-shot-hit",
		),
	).toBe(true);
});

it("replays seeded mixtures without occupying protected starts or stairs", () => {
	const seen = new Set<string>();
	for (let seed = 0; seed < 20; seed++) {
		const run = connectDungeonFloors(
			generateDungeonRun(seed, 5, COMPACT_TEST_CONFIGURATION),
		);
		const monsters = spawnRunMonsters(run);
		expect(spawnRunMonsters(run)).toEqual(monsters);
		for (const monster of monsters) {
			seen.add(monster.kind);
			expect(
				protectedSpawnLocations(run, monster.floorNumber),
			).not.toContainEqual(monster.coordinate);
			// Affliction carriers enter only through their separate sparse budget.
			expect([
				...eligibleMonsterKinds(monster.floorNumber),
				...afflictionSourceKinds(monster.floorNumber),
			]).toContain(monster.kind);
		}
	}
	for (const { kind } of ranges) expect(seen).toContain(kind);
});
