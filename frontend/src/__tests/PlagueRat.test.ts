// @vitest-environment node
import { expect, it } from "vitest";
import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { createSeededRandom } from "../domain/dungeon/Seed";
import { applyDisease } from "../domain/game/Disease";
import { createGameState, type GameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { createMonsterDrop } from "../domain/items/MonsterDrops";
import {
	eligibleMonsterKinds,
	MONSTER_DEFINITIONS,
	selectMonsterKind,
} from "../domain/monsters/Monster";
import {
	AFFLICTION_SOURCE_CHANCE,
	spawnRunMonsters,
} from "../domain/monsters/MonsterPlacement";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import { savedAdventure } from "./SaveTestHelpers";
import { COMPACT_TEST_CONFIGURATION } from "./TestRunConfiguration";

const hit = () => ({ d20: () => 20, damage: (min: number) => min });
const miss = () => ({ d20: () => 1, damage: (min: number) => min });
const encounter = (turn = 0): GameState => ({
	...createGameState(createCorridorEncounter()),
	turn,
	monsters: [
		{
			id: "1:1",
			kind: "plague-rat",
			floorNumber: 1,
			coordinate: { row: 1, col: 2 },
			health: 4,
			intent: { type: "idle" },
		},
	],
});
const diseased = (state: GameState) =>
	state.afflictions?.some((a) => a.kind === "disease") ?? false;
const waitAt = (turn: number, rolls = hit, state = encounter(turn)) =>
	resolvePlayerAction(state, { type: "wait" }, rolls).state;
const turns = [...Array(200).keys()];

it("defines a low-damage floor 2–6 carrier outside ordinary and return-wave pools", () => {
	const rat = MONSTER_DEFINITIONS["plague-rat"];
	expect(rat).toMatchObject({
		minFloor: 2,
		maxFloor: 6,
		maxHealth: 4,
		attackDamage: 1,
		spawnEnabled: false,
		onHitAffliction: { kind: "disease", chance: 0.2 },
	});
	for (let floor = 1; floor <= 20; floor++) {
		expect(eligibleMonsterKinds(floor)).not.toContain("plague-rat");
		const random = createSeededRandom(floor);
		for (let draw = 0; draw < 200; draw++)
			expect(selectMonsterKind(floor, random)).not.toBe("plague-rat");
	}
});

it("infects on about one landed hit in five, deterministically, and never on a miss", () => {
	const infected = turns.filter((turn) => diseased(waitAt(turn)));
	expect(infected.length / turns.length).toBeGreaterThan(0.1);
	expect(infected.length / turns.length).toBeLessThan(0.3);
	expect(turns.filter((turn) => diseased(waitAt(turn)))).toEqual(infected);
	expect(turns.some((turn) => diseased(waitAt(turn, miss)))).toBe(false);

	const after = waitAt(infected[0]);
	// The 1-damage bite leaves 9 HP, then Disease clamps it to the new maximum.
	expect(after.player).toEqual({ health: 8, maxHealth: 8 });
	expect(after.afflictions).toEqual([
		{ kind: "disease", remaining: null, source: "plague rat" },
	]);
	expect(after.activityHistory.entries.map(({ event }) => event.type)).toEqual([
		"monster-hit",
		"affliction-changed",
	]);
});

it("does not stack, and magic resistance never protects against Disease", () => {
	const infected = turns.filter((turn) => diseased(waitAt(turn)));
	const first = waitAt(infected[0]);
	const again = waitAt(infected[1], hit, { ...first, turn: infected[1] });
	expect(again.afflictions).toEqual(first.afflictions);
	expect(again.player.maxHealth).toBe(8);
	expect(
		again.activityHistory.entries.filter(
			({ event }) => event.type === "affliction-changed",
		),
	).toHaveLength(1);

	const warded = (turn: number) => ({
		...encounter(turn),
		equipment: {
			...encounter(turn).equipment,
			chest: { id: "test:cloak", kind: "warding-cloak" as const },
		},
	});
	expect(
		turns.filter((turn) => diseased(waitAt(turn, hit, warded(turn)))),
	).toEqual(infected);
});

it("a fatal bite kills without infecting", () => {
	const infected = turns.filter((turn) => diseased(waitAt(turn)));
	const dying = {
		...encounter(infected[0]),
		player: { health: 1, maxHealth: 10 },
	};
	const dead = waitAt(infected[0], hit, dying);
	expect(dead.player.health).toBe(0);
	expect(dead.afflictions).toEqual([]);
});

it("replaces at most one ordinary spawn per eligible floor from its own stream and marks the first carrier", () => {
	let carriers = 0;
	let seedsWithCarrier = 0;
	for (let seed = 0; seed < 40; seed++) {
		const run = connectDungeonFloors(
			generateDungeonRun(seed, 8, COMPACT_TEST_CONFIGURATION),
		);
		const monsters = spawnRunMonsters(run);
		expect(spawnRunMonsters(run)).toEqual(monsters);
		const rats = monsters.filter((m) => m.kind === "plague-rat");
		carriers += rats.length;
		if (rats.length) seedsWithCarrier++;
		for (const floor of run.floors) {
			const onFloor = monsters.filter(
				(m) => m.floorNumber === floor.floorNumber,
			);
			// Replacement keeps the ordinary population size and identities.
			expect(onFloor.map((m) => m.id)).toEqual(
				onFloor.map((_, index) => `${floor.floorNumber}:${index + 1}`),
			);
			expect(
				onFloor.filter((m) => m.kind === "plague-rat").length,
			).toBeLessThanOrEqual(1);
		}
		for (const rat of rats) {
			expect(rat.floorNumber).toBeGreaterThanOrEqual(2);
			expect(rat.floorNumber).toBeLessThanOrEqual(6);
			expect(rat.health).toBe(4);
		}
		const marked = monsters.filter((m) => m.remedyDrop);
		expect(marked).toEqual(
			rats.length
				? [rats.reduce((a, b) => (b.floorNumber < a.floorNumber ? b : a))]
				: [],
		);
	}
	// Sparse: well under one per eligible floor, and not every seed.
	expect(carriers / (40 * 5)).toBeLessThan(AFFLICTION_SOURCE_CHANCE + 0.1);
	expect(seedsWithCarrier).toBeGreaterThan(0);
	expect(seedsWithCarrier).toBeLessThan(40);
});

it("the first carrier drops one Cure Disease potion; later carriers use ordinary loot", () => {
	const kill = (state: GameState) => {
		let current = state;
		for (let i = 0; i < 10 && current.monsters.length; i++)
			current = resolvePlayerAction(
				{ ...current, player: { health: 10, maxHealth: 10 }, afflictions: [] },
				{ type: "move", direction: "right" },
				hit,
			).state;
		return current;
	};
	const marked = encounter();
	const killed = kill({
		...marked,
		monsters: [{ ...marked.monsters[0], remedyDrop: true }],
	});
	expect(
		killed.floorItems.filter((entry) => entry.item.id === "monster:1:1:loot"),
	).toEqual([
		{
			item: { id: "monster:1:1:loot", kind: "cure-disease-potion" },
			floorNumber: 1,
			coordinate: { row: 1, col: 2 },
		},
	]);
	// Unmarked carriers keep the ordinary seeded drop chance and loot pool.
	const drops = [...Array(60).keys()].map((index) =>
		createMonsterDrop(
			123,
			{ ...marked.monsters[0], id: `2:${index + 1}`, floorNumber: 2 },
			undefined,
			true,
		),
	);
	expect(drops.some((drop) => drop === undefined)).toBe(true);
	expect(
		drops.filter((drop) => drop?.item.kind === "cure-disease-potion").length,
	).toBeLessThan(drops.length / 4);
});

it("saves the carrier marker and continues an infection identically after load", () => {
	const original = restoreSave(savedAdventure());
	const [first] = original.state.monsters;
	const withCarrier = {
		...original.state,
		monsters: original.state.monsters.map((m) =>
			m.id === first.id
				? {
						id: m.id,
						floorNumber: m.floorNumber,
						coordinate: m.coordinate,
						lastDamagedTurn: null,
						intent: { type: "idle" as const },
						kind: "plague-rat" as const,
						health: 4,
						remedyDrop: true,
					}
				: { ...m, remedyDrop: undefined },
		),
	};
	const save = (state: GameState) =>
		parseSave(
			serializeSave(
				createSaveDocument(
					state,
					original.exploration,
					original.configuration,
					original.fog,
				),
			),
		);
	const parsed = save(withCarrier);
	if (!parsed.ok) throw new Error(parsed.error);
	expect(
		restoreSave(parsed.value).state.monsters.find((m) => m.id === first.id),
	).toMatchObject({ kind: "plague-rat", remedyDrop: true });

	const second = original.state.monsters[1];
	expect(
		save({
			...withCarrier,
			monsters: withCarrier.monsters.map((m) =>
				m.id === second.id ? { ...m, remedyDrop: true } : m,
			),
		}).ok,
	).toBe(false);
	expect(
		save({
			...withCarrier,
			monsters: withCarrier.monsters.map((m) =>
				m.id === first.id ? { ...m, kind: "goblin" as const } : m,
			),
		}).ok,
	).toBe(false);
	expect(save({ ...withCarrier, dungeonRemedies: undefined }).ok).toBe(false);

	const live = applyDisease({ ...original.state, monsters: [] }, "plague rat");
	const sickSave = save(live);
	if (!sickSave.ok) throw new Error(sickSave.error);
	const resumed = restoreSave(sickSave.value).state;
	expect(resumed.afflictions).toEqual(live.afflictions);
	expect(resumed.player).toEqual(live.player);
	expect(resolvePlayerAction(resumed, { type: "wait" }, hit).state).toEqual(
		resolvePlayerAction(live, { type: "wait" }, hit).state,
	);
});
