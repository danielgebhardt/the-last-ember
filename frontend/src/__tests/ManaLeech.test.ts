// @vitest-environment node
import { expect, it } from "vitest";
import { formatActivityEvent } from "../components/game/ActivityMessages";
import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { createSeededRandom } from "../domain/dungeon/Seed";
import { appendActivityEvents } from "../domain/game/ActivityHistory";
import { createGameState, type GameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { createMonsterDrop } from "../domain/items/MonsterDrops";
import {
	eligibleMonsterKinds,
	MONSTER_DEFINITIONS,
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
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import { savedAdventure } from "./SaveTestHelpers";
import { COMPACT_TEST_CONFIGURATION } from "./TestRunConfiguration";

const hit = () => ({ d20: () => 20, damage: (min: number) => min });
const miss = () => ({ d20: () => 1, damage: (min: number) => min });
const encounter = (turn = 0, mana = 10): GameState => ({
	...createGameState(createCorridorEncounter()),
	turn,
	mana,
	player: { health: 60, maxHealth: 60 },
	monsters: [
		{
			id: "1:1",
			kind: "mana-leech",
			floorNumber: 1,
			coordinate: { row: 1, col: 2 },
			health: 16,
			intent: { type: "idle" },
		},
	],
});
const waitAt = (turn: number, rolls = hit, state = encounter(turn)) =>
	resolvePlayerAction(state, { type: "wait" }, rolls).state;
const burned = (state: GameState) =>
	state.afflictions?.some((a) => a.kind === "mana-burn") ?? false;
// Skip turns that end on a 30-turn recovery tick, which would refund one point.
const turns = [...Array(200).keys()].filter((turn) => (turn + 1) % 30 !== 0);

it("defines a floor 9–16 Mana Burn carrier outside ordinary pools", () => {
	expect(MONSTER_DEFINITIONS["mana-leech"]).toMatchObject({
		minFloor: 9,
		maxFloor: 16,
		maxHealth: 16,
		attackDamage: 6,
		experienceReward: 20,
		detectionRadius: 6,
		dropChance: 0.55,
		spawnEnabled: false,
		onHitAffliction: { kind: "mana-burn", chance: 0.2 },
		onHitManaDrain: { min: 2, max: 4 },
	});
	for (let floor = 1; floor <= 20; floor++) {
		expect(eligibleMonsterKinds(floor)).not.toContain("mana-leech");
		const random = createSeededRandom(floor);
		for (let draw = 0; draw < 100; draw++)
			expect(selectMonsterKind(floor, random)).not.toBe("mana-leech");
		expect(afflictionSourceKinds(floor).includes("mana-leech")).toBe(
			floor >= 9 && floor <= 16,
		);
	}
});

it("drains 2–4 mana on every landed hit, deterministically, never below zero or on a miss", () => {
	const drains = turns.map((turn) => 10 - waitAt(turn).mana);
	expect(new Set(drains)).toEqual(new Set([2, 3, 4]));
	expect(turns.map((turn) => 10 - waitAt(turn).mana)).toEqual(drains);
	expect(turns.every((turn) => waitAt(turn, miss).mana === 10)).toBe(true);

	const last = waitAt(0, hit, encounter(0, 1));
	expect(last.mana).toBe(0);
	expect(last.activityHistory.entries.map(({ event }) => event)).toContainEqual(
		{ type: "player-mana-drained", monster: "mana-leech", mana: 1, turn: 1 },
	);
	const empty = waitAt(0, hit, encounter(0, 0));
	expect(empty.mana).toBe(0);
	expect(
		empty.activityHistory.entries.some(
			({ event }) => event.type === "player-mana-drained",
		),
	).toBe(false);
	expect(
		formatActivityEvent({
			type: "player-mana-drained",
			monster: "mana-leech",
			mana: 3,
			turn: 4,
		}),
	).toBe("Turn 4 — The mana leech drains 3 mana.");
});

it("also burns on about one landed hit in five, after the drain", () => {
	const afflicted = turns.filter((turn) => burned(waitAt(turn)));
	expect(afflicted.length / turns.length).toBeGreaterThan(0.1);
	expect(afflicted.length / turns.length).toBeLessThan(0.3);
	expect(turns.some((turn) => burned(waitAt(turn, miss)))).toBe(false);
	const after = waitAt(afflicted[0]);
	expect(after.afflictions).toEqual([
		{ kind: "mana-burn", remaining: 89, source: "mana leech" },
	]);
	expect(after.activityHistory.entries.map(({ event }) => event.type)).toEqual([
		"monster-hit",
		"player-mana-drained",
		"affliction-changed",
	]);
	// A fatal hit drains and burns nothing.
	const dead = waitAt(afflicted[0], hit, {
		...encounter(afflicted[0]),
		player: { health: 1, maxHealth: 60 },
	});
	expect(dead.player.health).toBe(0);
	expect(dead.mana).toBe(10);
	expect(dead.afflictions).toEqual([]);
	expect(monsterTraits("mana-leech").join(" ")).toContain("drains 2–4 mana");
	expect(monsterTraits("mana-leech").join(" ")).toContain(
		"The first mana leech of an adventure always drops a Cleansing potion.",
	);
});

it("spawns sparsely on floors 9–16 and the first leech guarantees a Cleansing potion", () => {
	let leeches = 0;
	for (let seed = 0; seed < 12; seed++) {
		const run = connectDungeonFloors(
			generateDungeonRun(seed, 16, COMPACT_TEST_CONFIGURATION),
		);
		const monsters = markFirstRemedySources(spawnRunMonsters(run));
		const found = monsters.filter((m) => m.kind === "mana-leech");
		leeches += found.length;
		for (const leech of found) {
			expect(leech.floorNumber).toBeGreaterThanOrEqual(9);
			expect(leech.health).toBe(16);
		}
		const marked = found.filter((m) => m.remedyDrop);
		expect(marked).toHaveLength(found.length ? 1 : 0);
		if (marked[0])
			expect(marked[0].floorNumber).toBe(
				Math.min(...found.map((m) => m.floorNumber)),
			);
	}
	expect(leeches).toBeGreaterThan(0);
	expect(leeches).toBeLessThan(12 * 8 * 0.4);

	const leech = encounter().monsters[0];
	expect(
		createMonsterDrop(1, { ...leech, remedyDrop: true }, undefined, [
			"cleansing-potion",
		]),
	).toEqual({
		item: { id: "monster:1:1:loot", kind: "cleansing-potion" },
		floorNumber: 1,
		coordinate: { row: 1, col: 2 },
	});
});

it("saves the leech and its remedy marker, then continues a drain identically", () => {
	const original = restoreSave(savedAdventure());
	const [first] = original.state.monsters;
	const withLeech = {
		...original.state,
		monsters: original.state.monsters.map((m) =>
			m.id === first.id
				? {
						id: m.id,
						floorNumber: m.floorNumber,
						coordinate: m.coordinate,
						lastDamagedTurn: null,
						intent: { type: "idle" as const },
						kind: "mana-leech" as const,
						health: 16,
						remedyDrop: true,
					}
				: { ...m, remedyDrop: undefined },
		),
	};
	const parsed = parseSave(
		serializeSave(
			createSaveDocument(
				withLeech,
				original.exploration,
				original.configuration,
				original.fog,
			),
		),
	);
	if (!parsed.ok) throw new Error(parsed.error);
	const resumed = restoreSave(parsed.value).state;
	expect(resumed.monsters.find((m) => m.id === first.id)).toMatchObject({
		kind: "mana-leech",
		remedyDrop: true,
	});

	// The drain's Activity entry is part of the saved v27 history.
	const logged = {
		...withLeech,
		activityHistory: appendActivityEvents(withLeech.activityHistory, [
			{
				type: "player-mana-drained",
				monster: "mana-leech",
				mana: 3,
				turn: withLeech.turn,
			},
		]),
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
	const loggedSave = save(logged);
	if (!loggedSave.ok) throw new Error(loggedSave.error);
	expect(restoreSave(loggedSave.value).state.activityHistory).toEqual(
		logged.activityHistory,
	);
	// A leech marker needs the Cleansing remedy enabled for the adventure.
	expect(save({ ...withLeech, cleansingRemedies: undefined }).ok).toBe(false);
});
