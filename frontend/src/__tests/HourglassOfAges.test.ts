// @vitest-environment node
import { expect, it } from "vitest";
import { formatActivityEvent } from "../components/game/ActivityMessages";
import { updateExploration } from "../domain/dungeon/Exploration";
import { DEFAULT_FOG_CONFIGURATION } from "../domain/dungeon/RunConfiguration";
import { emptyCombatTelemetry } from "../domain/game/CombatTelemetry";
import { createGameState, type GameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import type { Monster } from "../domain/monsters/Monster";
import {
	actorAttackDamage,
	actorMaximumHealth,
} from "../domain/monsters/MonsterStats";
import {
	RARE_DISCOVERY_CHANCE,
	rareDiscoverySelection,
} from "../domain/objects/RareDiscoveryPlacement";
import {
	createSaveDocument,
	parseSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { COMPACT_TEST_CONFIGURATION } from "./TestRunConfiguration";
import { createTestDungeonFloor } from "./testhelpers";

const FLOORS = 10;
const HOURGLASS = {
	id: "floor:8:object:hourglass:1",
	kind: "hourglass" as const,
	floorNumber: 8,
	coordinate: { row: 4, col: 5 },
	activated: false,
};
const goblin = (id: string, floorNumber: number, health: number): Monster => ({
	id,
	kind: "goblin",
	floorNumber,
	coordinate: { row: 10, col: 10 },
	health,
	intent: { type: "idle" },
	lastDamagedTurn: null,
});
// Ten linked open floors; the player stands at 4,4 on floor 8 beside the hourglass,
// wounded and low on mana, with one hurt goblin far away on the same floor.
const encounter = (): GameState => {
	const base = createGameState({
		seed: 0,
		activeFloor: 8,
		playerCoordinate: { row: 4, col: 4 },
		floors: Array.from({ length: FLOORS }, (_, index) =>
			createTestDungeonFloor({
				floorNumber: index + 1,
				rows: 15,
				cols: 15,
				room: { startRow: 1, endRow: 13, startCol: 1, endCol: 13 },
				...(index > 0
					? {
							upStair: {
								coordinate: { row: 1, col: 1 },
								destinationFloor: index,
								arrivalCoordinate: { row: 13, col: 13 },
							},
						}
					: {}),
				...(index < FLOORS - 1
					? {
							downStair: {
								coordinate: { row: 13, col: 13 },
								destinationFloor: index + 2,
								arrivalCoordinate: { row: 1, col: 1 },
							},
						}
					: {}),
			}),
		),
	});
	return {
		...base,
		player: { ...base.player, health: 3 },
		mana: 1,
		objects: [HOURGLASS],
		monsters: [goblin("8:1", 8, 3), goblin("7:1", 7, 2)],
		floorItems: [
			{
				item: { id: "quest:cure", kind: "cure" },
				floorNumber: FLOORS,
				coordinate: { row: 7, col: 7 },
			},
		],
	};
};
const turn = (state: GameState) =>
	resolvePlayerAction(state, {
		type: "interact",
		objectId: HOURGLASS.id,
		choice: "hourglass-turn",
	});
const saved = (state: GameState) =>
	createSaveDocument(
		state,
		updateExploration(state.run, DEFAULT_FOG_CONFIGURATION.radius),
		{ ...COMPACT_TEST_CONFIGURATION, floorCount: FLOORS },
		DEFAULT_FOG_CONFIGURATION,
		new Date("2026-10-21T12:00:00Z"),
	);

it("restores full health and mana and empowers this floor's survivors once", () => {
	const state = { ...encounter(), combatTelemetry: emptyCombatTelemetry() };
	const result = turn(state);
	expect(result.turnAdvanced).toBe(true);
	const after = result.state;
	expect(after.combatTelemetry?.floors[8]?.healing.hourglass).toBe(
		state.player.maxHealth - state.player.health,
	);
	expect(after.objects[0].activated).toBe(true);
	// Monsters act after the recovery, but the goblin is far away and can't reach you.
	expect(after.player.health).toBe(after.player.maxHealth);
	expect(after.mana).toBeGreaterThan(1);
	const [here, below] = after.monsters;
	expect(here.empowered).toBe(true);
	// ×1.5 base health rounded up, keeping the 3-HP goblin's wound share (rounded up).
	const before = actorMaximumHealth(state.monsters[0]);
	expect(actorMaximumHealth(here)).toBe(Math.ceil(before * 1.5));
	expect(here.health).toBe(Math.ceil((3 * Math.ceil(before * 1.5)) / before));
	expect(actorAttackDamage(here)).toBe(
		Math.ceil(actorAttackDamage(state.monsters[0]) * 1.5),
	);
	// Other floors are untouched.
	expect(below).toEqual(state.monsters[1]);
	const entry = after.activityHistory.entries.find(
		({ event }) => event.type === "hourglass-turned",
	);
	expect(entry && formatActivityEvent(entry.event)).toMatch(
		/^Turn 1 — You turn the Hourglass of Ages: \+\d+ HP and \+\d+ mana, fully restored\. 1 creature on this floor grows stronger\.$/,
	);
	expect(parseSave(serializeSave(saved(after))).ok).toBe(true);
	const again = turn(after);
	expect(again.turnAdvanced).toBe(false);
	expect(again.state).toBe(after);
});

it("is refused free at full health and mana, or with nobody to empower", () => {
	const state = encounter();
	const rested = {
		...state,
		player: { ...state.player, health: state.player.maxHealth },
		mana: 10,
	};
	const full = turn(rested);
	expect(full.turnAdvanced).toBe(false);
	expect(full.error).toMatch(/full health and mana/);
	expect(full.state).toBe(rested);
	const empty = { ...state, monsters: [goblin("7:1", 7, 2)] };
	const alone = turn(empty);
	expect(alone.turnAdvanced).toBe(false);
	expect(alone.error).toMatch(/no living creature/);
	expect(alone.state).toBe(empty);
});

it("saves reject empowerment without a turned hourglass on that floor", () => {
	const document = saved(turn(encounter()).state);
	const forged = {
		...document,
		state: {
			...document.state,
			monsters: document.state.monsters.map((m) => ({
				...m,
				empowered: true,
			})),
		},
	} as typeof document;
	expect(parseSave(serializeSave(forged)).ok).toBe(false);
});

it("is the rarest discovery: half an ordinary weight within a 60% shared chance", () => {
	expect(RARE_DISCOVERY_CHANCE).toBe(0.6);
	const counts = new Map<string, number>();
	const floors = Array.from({ length: 20 }, (_, index) => ({
		floorNumber: index + 1,
	}));
	for (let seed = 0; seed < 6000; seed++) {
		const choice = rareDiscoverySelection({
			seed,
			floors,
		} as Parameters<typeof rareDiscoverySelection>[0]);
		if (!choice) continue;
		counts.set(choice.kind, (counts.get(choice.kind) ?? 0) + 1);
		if (choice.kind === "hourglass")
			expect(choice.floorNumber).toBeGreaterThanOrEqual(8);
	}
	const total = [...counts.values()].reduce((a, b) => a + b, 0);
	expect(Math.abs(total / 6000 - 0.6)).toBeLessThan(0.03);
	// Five ordinary kinds at 0.6 / 5.5 ≈ 10.9%; the hourglass at half that.
	expect(
		Math.abs((counts.get("hourglass") ?? 0) / 6000 - 0.6 / 11),
	).toBeLessThan(0.015);
	expect(Math.abs((counts.get("well") ?? 0) / 6000 - 0.6 / 5.5)).toBeLessThan(
		0.02,
	);
});
