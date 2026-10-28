// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	ARENA_DOWN_STAIR,
	ARENA_REWARD_KINDS,
	ARENA_UP_STAIR,
	arenaDoorId,
	arenaFloorFor,
	arenaGateId,
	arenaRackId,
	arenaRewardId,
	arenaSpawnId,
	eggSacId,
	isArenaTerrain,
	MINIBOSS_KINDS,
	type MinibossKind,
	minibossId,
	selectMiniboss,
} from "../domain/arena/Arena";
import { ARENA_ROOMS } from "../domain/arena/ArenaLayout";
import {
	ARENA_SCROLL_REFUSAL,
	EXIT_REFUSAL,
	GATE_REFUSAL,
	resolveArenas,
	SEALED_STAIR_REFUSAL,
} from "../domain/arena/ArenaRules";
import { BROOD_HATCH_INTERVAL } from "../domain/arena/Brood";
import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { updateExploration } from "../domain/dungeon/Exploration";
import { DEFAULT_FOG_CONFIGURATION } from "../domain/dungeon/RunConfiguration";
import { castAreaSpell } from "../domain/game/AreaSpells";
import { emptyCombatTelemetry } from "../domain/game/CombatTelemetry";
import { createFloorTelemetry } from "../domain/game/FloorTelemetry";
import { createGameState, type GameState } from "../domain/game/GameState";
import { damageMonster } from "../domain/game/MonsterDamage";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { createTestSeedState } from "../domain/game/TestSeed";
import { exitScrollRestriction } from "../domain/items/ExitDungeonScroll";
import type { Monster } from "../domain/monsters/Monster";
import { coordinateKey } from "../domain/monsters/MonsterLocations";
import {
	actorAttackDamage,
	maximumMonsterHealth,
	monsterAttackDamage,
} from "../domain/monsters/MonsterStats";
import { telegraphReady } from "../domain/monsters/MonsterTelegraphs";
import { objectChoices } from "../domain/objects/ObjectChoices";
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
		expect(adventure(1, 9).arenas).toEqual([]);
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
			).toEqual(
				[
					"arena-door",
					"arena-reward",
					"door",
					"gold",
					// The Broodmother's hall also holds her four egg sacs.
					...(selectMiniboss(seed) === "broodmother"
						? Array(4).fill("egg-sac")
						: []),
				].sort(),
			);
			expect(state.floorItems.filter((i) => i.floorNumber === 6)).toEqual([]);
			expect(state.omens?.some((o) => o.floorNumber === 6) ?? false).toBe(
				false,
			);
			expect(save(state).ok).toBe(true);
		}
		expect([...seen].sort()).toEqual([...MINIBOSS_KINDS].sort());
	});

	it("warns at the gate, then enters in one step with no way back", () => {
		const state = { ...atGate(), combatTelemetry: emptyCombatTelemetry() };
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
		expect(entered.combatTelemetry?.floors[6]?.pressure["arena-entered"]).toBe(
			1,
		);
		expect(
			entered.combatTelemetry?.floors[5]?.pressure["arena-entered"],
		).toBeUndefined();
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

	it("records entering through the gate as an arena-gate exit, not a portal", () => {
		const gate = atGate();
		const entered = enter({
			...gate,
			floorTelemetry: createFloorTelemetry(gate),
		});
		expect(entered.run.activeFloor).toBe(6);
		expect(
			entered.floorTelemetry?.floors.find((floor) => floor.floorNumber === 5)
				?.lastExit,
		).toMatchObject({ toFloor: 6, reason: "arena-gate" });
		expect(save(entered).ok).toBe(true);
	});

	it("opens the exit and restores you when nothing in the hall stands, and saves it", () => {
		const entered = enter({
			...atGate(),
			combatTelemetry: emptyCombatTelemetry(),
		});
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
		expect(won.combatTelemetry?.floors[6]?.pressure["arena-cleared"]).toBe(1);
		expect(won.combatTelemetry?.floors[6]?.healing.arena).toBe(
			slain.player.maxHealth - slain.player.health,
		);
		expect(
			act(won).state.combatTelemetry?.floors[6]?.pressure["arena-cleared"],
		).toBe(1);
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
		// The rack offers all four pieces; taking one lays it at your feet and empties it.
		const rack = won.objects.find((o) => o.id === arenaRackId(6));
		if (!rack) throw new Error("Expected the rack");
		const beside = {
			...won,
			run: { ...won.run, playerCoordinate: { row: 7, col: 36 } },
		};
		expect(objectChoices(rack, beside).map((c) => c.value)).toEqual(
			ARENA_REWARD_KINDS.map((kind) => `claim-${kind}`),
		);
		const claimed = act(beside, {
			type: "interact",
			objectId: rack.id,
			choice: "claim-dragon-mail",
		}).state;
		expect(
			claimed.floorItems.find((i) => i.item.id === arenaRewardId(6)),
		).toMatchObject({
			item: { kind: "dragon-mail" },
			coordinate: { row: 7, col: 36 },
		});
		expect(
			act(claimed, {
				type: "interact",
				objectId: rack.id,
				choice: "claim-runeblade",
			}).turnAdvanced,
		).toBe(false);
		expect(save(claimed).ok).toBe(true);
		// A piece without an emptied rack is refused.
		expect(
			save({
				...claimed,
				objects: claimed.objects.map((o) =>
					o.id === rack.id ? { ...o, activated: false } : o,
				),
			}).ok,
		).toBe(false);
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

	it("Iron Juggernaut: steps into your column to charge instead of trailing one over", () => {
		// One column over and five rows down; plain pursuit would walk straight up col 25.
		const start = inHall(
			"iron-juggernaut",
			{ row: 2, col: 24 },
			{ row: 7, col: 25 },
		);
		const lined = act(start).state;
		expect(boss(lined)?.coordinate).toEqual({ row: 7, col: 24 });
		expect(boss(lined)?.intent.type).toBe("idle");
		expect(boss(act(lined).state)?.intent).toEqual({
			type: "preparing-charge",
			target: { row: 2, col: 24 },
		});
		expect(save(lined).ok).toBe(true);
		// Other chargers keep plain pursuit.
		for (const kind of ["horned-charger", "iron-champion"] as const) {
			const other = {
				...start,
				monsters: start.monsters.map((m) =>
					m.id === minibossId(6) ? { ...m, kind } : m,
				),
			};
			expect(boss(act(other).state)?.coordinate).toEqual({ row: 6, col: 25 });
		}
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
		expect(state.arenas).toContainEqual({
			floorNumber: 6,
			miniboss: "broodmother",
		});
		expect(
			state.objects.filter((o) => o.kind === "egg-sac" && o.floorNumber === 6),
		).toHaveLength(4);
		expect(isArenaTerrain(state.run.floors[3].terrain)).toBe(true);
		expect(isArenaTerrain(state.run.floors[4].terrain)).toBe(true);
		// Each arena's gate bars the stair down into it.
		expect(
			state.objects.find((o) => o.id === arenaGateId(4))?.floorNumber,
		).toBe(3);
		expect(
			state.objects.find((o) => o.id === arenaGateId(5))?.coordinate,
		).toEqual(ARENA_DOWN_STAIR);
		// Each fights with the strength it has on floor 12 of a full run.
		for (const floorNumber of [4, 5, 6]) {
			const miniboss = state.monsters.find(
				(m) => m.id === minibossId(floorNumber),
			);
			if (!miniboss) throw new Error("Expected the test seed's miniboss");
			expect(miniboss.health).toBe(maximumMonsterHealth(miniboss.kind, 1, 12));
			expect(actorAttackDamage(miniboss)).toBe(
				monsterAttackDamage(miniboss.kind, 12),
			);
		}
	});
});

describe("Broodmother", () => {
	const withMother = (state: GameState, change: Partial<Monster>) => ({
		...state,
		monsters: state.monsters.map((m) =>
			m.id === minibossId(6) ? { ...m, ...change } : m,
		),
	});
	const hunting = (state: GameState) =>
		withMother(state, {
			awareness: {
				type: "pursuing",
				target: state.run.playerCoordinate,
				remaining: 10,
				blocked: 0,
			},
		});
	const sac = (state: GameState, index: number) =>
		state.objects.find((o) => o.id === eggSacId(6, index));
	const brood = (state: GameState) =>
		state.monsters.filter((m) => m.kind === "spiderling");
	// Far from her, so she neither sees nor reaches you unless told she hunts.
	const hall = () =>
		inHall("broodmother", { row: 2, col: 12 }, { row: 13, col: 31 });

	it("hatches one spiderling per unbroken sac every six turns once she hunts you", () => {
		expect(resolveArenas(hall())).toEqual(hall());
		const clock = resolveArenas(hunting(hall()));
		expect(boss(clock)?.summons).toEqual({ count: 0, turn: clock.turn });
		expect(brood(resolveArenas({ ...clock, turn: clock.turn + 5 }))).toEqual(
			[],
		);
		const due = resolveArenas({
			...clock,
			turn: clock.turn + BROOD_HATCH_INTERVAL,
		});
		expect(brood(due).map((m) => m.id)).toEqual(
			[1, 2, 3, 4].map((count) => arenaSpawnId(6, count)),
		);
		expect(brood(due).every((m) => m.summonedBy === minibossId(6))).toBe(true);
		expect(boss(due)?.summons).toEqual({ count: 4, turn: due.turn });
		expect(due.activityHistory.entries.at(-1)?.event).toMatchObject({
			type: "brood-hatched",
			count: 4,
		});
		expect(save(due).ok).toBe(true);
		// A forged hatchling, or a sac moved off its tile, is rejected.
		expect(
			save({
				...due,
				monsters: due.monsters.map((m) =>
					m.kind === "spiderling" ? { ...m, summonedBy: undefined } : m,
				),
			}).ok,
		).toBe(false);
		expect(
			save({
				...due,
				objects: due.objects.map((o) =>
					o.id === eggSacId(6, 0)
						? { ...o, coordinate: { row: 5, col: 16 } }
						: o,
				),
			}).ok,
		).toBe(false);
	});

	it("breaking a sac with E takes a turn and stops it hatching", () => {
		const beside = {
			...hall(),
			run: { ...hall().run, playerCoordinate: { row: 3, col: 16 } },
		};
		const broken = act(beside, {
			type: "interact",
			objectId: eggSacId(6, 0),
		});
		expect(broken.turnAdvanced).toBe(true);
		expect(sac(broken.state, 0)?.activated).toBe(true);
		const clock = resolveArenas(hunting(broken.state));
		const due = resolveArenas({
			...clock,
			turn: clock.turn + BROOD_HATCH_INTERVAL,
		});
		expect(brood(due)).toHaveLength(3);
		expect(save(due).ok).toBe(true);
	});

	it("a Fireball whose blast covers a sac burns it", () => {
		const clock = resolveArenas(hunting(hall()));
		const due = resolveArenas({
			...clock,
			turn: clock.turn + BROOD_HATCH_INTERVAL,
		});
		// The first hatchling waits just above the first sac.
		const target = brood(due)[0];
		expect(target.coordinate).toEqual({ row: 3, col: 16 });
		const cast = castAreaSpell(
			{ ...due, mana: 50 },
			"fireball",
			target.coordinate,
			hit,
		);
		if ("error" in cast) throw new Error(cast.error);
		expect(sac(cast.state, 0)?.activated).toBe(true);
		expect([1, 2, 3].map((index) => sac(cast.state, index)?.activated)).toEqual(
			[false, false, false],
		);
		expect(
			cast.state.activityHistory.entries.some(
				({ event }) => event.type === "egg-sacs-burned" && event.count === 1,
			),
		).toBe(true);
	});

	it("at half health every unbroken sac bursts at once and she webs without pause, once", () => {
		const mother = boss(hall());
		if (!mother) throw new Error("Expected the Broodmother");
		const halved = withMother(hall(), {
			health: Math.floor(mother.health / 2),
		});
		const burst = act({
			...halved,
			objects: halved.objects.map((o) =>
				o.id === eggSacId(6, 3) ? { ...o, activated: true } : o,
			),
		}).state;
		expect(boss(burst)?.minibossPhase).toBe(2);
		expect(brood(burst)).toHaveLength(3);
		expect([0, 1, 2, 3].every((index) => sac(burst, index)?.activated)).toBe(
			true,
		);
		const webbed = withMother(burst, {
			telegraphTurn: { web: burst.turn },
		});
		const enraged = boss(webbed);
		if (!enraged) throw new Error("Expected the Broodmother");
		expect(telegraphReady(enraged, "web", burst.turn + 1)).toBe(true);
		expect(save(burst).ok).toBe(true);
		// Once only.
		expect(brood(act(burst).state)).toHaveLength(3);
	});
});
