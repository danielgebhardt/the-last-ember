// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createAdventureSession } from "../components/game/useAdventureSession";
import {
	DEFAULT_FOG_CONFIGURATION,
	DEFAULT_RUN_CONFIGURATION,
} from "../domain/dungeon/RunConfiguration";
import {
	AFFLICTION_DEFINITIONS,
	type AfflictionKind,
} from "../domain/game/AfflictionDefinitions";
import { levelForExperience } from "../domain/game/Progression";
import { SPELL_DEFINITIONS } from "../domain/game/Spells";
import {
	isTestSeed,
	randomAdventureSeed,
	TEST_SEED,
	TEST_SEED_FLOORS,
} from "../domain/game/TestSeed";
import { ITEM_DEFINITIONS, type ItemKind } from "../domain/items/Item";
import {
	MONSTER_DEFINITIONS,
	type MonsterKind,
	monsterAffliction,
} from "../domain/monsters/Monster";
import {
	type DungeonObjectKind,
	OBJECT_DEFINITIONS,
} from "../domain/objects/DungeonObject";
import { COMPACT_TEST_CONFIGURATION } from "./TestRunConfiguration";

const session = () =>
	createAdventureSession(
		TEST_SEED,
		DEFAULT_RUN_CONFIGURATION,
		DEFAULT_FOG_CONFIGURATION,
	);
const count = (kind: ItemKind) =>
	session().state.bag.items.filter((item) => item.kind === kind).length;
const kindsOf = (type: string) =>
	(Object.keys(ITEM_DEFINITIONS) as ItemKind[]).filter(
		(kind) => ITEM_DEFINITIONS[kind].type === type,
	);

describe("reserved test seed", () => {
	it("is never rolled as a random seed", () => {
		expect(isTestSeed(7357)).toBe(true);
		const rolls = [TEST_SEED / 2 ** 32, 0.5];
		expect(randomAdventureSeed(() => rolls.shift() ?? 0.5)).not.toBe(TEST_SEED);
	});

	it("starts a level 10 character with every spell, 10,000 gold and the full kit", () => {
		const { state } = session();
		expect(levelForExperience(state.progression.experience)).toBe(10);
		expect(state.player.health).toBe(state.player.maxHealth);
		expect(state.gold).toBe(10000);
		expect([...state.knownSpells].sort()).toEqual(
			Object.keys(SPELL_DEFINITIONS).sort(),
		);
		for (const kind of [
			...kindsOf("potion"),
			...kindsOf("scroll"),
			...kindsOf("enchantment"),
		])
			expect(count(kind), kind).toBe(20);
		// Special finds that are gear come singly; stackable ones come as 20 above.
		for (const kind of Object.keys(ITEM_DEFINITIONS) as ItemKind[])
			if (
				"specialFindOnly" in ITEM_DEFINITIONS[kind] &&
				!["potion", "scroll", "enchantment"].includes(
					ITEM_DEFINITIONS[kind].type,
				)
			)
				expect(count(kind), kind).toBe(1);
	});

	// Coverage is derived from the content definitions, so new content joins the
	// test floors automatically; these fail if something cannot be represented.
	it("puts every optional encounter on floor 1", () => {
		const { state } = session();
		const kinds = new Set(
			state.objects.filter((o) => o.floorNumber === 1).map((o) => o.kind),
		);
		for (const kind of Object.keys(OBJECT_DEFINITIONS) as DungeonObjectKind[])
			if (kind !== "door") expect(kinds.has(kind), kind).toBe(true);
		expect(
			state.monsters.some(
				(m) => m.floorNumber === 1 && m.kind === "iron-champion",
			),
		).toBe(true);
	});

	it("gives every affliction a floor-2 room of two sources behind a door", () => {
		const { state } = session();
		const floor2 = state.monsters.filter((m) => m.floorNumber === 2);
		const inflicted = new Set<AfflictionKind>();
		for (const monster of floor2) {
			const affliction = monsterAffliction(monster.kind);
			if (affliction) inflicted.add(affliction);
			if (MONSTER_DEFINITIONS[monster.kind].onHitCondition)
				inflicted.add("poisoned");
		}
		expect([...inflicted].sort()).toEqual(
			Object.keys(AFFLICTION_DEFINITIONS).sort(),
		);
		for (const kind of new Set(floor2.map((m) => m.kind)))
			expect(floor2.filter((m) => m.kind === kind)).toHaveLength(2);
		expect(
			state.objects.filter((o) => o.floorNumber === 2 && o.kind === "door"),
		).toHaveLength(new Set(floor2.map((m) => m.kind)).size);
	});

	it("places every monster kind on the authored floors", () => {
		const { state } = session();
		const placed = new Set(
			state.monsters
				.filter((m) => m.floorNumber <= TEST_SEED_FLOORS)
				.map((m) => m.kind),
		);
		// The reflection appears only when you face the floor-1 mirror.
		for (const kind of Object.keys(MONSTER_DEFINITIONS) as MonsterKind[])
			if (kind !== "reflection" && kind !== "ember-warden")
				expect(placed.has(kind), kind).toBe(true);
	});

	it("keeps every authored tile reachable and linked to the generated floors", () => {
		const { state } = session();
		const { floors } = state.run;
		for (const floor of floors.slice(0, TEST_SEED_FLOORS)) {
			const start =
				floor.floorNumber === 1
					? state.run.playerCoordinate
					: floor.upStair?.coordinate;
			if (!start) throw new Error(`floor ${floor.floorNumber} has no entry`);
			const seen = new Set<string>();
			const queue = [start];
			for (const point of queue) {
				const key = `${point.row},${point.col}`;
				if (seen.has(key) || floor.terrain[point.row]?.[point.col] !== ".")
					continue;
				seen.add(key);
				queue.push(
					{ row: point.row - 1, col: point.col },
					{ row: point.row + 1, col: point.col },
					{ row: point.row, col: point.col - 1 },
					{ row: point.row, col: point.col + 1 },
				);
			}
			const placed = [...state.monsters, ...state.objects].filter(
				(e) => e.floorNumber === floor.floorNumber,
			);
			for (const entity of placed)
				expect(
					seen.has(`${entity.coordinate.row},${entity.coordinate.col}`),
				).toBe(true);
			expect(floor.downStair).toBeDefined();
			const next = floors[floor.floorNumber];
			expect(next.upStair?.coordinate).toEqual(
				floor.downStair?.arrivalCoordinate,
			);
			expect(next.upStair?.arrivalCoordinate).toEqual(
				floor.downStair?.coordinate,
			);
		}
		// Deeper floors and the ember come from ordinary generation.
		expect(
			state.floorItems.some(
				(i) => i.item.kind === "cure" && i.floorNumber === floors.length,
			),
		).toBe(true);
		expect(
			[...state.monsters, ...state.objects, ...state.floorItems].filter(
				(e) => e.floorNumber > TEST_SEED_FLOORS,
			).length,
		).toBeGreaterThan(0);
	});

	it("fits a compact configuration and leaves ordinary seeds untouched", () => {
		const compact = createAdventureSession(
			TEST_SEED,
			COMPACT_TEST_CONFIGURATION,
			DEFAULT_FOG_CONFIGURATION,
		);
		expect(compact.state.run.floors.length).toBe(
			COMPACT_TEST_CONFIGURATION.floorCount,
		);
		const ordinary = createAdventureSession(
			TEST_SEED + 1,
			DEFAULT_RUN_CONFIGURATION,
			DEFAULT_FOG_CONFIGURATION,
		);
		expect(ordinary.state.gold).toBe(300);
		expect(ordinary.state.progression.experience).toBe(0);
	});
});
