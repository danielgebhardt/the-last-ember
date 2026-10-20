// @vitest-environment node
// Rules every sparse affliction source shares; per-monster files test its own attack.
import { describe, expect, it } from "vitest";
import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { createSeededRandom } from "../domain/dungeon/Seed";
import { AFFLICTION_DEFINITIONS } from "../domain/game/AfflictionDefinitions";
import { createMonsterDrop } from "../domain/items/MonsterDrops";
import {
	eligibleMonsterKinds,
	MONSTER_DEFINITIONS,
	type MonsterKind,
	monsterAffliction,
	selectMonsterKind,
} from "../domain/monsters/Monster";
import {
	afflictionSourceKinds,
	markFirstRemedySources,
	spawnRunMonsters,
} from "../domain/monsters/MonsterPlacement";
import { monsterTraits } from "../domain/monsters/MonsterTraits";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { savedAdventure } from "./SaveTestHelpers";
import { COMPACT_TEST_CONFIGURATION } from "./TestRunConfiguration";

const SOURCES = (Object.keys(MONSTER_DEFINITIONS) as MonsterKind[]).filter(
	(kind) => MONSTER_DEFINITIONS[kind].afflictionSource,
);
// One 20-floor run per seed covers every source band.
const runs = Array.from({ length: 10 }, (_, seed) => {
	const run = connectDungeonFloors(
		generateDungeonRun(seed, 20, COMPACT_TEST_CONFIGURATION),
	);
	return { run, monsters: markFirstRemedySources(spawnRunMonsters(run)) };
});

it("covers every source monster", () => {
	expect(SOURCES).toEqual(["plague-rat", "hexweaver", "mana-leech"]);
});

describe.each(SOURCES)("%s", (kind) => {
	const definition = MONSTER_DEFINITIONS[kind];
	const affliction = monsterAffliction(kind);
	if (!affliction) throw new Error(`${kind} has no affliction`);
	const cure = AFFLICTION_DEFINITIONS[affliction].cure;

	it("never spawns through ordinary selection, only in its floor band", () => {
		expect(definition.spawnEnabled).toBe(false);
		for (let floor = 1; floor <= 20; floor++) {
			expect(eligibleMonsterKinds(floor)).not.toContain(kind);
			const random = createSeededRandom(floor);
			for (let draw = 0; draw < 50; draw++)
				expect(selectMonsterKind(floor, random)).not.toBe(kind);
			expect(afflictionSourceKinds(floor).includes(kind)).toBe(
				floor >= definition.minFloor && floor <= definition.maxFloor,
			);
		}
	});

	it("replaces at most one spawn per floor, keeping ids, and marks only the shallowest", () => {
		let found = 0;
		for (const { run, monsters } of runs) {
			const sources = monsters.filter((m) => m.kind === kind);
			found += sources.length;
			for (const floor of run.floors) {
				const onFloor = monsters.filter(
					(m) => m.floorNumber === floor.floorNumber,
				);
				expect(onFloor.map((m) => m.id)).toEqual(
					onFloor.map((_, index) => `${floor.floorNumber}:${index + 1}`),
				);
				expect(onFloor.filter((m) => m.kind === kind).length).toBeLessThan(2);
			}
			for (const source of sources) {
				expect(source.floorNumber).toBeGreaterThanOrEqual(definition.minFloor);
				expect(source.health).toBe(definition.maxHealth);
			}
			const marked = sources.filter((m) => m.remedyDrop);
			expect(marked).toHaveLength(sources.length ? 1 : 0);
			if (marked[0])
				expect(marked[0].floorNumber).toBe(
					Math.min(...sources.map((m) => m.floorNumber)),
				);
		}
		// Sparse: some runs carry it, far fewer than one per eligible floor.
		expect(found).toBeGreaterThan(0);
		expect(found).toBeLessThan(
			runs.length * (definition.maxFloor - definition.minFloor + 1) * 0.5,
		);
	});

	it("the marked source drops its cure; its bestiary text names it", () => {
		const source = {
			id: "1:1",
			kind,
			floorNumber: 1,
			coordinate: { row: 1, col: 2 },
			health: definition.maxHealth,
			intent: { type: "idle" as const },
		};
		expect(createMonsterDrop(1, { ...source, remedyDrop: true })).toEqual({
			item: { id: "monster:1:1:loot", kind: cure },
			floorNumber: 1,
			coordinate: { row: 1, col: 2 },
		});
		expect(monsterTraits(kind).join(" ")).toContain(
			`The first ${definition.name} of an adventure always drops`,
		);
	});

	it("saves its remedy marker, and rejects the marker on ordinary kinds", () => {
		const original = restoreSave(savedAdventure());
		const [first] = original.state.monsters;
		const save = (patch: object) =>
			parseSave(
				serializeSave(
					createSaveDocument(
						{
							...original.state,
							monsters: original.state.monsters.map((m) =>
								m.id === first.id
									? {
											id: m.id,
											floorNumber: m.floorNumber,
											coordinate: m.coordinate,
											lastDamagedTurn: null,
											intent: { type: "idle" as const },
											kind,
											health: definition.maxHealth,
											remedyDrop: true,
											...patch,
										}
									: { ...m, remedyDrop: undefined },
							),
						},
						original.exploration,
						original.configuration,
						original.fog,
					),
				),
			);
		const parsed = save({});
		if (!parsed.ok) throw new Error(parsed.error);
		expect(
			restoreSave(parsed.value).state.monsters.find((m) => m.id === first.id),
		).toMatchObject({ kind, remedyDrop: true });
		expect(save({ kind: "goblin", health: 4 }).ok).toBe(false);
	});
});
