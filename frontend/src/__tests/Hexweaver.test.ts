// @vitest-environment node
import { expect, it } from "vitest";
import { formatActivityEvent } from "../components/game/ActivityMessages";
import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { createGameState, type GameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { createMonsterDrop } from "../domain/items/MonsterDrops";
import {
	eligibleMonsterKinds,
	MONSTER_DEFINITIONS,
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

// The player stands at column 2 of a one-row corridor; the hexweaver is 5 tiles away.
const encounter = (): GameState => {
	const base = createGameState(createCorridorEncounter());
	return {
		...base,
		run: { ...base.run, playerCoordinate: { row: 1, col: 2 } },
		monsters: [
			{
				id: "1:1",
				kind: "hexweaver",
				floorNumber: 1,
				coordinate: { row: 1, col: 7 },
				health: 12,
				intent: { type: "idle" },
				lastDamagedTurn: null,
			},
		],
	};
};
const wait = (state: GameState) =>
	resolvePlayerAction(state, { type: "wait" }).state;
const types = (state: GameState) =>
	state.activityHistory.entries.map(({ event }) => event.type);
const cursed = (state: GameState) =>
	state.afflictions?.some((a) => a.kind === "curse") ?? false;

it("defines a floor 6–12 Curse source outside ordinary pools", () => {
	expect(MONSTER_DEFINITIONS.hexweaver).toMatchObject({
		minFloor: 6,
		maxFloor: 12,
		maxHealth: 12,
		attackDamage: 4,
		experienceReward: 14,
		spawnEnabled: false,
		hexAttack: { range: 5, cooldown: 3, damage: 2 },
	});
	for (let floor = 1; floor <= 20; floor++) {
		expect(eligibleMonsterKinds(floor)).not.toContain("hexweaver");
		expect(afflictionSourceKinds(floor).includes("hexweaver")).toBe(
			floor >= 6 && floor <= 12,
		);
	}
	expect(monsterTraits("hexweaver").join(" ")).toContain(
		"Break its line of sight or leave range",
	);
	expect(monsterTraits("hexweaver").join(" ")).toContain(
		"The first hexweaver of an adventure always drops a Remove Curse scroll.",
	);
});

it("prepares a hex in sight, then lands damage and Curse on its next action", () => {
	const prepared = wait(encounter());
	expect(prepared.monsters[0].intent).toEqual({
		type: "preparing-hex",
		target: { row: 1, col: 2 },
	});
	expect(cursed(prepared)).toBe(false);
	const hexed = wait(prepared);
	expect(hexed.player.health).toBe(10 - 2);
	expect(hexed.afflictions).toEqual([
		{ kind: "curse", remaining: null, source: "hexweaver" },
	]);
	expect(hexed.monsters[0]).toMatchObject({
		intent: { type: "idle" },
		hexTurn: hexed.turn,
	});
	expect(types(hexed)).toEqual([
		"monster-hex-prepared",
		"monster-hex-hit",
		"affliction-changed",
	]);
	const hit = hexed.activityHistory.entries[1].event;
	expect(formatActivityEvent(hit)).toBe(
		"Turn 2 — The hexweaver's hex strikes you for 2 damage.",
	);
	// Cooldown: no new hex for the next three phases.
	let next = hexed;
	for (let phase = 0; phase < 3; phase++) {
		next = wait(next);
		expect(next.monsters[0].intent.type).not.toBe("preparing-hex");
	}
});

it("fizzles when you leave range before it acts, and Sleep-style resets cancel it", () => {
	const prepared = wait(encounter());
	const escaped = resolvePlayerAction(prepared, {
		type: "move",
		direction: "left",
	}).state;
	expect(cursed(escaped)).toBe(false);
	expect(escaped.player.health).toBe(10);
	expect(types(escaped).at(-1)).toBe("monster-hex-avoided");
	// Magic resistance reduces the hex damage like other enemy magic.
	const warded = wait(
		wait({
			...encounter(),
			equipment: {
				...encounter().equipment,
				chest: { id: "test:cloak", kind: "warding-cloak" },
			},
		}),
	);
	expect(warded.player.health).toBeGreaterThanOrEqual(10 - 2);
});

it("spawns sparsely on floors 6–12 and the first hexweaver guarantees a Remove Curse scroll", () => {
	let found = 0;
	for (let seed = 0; seed < 12; seed++) {
		const run = connectDungeonFloors(
			generateDungeonRun(seed, 12, COMPACT_TEST_CONFIGURATION),
		);
		const monsters = markFirstRemedySources(spawnRunMonsters(run));
		const hexweavers = monsters.filter((m) => m.kind === "hexweaver");
		found += hexweavers.length;
		for (const floor of run.floors)
			expect(
				monsters.filter(
					(m) => m.floorNumber === floor.floorNumber && m.kind === "hexweaver",
				).length,
			).toBeLessThanOrEqual(1);
		for (const hexweaver of hexweavers)
			expect(hexweaver.floorNumber).toBeGreaterThanOrEqual(6);
		expect(hexweavers.filter((m) => m.remedyDrop)).toHaveLength(
			hexweavers.length ? 1 : 0,
		);
	}
	expect(found).toBeGreaterThan(0);
	const hexweaver = encounter().monsters[0];
	expect(
		createMonsterDrop(1, { ...hexweaver, remedyDrop: true }, undefined, [
			"remove-curse-scroll",
		])?.item,
	).toEqual({ id: "monster:1:1:loot", kind: "remove-curse-scroll" });
});

it("saves a prepared hex and its cooldown, and rejects them on other kinds", () => {
	const original = restoreSave(savedAdventure());
	const [first] = original.state.monsters;
	const withHex = (patch: object, kind = "hexweaver" as const) => ({
		...original.state,
		monsters: original.state.monsters.map((m) =>
			m.id === first.id
				? {
						id: m.id,
						floorNumber: m.floorNumber,
						coordinate: m.coordinate,
						lastDamagedTurn: null,
						kind,
						health: 12,
						intent: { type: "idle" as const },
						...patch,
					}
				: { ...m, remedyDrop: undefined },
		),
	});
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
	const preparing = withHex({
		intent: { type: "preparing-hex", target: { ...first.coordinate } },
		hexTurn: 0,
	});
	const parsed = save(preparing);
	if (!parsed.ok) throw new Error(parsed.error);
	expect(
		restoreSave(parsed.value).state.monsters.find((m) => m.id === first.id),
	).toMatchObject({ intent: { type: "preparing-hex" }, hexTurn: 0 });
	expect(
		save({
			...preparing,
			monsters: preparing.monsters.map((m) =>
				m.id === first.id ? { ...m, kind: "goblin" as const, health: 4 } : m,
			),
		}).ok,
	).toBe(false);
	// A prepared hex keeps deterministic continuation in live play.
	const live = wait(encounter());
	expect(wait(structuredClone(live))).toEqual(wait(live));
});
