// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	ARENA_DOWN_STAIR,
	ARENA_UP_STAIR,
	arenaDoorId,
	arenaFloorFor,
	arenaGateId,
	arenaRewardId,
	isArenaTerrain,
	MINIBOSS_KINDS,
	type MinibossKind,
	minibossId,
	selectMiniboss,
	withArena,
} from "../domain/arena/Arena";
import { ARENA_ROOMS } from "../domain/arena/ArenaLayout";
import {
	ARENA_SCROLL_REFUSAL,
	EXIT_REFUSAL,
	GATE_REFUSAL,
	SEALED_STAIR_REFUSAL,
} from "../domain/arena/ArenaRules";
import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { updateExploration } from "../domain/dungeon/Exploration";
import { DEFAULT_FOG_CONFIGURATION } from "../domain/dungeon/RunConfiguration";
import { createGameState, type GameState } from "../domain/game/GameState";
import { damageMonster } from "../domain/game/MonsterDamage";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { createTestSeedState } from "../domain/game/TestSeed";
import { exitScrollRestriction } from "../domain/items/ExitDungeonScroll";
import { coordinateKey } from "../domain/monsters/MonsterLocations";
import { sealedTiles } from "../domain/objects/OptionalEliteRooms";
import { portalFloors } from "../domain/objects/RunicPortal";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { COMPACT_TEST_CONFIGURATION } from "./TestRunConfiguration";

const configuration = { ...COMPACT_TEST_CONFIGURATION, floorCount: 10 };
const { floorCount: _floors, ...dungeon } = configuration;
const adventure = (seed = 1, depth = 10) =>
	createGameState(
		connectDungeonFloors(generateDungeonRun(seed, depth, dungeon)),
	);
const hit = () => ({ d20: () => 20, damage: (min: number) => min });
const act = (
	state: GameState,
	action: Parameters<typeof resolvePlayerAction>[1] = { type: "wait" },
) => resolvePlayerAction(state, action, hit);
const save = (state: GameState) =>
	parseSave(
		serializeSave(
			createSaveDocument(
				state,
				updateExploration(state.run, DEFAULT_FOG_CONFIGURATION.radius),
				configuration,
				DEFAULT_FOG_CONFIGURATION,
			),
		),
	);
// Beside the gate on floor 5 of a ten-floor adventure.
const atGate = (seed = 1): GameState => {
	const state = adventure(seed);
	const stair = state.run.floors[4].downStair;
	if (!stair) throw new Error("Expected floor 5's down stair");
	const terrain = state.run.floors[4].terrain;
	const beside = [
		{ row: 0, col: -1 },
		{ row: 0, col: 1 },
		{ row: -1, col: 0 },
		{ row: 1, col: 0 },
	]
		.map((d) => ({
			row: stair.coordinate.row + d.row,
			col: stair.coordinate.col + d.col,
		}))
		.find((p) => terrain[p.row]?.[p.col] === ".");
	if (!beside) throw new Error("Expected a tile beside the stair");
	return {
		...state,
		monsters: state.monsters.filter((m) => m.floorNumber !== 5),
		run: { ...state.run, activeFloor: 5, playerCoordinate: beside },
	};
};
const enter = (state: GameState) =>
	act(state, {
		type: "interact",
		objectId: arenaGateId(6),
		choice: "enter-arena",
	}).state;
// In the hall with only the miniboss, which is reshaped as asked.
const inHall = (
	miniboss: MinibossKind,
	player: { row: number; col: number },
	boss: { row: number; col: number },
) => {
	// A seed whose arena holds this miniboss.
	let seed = 1;
	while (selectMiniboss(seed) !== miniboss) seed++;
	const entered = enter(atGate(seed));
	const arena = entered.monsters.find((m) => m.id === minibossId(6));
	if (!arena) throw new Error("Expected the miniboss");
	return {
		...entered,
		monsters: [
			...entered.monsters.filter((m) => m.floorNumber !== 6),
			{ ...arena, coordinate: boss },
		],
		run: { ...entered.run, playerCoordinate: player },
	};
};
const boss = (state: GameState) =>
	state.monsters.find((m) => m.id === minibossId(6));

describe("Arenas", () => {
	it("routes long adventures through one arena 60% of the way down, fixed by seed, and spares shorter ones", () => {
		expect(arenaFloorFor(9)).toBeUndefined();
		expect(arenaFloorFor(10)).toBe(6);
		expect(arenaFloorFor(20)).toBe(12);
		expect(adventure(1, 9).arenas).toBeUndefined();
		const seen = new Set<string>();
		for (let seed = 1; seed <= 12; seed++) {
			const state = adventure(seed);
			expect(adventure(seed)).toEqual(state);
			expect(state.arenas).toEqual([
				{ floorNumber: 6, miniboss: selectMiniboss(seed) },
			]);
			seen.add(selectMiniboss(seed));
			const [above, floor, below] = state.run.floors.slice(4, 7);
			expect(isArenaTerrain(floor.terrain)).toBe(true);
			expect(floor.upStair?.coordinate).toEqual(ARENA_UP_STAIR);
			expect(above.downStair?.arrivalCoordinate).toEqual(ARENA_UP_STAIR);
			expect(floor.downStair?.coordinate).toEqual(ARENA_DOWN_STAIR);
			expect(below.upStair?.arrivalCoordinate).toEqual(ARENA_DOWN_STAIR);
			// The gate bars the stair down; only arena content stands on its floor.
			expect(
				state.objects.find((o) => o.id === arenaGateId(6))?.coordinate,
			).toEqual(above.downStair?.coordinate);
			expect(
				state.monsters.filter((m) => m.floorNumber === 6).map((m) => m.id),
			).toEqual([minibossId(6)]);
			expect(
				state.objects
					.filter((o) => o.floorNumber === 6)
					.map((o) => o.kind)
					.sort(),
			).toEqual(["arena-door", "door", "gold"]);
			expect(
				state.floorItems
					.filter((i) => i.floorNumber === 6)
					.map((i) => i.item.id),
			).toEqual([arenaRewardId(6)]);
			expect(state.omens?.some((o) => o.floorNumber === 6) ?? false).toBe(
				false,
			);
			expect(save(state).ok).toBe(true);
		}
		expect([...seen].sort()).toEqual([...MINIBOSS_KINDS].sort());
	});

	it("warns at the gate, then enters in one step with no way back", () => {
		const state = atGate();
		const gate = state.objects.find((o) => o.id === arenaGateId(6));
		if (!gate) throw new Error("Expected the gate");
		const offset = {
			row: gate.coordinate.row - state.run.playerCoordinate.row,
			col: gate.coordinate.col - state.run.playerCoordinate.col,
		};
		const direction =
			offset.row === -1
				? "up"
				: offset.row === 1
					? "down"
					: offset.col === -1
						? "left"
						: "right";
		const bumped = act(state, { type: "move", direction });
		expect(bumped.turnAdvanced).toBe(false);
		expect(bumped.error).toBe(GATE_REFUSAL);
		const entered = enter(state);
		expect(entered.run.activeFloor).toBe(6);
		expect(entered.run.playerCoordinate).toEqual(ARENA_UP_STAIR);
		expect(entered.objects.find((o) => o.id === gate.id)?.activated).toBe(true);
		expect(
			entered.activityHistory.entries.map(({ event }) => event.type),
		).toContain("arena-entered");
		// Off the stair, and the way back is sealed.
		const stepped = act(entered, { type: "move", direction: "right" }).state;
		const back = act(stepped, { type: "move", direction: "left" });
		expect(back.error).toBe(SEALED_STAIR_REFUSAL);
		expect(
			exitScrollRestriction({
				...stepped,
				bag: { items: [{ id: "s", kind: "exit-scroll" }] },
			}),
		).toBe(ARENA_SCROLL_REFUSAL);
		expect(save(stepped).ok).toBe(true);
	});

	it("keeps the reward room sealed and every portal short of the arena until it is won", () => {
		const entered = enter(atGate());
		const floor = entered.run.floors[5];
		const sealed = sealedTiles(floor, entered.objects);
		expect(
			sealed.has(
				coordinateKey({
					row: ARENA_ROOMS.reward.startRow,
					col: ARENA_ROOMS.reward.startCol,
				}),
			),
		).toBe(true);
		expect(portalFloors(entered.run, { floorNumber: 4 }, [6])).toEqual([4, 5]);
		expect(portalFloors(entered.run, { floorNumber: 7 }, [6])).toEqual([
			7, 8, 9,
		]);
		// Beside the sealed exit, a step into it is refused.
		const atExit = {
			...entered,
			run: { ...entered.run, playerCoordinate: { row: 8, col: 32 } },
		};
		expect(act(atExit, { type: "move", direction: "right" }).error).toBe(
			EXIT_REFUSAL,
		);
	});

	it("opens the exit and restores you when nothing in the hall stands, and saves it", () => {
		const entered = enter(atGate());
		const wounded = {
			...entered,
			player: { ...entered.player, health: 1 },
			mana: 0,
		};
		const minibossNow = boss(wounded);
		if (!minibossNow) throw new Error("Expected the miniboss");
		const slain = damageMonster(wounded, minibossNow, 9999, {
			type: "player-hit",
		});
		const won = act(slain).state;
		expect(won.objects.find((o) => o.id === arenaDoorId(6))?.activated).toBe(
			true,
		);
		expect(won.player.health).toBe(won.player.maxHealth);
		expect(won.mana).toBeGreaterThan(0);
		expect(
			won.activityHistory.entries.map(({ event }) => event.type),
		).toContain("arena-cleared");
		expect(sealedTiles(won.run.floors[5], won.objects).size).toBe(0);
		const parsed = save(won);
		if (!parsed.ok) throw new Error(parsed.error);
		expect(restoreSave(parsed.value).state.arenas).toEqual(won.arenas);
		// The way back up opens too.
		const stepped = act(won, { type: "move", direction: "right" }).state;
		expect(
			act(stepped, { type: "move", direction: "left" }).state.run.activeFloor,
		).toBe(5);
	});

	it("Iron Juggernaut: charges past you into stone, is stunned and takes double damage", () => {
		// Same row of the open upper hall: it prepares from eight tiles.
		const start = inHall(
			"iron-juggernaut",
			{ row: 3, col: 20 },
			{ row: 3, col: 28 },
		);
		const prepared = act(start).state;
		expect(boss(prepared)?.intent.type).toBe("preparing-charge");
		const dodged = act(prepared, { type: "move", direction: "down" }).state;
		const juggernaut = boss(dodged);
		expect(juggernaut?.coordinate).toEqual({ row: 3, col: 10 });
		expect(
			dodged.effects.some(
				(e) => e.actorId === minibossId(6) && e.kind === "stunned",
			),
		).toBe(true);
		expect(
			dodged.activityHistory.entries.some(
				({ event }) =>
					event.type === "monster-charge-ended" && event.outcome === "slammed",
			),
		).toBe(true);
		if (!juggernaut) throw new Error("Expected the juggernaut");
		const struck = damageMonster(dodged, juggernaut, 5, { type: "player-hit" });
		expect(boss(struck)?.health).toBe(juggernaut.health - 10);
		expect(save(dodged).ok).toBe(true);
	});

	it("both minibosses change phase once at half health; the Pyre Lord calls two salamanders", () => {
		const pyre = inHall("pyre-lord", { row: 3, col: 12 }, { row: 13, col: 28 });
		const lord = boss(pyre);
		if (!lord) throw new Error("Expected the Pyre Lord");
		const halved = {
			...pyre,
			monsters: pyre.monsters.map((m) =>
				m.id === lord.id ? { ...m, health: Math.floor(m.health / 2) } : m,
			),
		};
		const enraged = act(halved).state;
		expect(boss(enraged)?.minibossPhase).toBe(2);
		expect(
			enraged.monsters.filter((m) => m.kind === "salamander").map((m) => m.id),
		).toEqual(["6:1000021", "6:1000022"]);
		expect(
			enraged.activityHistory.entries.some(
				({ event }) => event.type === "miniboss-enraged",
			),
		).toBe(true);
		expect(save(enraged).ok).toBe(true);
		// Once only.
		expect(
			act(enraged).state.monsters.filter((m) => m.kind === "salamander"),
		).toHaveLength(2);
		const jug = inHall(
			"iron-juggernaut",
			{ row: 3, col: 12 },
			{ row: 13, col: 28 },
		);
		const big = boss(jug);
		if (!big) throw new Error("Expected the juggernaut");
		const furious = act({
			...jug,
			monsters: jug.monsters.map((m) =>
				m.id === big.id ? { ...m, health: Math.floor(m.health / 2) } : m,
			),
		}).state;
		expect(boss(furious)?.minibossPhase).toBe(2);
		expect(furious.monsters.filter((m) => m.floorNumber === 6)).toHaveLength(1);
	});

	it("rejects an arena on the wrong floor or with the wrong miniboss, an exit open too soon, and summons before the second phase", () => {
		const entered = enter(atGate());
		expect(save(entered).ok).toBe(true);
		expect(
			save({ ...entered, arenas: [{ floorNumber: 7, miniboss: "pyre-lord" }] })
				.ok,
		).toBe(false);
		const other = MINIBOSS_KINDS.find((kind) => kind !== selectMiniboss(1));
		if (!other) throw new Error("Expected another miniboss");
		expect(
			save({ ...entered, arenas: [{ floorNumber: 6, miniboss: other }] }).ok,
		).toBe(false);
		expect(
			save({
				...entered,
				objects: entered.objects.map((o) =>
					o.id === arenaDoorId(6) ? { ...o, activated: true } : o,
				),
			}).ok,
		).toBe(false);
		const minibossNow = boss(entered);
		if (!minibossNow) throw new Error("Expected the miniboss");
		expect(
			save({
				...entered,
				monsters: [
					...entered.monsters,
					{
						...minibossNow,
						id: "6:1000021",
						kind: "salamander",
						coordinate: { row: 2, col: 12 },
						health: 5,
					},
				],
			}).ok,
		).toBe(false);
	});

	it("gives the test seed an arena for each miniboss, one floor apart", () => {
		const state = createTestSeedState({
			...COMPACT_TEST_CONFIGURATION,
			floorCount: 20,
		});
		expect(state.arenas).toContainEqual({
			floorNumber: 4,
			miniboss: "pyre-lord",
		});
		expect(state.arenas).toContainEqual({
			floorNumber: 5,
			miniboss: "iron-juggernaut",
		});
		expect(isArenaTerrain(state.run.floors[3].terrain)).toBe(true);
		expect(isArenaTerrain(state.run.floors[4].terrain)).toBe(true);
		// Each arena's gate bars the stair down into it.
		expect(
			state.objects.find((o) => o.id === arenaGateId(4))?.floorNumber,
		).toBe(3);
		expect(
			state.objects.find((o) => o.id === arenaGateId(5))?.coordinate,
		).toEqual(ARENA_DOWN_STAIR);
		expect(withArena).toBeDefined();
	});
});
