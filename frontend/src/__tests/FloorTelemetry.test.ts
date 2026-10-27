// @vitest-environment node
import { expect, it } from "vitest";
import { createAdventureSession } from "../components/game/useAdventureSession";
import {
	DEFAULT_FOG_CONFIGURATION,
	DEFAULT_RUN_CONFIGURATION,
} from "../domain/dungeon/RunConfiguration";
import { emptyCombatTelemetry } from "../domain/game/CombatTelemetry";
import {
	captureCheckpoint,
	createFloorTelemetry,
	recordFloorTransition,
} from "../domain/game/FloorTelemetry";
import type { GameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { USAGE_CONSUMABLE_KINDS } from "../domain/game/RunUsage";
import { createBag, MAX_BAG_ITEMS } from "../domain/items/Bag";
import {
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { TOWN } from "../domain/town/TownDefinition";
import { createTownLocation } from "../domain/town/TownLocation";
import { bruteEncounter } from "./BruteTestHelpers";
import { resolvePlayerActionWithHits } from "./ControlledCombatTestHelpers";
import { tacticalSnapshot } from "./TacticalReplayTestHelpers";
import { COMPACT_TEST_CONFIGURATION as config } from "./TestRunConfiguration";

const track = (state: GameState): GameState => ({
	...state,
	floorTelemetry: createFloorTelemetry(state),
});
const game = () => track({ ...bruteEncounter(), monsters: [], objects: [] });
const act = (
	state: GameState,
	action: Parameters<typeof resolvePlayerAction>[1],
) => resolvePlayerActionWithHits(state, action).state;
const floor = (state: GameState, number: number) =>
	state.floorTelemetry?.floors.find((f) => f.floorNumber === number);

it("starts in town with no reached floors, records the first descent, and ignores ordinary/free actions", () => {
	const session = createAdventureSession(
		123,
		config,
		DEFAULT_FOG_CONFIGURATION,
	);
	expect(session.state.floorTelemetry).toEqual({
		activeFloor: null,
		floors: [],
	});
	const atGate = {
		...session.state,
		town: { ...createTownLocation(), coordinate: TOWN.gate },
		monsters: [],
	};
	const entered = act(atGate, { type: "travel", destination: "dungeon" });
	expect(floor(entered, 1)).toEqual({
		floorNumber: 1,
		visits: 1,
		firstEntry: captureCheckpoint(entered),
	});
	expect(entered.floorTelemetry?.activeFloor).toBe(1);
	expect(act(entered, { type: "wait" }).floorTelemetry).toBe(
		entered.floorTelemetry,
	);
	expect(act(entered, { type: "clear-hotbar", slot: 1 }).floorTelemetry).toBe(
		entered.floorTelemetry,
	);
});
it("captures stair entry before the new floor's retaliation, and retains first entry on revisits", () => {
	const start = track({
		...bruteEncounter(),
		objects: [],
		monsters: [
			{
				id: "5:1",
				kind: "orc",
				health: 7,
				floorNumber: 5,
				coordinate: { row: 1, col: 2 },
				intent: { type: "idle" },
			},
		],
		run: { ...bruteEncounter().run, playerCoordinate: { row: 13, col: 12 } },
	});
	const arrived = act(start, { type: "move", direction: "right" });
	expect(arrived.run.activeFloor).toBe(5);
	expect(floor(arrived, 4)?.lastExit).toEqual({
		toFloor: 5,
		reason: "stairs",
		snapshot: captureCheckpoint(start),
	});
	expect(floor(arrived, 5)?.firstEntry.turn).toBe(1);
	expect(floor(arrived, 5)?.firstEntry.health).toBe(start.player.health);
	expect(arrived.player.health).toBeLessThan(start.player.health);
	const returned = act(
		{
			...arrived,
			monsters: [],
			run: { ...arrived.run, playerCoordinate: { row: 1, col: 2 } },
		},
		{ type: "move", direction: "left" },
	);
	expect(floor(returned, 4)?.visits).toBe(2);
	expect(floor(returned, 4)?.firstEntry).toEqual(floor(start, 4)?.firstEntry);
	expect(returned.floorTelemetry?.floors).toHaveLength(2);
});
it("closes a portal-scroll visit after its committed turn and records free return as a revisit", () => {
	const start = track({
		...game(),
		bag: createBag([{ id: "portal", kind: "exit-scroll" }]),
		combatTelemetry: emptyCombatTelemetry(),
	});
	const exited = act(start, { type: "exit-dungeon", itemId: "portal" });
	expect(floor(exited, 4)?.lastExit).toEqual({
		toFloor: null,
		reason: "town-scroll",
		snapshot: captureCheckpoint(exited),
	});
	expect(floor(exited, 4)?.lastExit?.snapshot.supplies).toEqual({});
	expect(floor(exited, 4)?.lastExit?.snapshot.turn).toBe(1);
	expect(exited.floorTelemetry?.activeFloor).toBeNull();
	const returned = act(exited, { type: "return-town-portal" });
	expect(returned.turn).toBe(exited.turn);
	expect(
		exited.combatTelemetry?.floors[4]?.usage.consumables["exit-scroll"],
	).toBe(1);
	expect(exited.combatTelemetry?.town.usage.consumables).toEqual({});
	expect(exited.combatTelemetry?.floors[4]?.pressure["town-scroll-used"]).toBe(
		1,
	);
	expect(
		returned.combatTelemetry?.floors[4]?.pressure["town-portal-returned"],
	).toBe(1);
	expect(floor(returned, 4)?.visits).toBe(2);
	expect(floor(returned, 4)?.firstEntry.supplies).toEqual({ "exit-scroll": 1 });
});
it("records gate exits and returns without inventing dungeon turns", () => {
	const session = createAdventureSession(
		123,
		config,
		DEFAULT_FOG_CONFIGURATION,
	);
	const enter = (s: GameState) =>
		act(
			{ ...s, town: { ...createTownLocation(), coordinate: TOWN.gate } },
			{ type: "travel", destination: "dungeon" },
		);
	const first = enter({ ...session.state, monsters: [] });
	const exited = act(first, { type: "travel", destination: "town" });
	expect(floor(exited, 1)?.lastExit?.reason).toBe("town-gate");
	const returned = enter(exited);
	expect(returned.turn).toBe(0);
	expect(floor(returned, 1)?.visits).toBe(2);
});
it("records death exactly once without inventing an exit", () => {
	const start = track({
		...bruteEncounter(),
		player: { health: 1, maxHealth: 10 },
		monsters: [
			{
				id: "4:1",
				kind: "orc",
				health: 7,
				floorNumber: 4,
				coordinate: { row: 4, col: 5 },
				intent: { type: "idle" },
			},
		],
	});
	const died = act(start, { type: "wait" });
	expect(died.player.health).toBe(0);
	expect(died.floorTelemetry?.final).toEqual({
		floorNumber: 4,
		outcome: "died",
		snapshot: captureCheckpoint(died),
	});
	expect(died.floorTelemetry?.activeFloor).toBeNull();
	expect(floor(died, 4)?.lastExit).toBeUndefined();
	expect(act(died, { type: "wait" }).floorTelemetry).toBe(died.floorTelemetry);
	const document = tacticalSnapshot(died);
	expect(parseSave(serializeSave(document)).ok).toBe(true);
	const final = document.state.floorTelemetry?.final;
	if (!final) throw Error("Expected final checkpoint");
	final.snapshot.gold++;
	expect(parseSave(serializeSave(document)).ok).toBe(false);
});
it("records homecoming as a final victory checkpoint", () => {
	const base = {
		...game(),
		run: {
			...game().run,
			activeFloor: 1,
			playerCoordinate: { row: 1, col: 2 },
		},
	};
	const start = track({
		...base,
		quest: { ...base.quest, entrance: { row: 1, col: 1 }, cureRecovered: true },
	});
	const won = act(start, { type: "move", direction: "left" });
	expect(won.quest.victory).toBeTruthy();
	expect(won.floorTelemetry?.final).toEqual({
		floorNumber: 1,
		outcome: "won",
		snapshot: captureCheckpoint(won),
	});
	expect(won.floorTelemetry?.activeFloor).toBeNull();
});
it("freezes actual checkpoint values, and continues identically across save/load mid-floor", () => {
	const start = track({
		...game(),
		bag: createBag([{ id: "review:portal", kind: "exit-scroll" }]),
	});
	const first = structuredClone(floor(start, 4)?.firstEntry);
	const played = act(start, { type: "wait" });
	const saved = tacticalSnapshot(played);
	const parsed = parseSave(serializeSave(saved));
	expect(parsed.ok, parsed.ok ? undefined : parsed.error).toBe(true);
	if (!parsed.ok) return;
	const loaded = restoreSave(parsed.value).state;
	expect(loaded.floorTelemetry).toEqual(played.floorTelemetry);
	expect(
		act(loaded, { type: "exit-dungeon", itemId: "review:portal" }),
	).toEqual(act(played, { type: "exit-dungeon", itemId: "review:portal" }));
	expect(floor(start, 4)?.firstEntry).toEqual(first);
	delete saved.state.floorTelemetry;
	const old = parseSave(serializeSave(saved));
	expect(old.ok).toBe(true);
	if (!old.ok) return;
	expect(
		act(restoreSave(old.value).state, { type: "wait" }).floorTelemetry,
	).toBeUndefined();
});
it("does not alter seeded gameplay outcomes", () => {
	let tracked = track(bruteEncounter()),
		untracked = { ...tracked };
	delete untracked.floorTelemetry;
	for (const action of [
		{ type: "wait" },
		{ type: "cast", spell: "magic-missile", targetId: "4:1" },
	] as const) {
		tracked = resolvePlayerAction(tracked, action).state;
		untracked = resolvePlayerAction(untracked, action).state;
		const { floorTelemetry, ...actual } = tracked;
		expect(actual).toEqual(untracked);
		expect(floorTelemetry).toBeTruthy();
	}
});
it("bounds repeated visits to one record per reached floor and a fixed checkpoint size", () => {
	const session = createAdventureSession(
		7358,
		DEFAULT_RUN_CONFIGURATION,
		DEFAULT_FOG_CONFIGURATION,
	);
	let state = track({ ...session.state, town: null });
	for (let visit = 0; visit < 200; visit++) {
		const next = {
			...state,
			turn: state.turn + 1,
			run: { ...state.run, activeFloor: (visit % 20) + 1 },
		};
		state = recordFloorTransition(state, next, "runic-portal");
	}
	expect(state.floorTelemetry?.floors).toHaveLength(20);
	expect(
		Math.max(...(state.floorTelemetry?.floors.map((f) => f.visits) ?? [])),
	).toBeGreaterThan(1);
	expect(
		new TextEncoder().encode(JSON.stringify(state.floorTelemetry)).byteLength,
	).toBeLessThan(128 * 1024);
});
it("rejects malformed, duplicated, out-of-range and future checkpoint data", () => {
	const saved = tacticalSnapshot(game());
	const telemetry = saved.state.floorTelemetry;
	if (!telemetry) throw Error("Expected tracked fixture");
	const entry = telemetry.floors[0];
	for (const bad of [
		{ ...telemetry, floors: [entry, entry] },
		{ ...telemetry, activeFloor: 20 },
		{ ...telemetry, floors: [{ ...entry, visits: 0 }] },
		{ ...telemetry, floors: [{ ...entry, floorNumber: 20 }] },
		{
			...telemetry,
			floors: [{ ...entry, firstEntry: { ...entry.firstEntry, turn: 1 } }],
		},
		{
			...telemetry,
			floors: [
				{
					...entry,
					firstEntry: { ...entry.firstEntry, supplies: { "iron-sword": 1 } },
				},
			],
		},
	])
		expect(
			parseSave(
				JSON.stringify({
					...saved,
					state: { ...saved.state, floorTelemetry: bad },
				}),
			).ok,
		).toBe(false);
});
it("captures carried supplies, equipped kinds/enchants and actual derived resources without physical IDs", () => {
	const start = {
		...game(),
		gold: 123,
		mana: 4,
		player: { health: 7, maxHealth: 10 },
		bag: createBag([
			{ id: "p1", kind: "healing-potion" },
			{ id: "p2", kind: "healing-potion" },
			{ id: "s", kind: "enchantment-scroll" },
		]),
	};
	const point = captureCheckpoint(start);
	expect(point).toMatchObject({
		turn: 0,
		level: 1,
		experience: 0,
		attributes: { strength: 10, dexterity: 10, intelligence: 10 },
		attack: 2,
		armor: 1,
		evadeChance: 20,
		magicResistance: 5,
		health: 7,
		maxHealth: 10,
		mana: 4,
		maxMana: 10,
		gold: 123,
		supplies: { "healing-potion": 2, "enchantment-scroll": 1 },
		equipment: { mainHand: { kind: "short-sword", enchantment: 0 } },
	});
	expect(JSON.stringify(point)).not.toContain("starting:");
	const changed = act(track(start), {
		type: "enchant",
		scrollId: "s",
		targetItemId: "starting:main-hand",
	});
	expect(changed.equipment.mainHand?.enchantment).toBe(1);
	expect(floor(changed, 4)?.firstEntry).toEqual(point);
});
it("keeps catalog-wide extreme checkpoints under 128 KiB for twenty floors and a final", () => {
	const maximum = Number.MAX_SAFE_INTEGER;
	const point = {
		...captureCheckpoint(game()),
		turn: maximum,
		level: 20,
		experience: maximum,
		attributes: {
			strength: maximum,
			dexterity: maximum,
			intelligence: maximum,
		},
		attack: maximum,
		armor: maximum,
		health: maximum,
		maxHealth: maximum,
		mana: maximum,
		maxMana: maximum,
		gold: maximum,
		supplies: Object.fromEntries(
			USAGE_CONSUMABLE_KINDS.map((kind) => [
				kind,
				Math.floor(MAX_BAG_ITEMS / USAGE_CONSUMABLE_KINDS.length),
			]),
		),
		equipment: {
			mainHand: { kind: "star-forged-blade", enchantment: 3 },
			offHand: { kind: "spellguard-shield", enchantment: 3 },
			chest: { kind: "shadowweave-cloak", enchantment: 3 },
			head: { kind: "seers-circlet", enchantment: 3 },
			leftRing: { kind: "ring-of-displacement", enchantment: 0 },
			rightRing: { kind: "ring-intelligence", enchantment: 0 },
		},
	};
	const worst = {
		activeFloor: null,
		floors: Array.from({ length: 20 }, (_, i) => ({
			floorNumber: i + 1,
			visits: maximum,
			firstEntry: point,
			lastExit: { toFloor: null, reason: "town-scroll", snapshot: point },
		})),
		final: {
			floorNumber: 20,
			outcome: "died",
			snapshot: { ...point, health: 0 },
		},
	};
	expect(
		new TextEncoder().encode(JSON.stringify(worst)).byteLength,
	).toBeLessThan(128 * 1024);
});
it("keeps historical derived values frozen instead of applying later balance rules on load", () => {
	const start = track({
		...bruteEncounter(),
		player: { health: 1, maxHealth: 10 },
		monsters: [
			{
				id: "4:1",
				kind: "orc" as const,
				health: 7,
				floorNumber: 4,
				coordinate: { row: 4, col: 5 },
				intent: { type: "idle" as const },
			},
		],
	});
	const document = tacticalSnapshot(act(start, { type: "wait" }));
	const final = document.state.floorTelemetry?.final;
	if (!final) throw Error("Expected terminal checkpoint");
	final.snapshot.gameVersion = "0.2.0-alpha";
	final.snapshot.armor = 4;
	final.snapshot.maxMana = 11;
	const parsed = parseSave(serializeSave(document));
	expect(parsed.ok, parsed.ok ? undefined : parsed.error).toBe(true);
	if (!parsed.ok) return;
	expect(
		restoreSave(parsed.value).state.floorTelemetry?.final?.snapshot,
	).toMatchObject({ gameVersion: "0.2.0-alpha", armor: 4, maxMana: 11 });
});
