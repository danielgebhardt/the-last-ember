// @vitest-environment node
import { expect, it } from "vitest";
import {
	type ActivityEvent,
	appendActivityEvents,
} from "../domain/game/ActivityHistory";
import { AFFLICTION_DEFINITIONS } from "../domain/game/AfflictionDefinitions";
import {
	applyPlayerAffliction,
	tickAfflictionDamage,
} from "../domain/game/Afflictions";
import {
	type CombatMetrics,
	type CombatTelemetry,
	DAMAGE_SOURCES,
	emptyCombatMetrics,
	emptyCombatTelemetry,
	HEALING_SOURCES,
	PRESSURE_EVENTS,
	recordMonsterDamageBatch,
	recordOmen,
	recordPact,
	recordPressure,
} from "../domain/game/CombatTelemetry";
import type { GameState } from "../domain/game/GameState";
import { damageMonster } from "../domain/game/MonsterDamage";
import { OMEN_KINDS } from "../domain/game/Omens";
import { PACT_KINDS } from "../domain/game/Pacts";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import {
	emptyRunEncounters,
	recordRunEncounters,
} from "../domain/game/RunEncounters";
import {
	USAGE_CONSUMABLE_KINDS,
	USAGE_EQUIPMENT_KINDS,
} from "../domain/game/RunUsage";
import { SPELL_DEFINITIONS } from "../domain/game/Spells";
import { advanceTimedEffects } from "../domain/game/TimedEffects";
import { createBag } from "../domain/items/Bag";
import { MONSTER_DEFINITIONS } from "../domain/monsters/Monster";
import { drawFountain } from "../domain/objects/DungeonFountains";
import { objectDamage } from "../domain/objects/ObjectEffects";
import {
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { sanctuaryQuote, treatAtSanctuary } from "../domain/town/Sanctuary";
import { createTownLocation } from "../domain/town/TownLocation";
import { bruteEncounter } from "./BruteTestHelpers";
import { resolvePlayerActionWithHits } from "./ControlledCombatTestHelpers";
import {
	mixedEncounter,
	mixedFollowUp,
	tacticalSnapshot,
} from "./TacticalReplayTestHelpers";

it("counts actual lethal HP loss and its source once, without changing combat", () => {
	const raw = bruteEncounter();
	const base = {
		...raw,
		monsters: raw.monsters.map((m) => ({
			...m,
			kind: "orc" as const,
			health: 7,
		})),
	};
	const state = {
		...base,
		player: { ...base.player, health: 1 },
		combatTelemetry: emptyCombatTelemetry(),
	};
	const result = resolvePlayerActionWithHits(state, { type: "wait" }).state;
	expect(result.player.health).toBe(0);
	expect(result.combatTelemetry?.floors[4]?.damage.melee).toBe(1);
	expect(result.combatTelemetry?.floors[4]?.death).toEqual({
		source: "melee",
		monster: "orc",
	});
	expect(parseSave(serializeSave(tacticalSnapshot(result))).ok).toBe(true);
	expect(
		resolvePlayerActionWithHits(result, { type: "wait" }).state.combatTelemetry,
	).toBe(result.combatTelemetry);
	const { combatTelemetry: _, ...actual } = result;
	expect(actual).toEqual(
		resolvePlayerActionWithHits(
			{ ...base, player: state.player },
			{ type: "wait" },
		).state,
	);
});

it("counts each confirmed defeat, including heroic and summoned enemies, only once", () => {
	const base = bruteEncounter();
	const monster = { ...base.monsters[0], heroic: true, health: 1 };
	const state = {
		...base,
		monsters: [monster],
		combatTelemetry: emptyCombatTelemetry(),
	};
	const killed = damageMonster(state, monster, 100, { type: "player-hit" });
	expect(killed.combatTelemetry?.floors[4]?.defeated[monster.kind]).toBe(1);
	expect(killed.combatTelemetry?.floors[4]?.heroicDefeated).toBe(1);
	expect(damageMonster(killed, monster, 100, { type: "player-hit" })).toBe(
		killed,
	);
	const summoned = { ...monster, id: "4:2", heroic: false, summonedBy: "4:3" };
	const second = damageMonster(
		{ ...killed, monsters: [summoned] },
		summoned,
		10,
		{ type: "condition-hit", condition: "poisoned" },
	);
	expect(second.combatTelemetry?.floors[4]?.summonedDefeated).toBe(1);
	expect(second.combatTelemetry?.floors[4]?.defeated[monster.kind]).toBe(2);
});

const game = () => ({
	...bruteEncounter(),
	monsters: [],
	objects: [],
	combatTelemetry: emptyCombatTelemetry(),
});
const act = resolvePlayerActionWithHits;
const metrics = (state: GameState) => state.combatTelemetry?.floors[4];

it("uses untruncated phase batches, separates ranged/spell/melee damage, and caps overkill", () => {
	const state = game();
	const events: ActivityEvent[] = [
		{ type: "monster-shot-hit", monster: "goblin-archer", damage: 2, turn: 1 },
		...Array.from(
			{ length: 120 },
			(): ActivityEvent => ({
				type: "monster-missed",
				monster: "orc",
				turn: 1,
			}),
		),
		{
			type: "monster-spell-hit",
			monster: "orc",
			spell: "shock",
			damage: 3,
			turn: 1,
		},
		{
			type: "monster-heavy-hit",
			monster: "dungeon-brute",
			damage: 1000,
			turn: 1,
		},
	];
	const result = recordMonsterDamageBatch(state, events);
	expect(result.player).toBe(state.player);
	expect(metrics(result)?.damage).toEqual({
		ranged: 2,
		spell: 3,
		melee: state.player.health - 5,
	});
	expect(metrics(result)?.death).toEqual({
		source: "melee",
		monster: "dungeon-brute",
	});
});

it("records trap/object/condition loss at their effects and identifies lethal poison", () => {
	let state = game();
	state = objectDamage(state, 2, {
		type: "trap-sprung",
		damage: 2,
		turn: 0,
	}) as typeof state;
	state = objectDamage(state, 1, {
		type: "throne-wound",
		damage: 1,
		turn: 0,
	}) as typeof state;
	state = applyPlayerAffliction(state, "poisoned", "test") as typeof state;
	const poisoned = tickAfflictionDamage({
		...state,
		player: { ...state.player, health: 1 },
	});
	expect(metrics(poisoned)?.damage).toMatchObject({
		trap: 2,
		object: 1,
		condition: 1,
	});
	expect(metrics(poisoned)?.damageByCondition).toEqual({ poisoned: 1 });
	expect(metrics(poisoned)?.death).toEqual({
		source: "condition",
		condition: "poisoned",
	});
});

it("counts effective potion healing separately from same-turn retaliation, and ignores rejected use", () => {
	const raw = game();
	const state = {
		...raw,
		player: { ...raw.player, health: 5 },
		bag: createBag([{ id: "heal", kind: "healing-potion" }]),
		monsters: [{ ...bruteEncounter().monsters[0], kind: "orc" as const }],
	};
	const healed = act(state, { type: "consume", itemId: "heal" }).state;
	expect(metrics(healed)?.healing.potion).toBe(
		Math.min(15, state.player.maxHealth - 5),
	);
	expect(metrics(healed)?.damage.melee).toBeGreaterThan(0);
	expect(metrics(healed)?.usage.consumables).toEqual({ "healing-potion": 1 });
	expect(act(healed, { type: "consume", itemId: "heal" }).state).toBe(healed);
});

it("counts actual Heal, Renewal and fountain recovery, excluding wasted healing", () => {
	const raw = game();
	const start = {
		...raw,
		knownSpells: ["heal" as const],
		mana: 100,
		player: { ...raw.player, health: raw.player.maxHealth - 1 },
	};
	const healed = act(start, { type: "cast", spell: "heal" }).state;
	expect(metrics(healed)?.healing.spell).toBe(1);
	expect(metrics(healed)?.usage.casts.heal).toBe(1);
	expect(act(healed, { type: "cast", spell: "heal" }).state).toBe(healed);
	const renewed = advanceTimedEffects({
		...healed,
		player: { ...healed.player, health: healed.player.maxHealth - 1 },
		effects: [
			{ actorId: "player", floorNumber: 4, kind: "renewing", remaining: 2 },
		],
	});
	expect(metrics(renewed)?.healing.renewal).toBe(1);
	const fountain = {
		id: "fountain",
		kind: "fountain" as const,
		floorNumber: 4,
		coordinate: start.run.playerCoordinate,
		activated: false,
	};
	const drawn = drawFountain(
		{
			...renewed,
			objects: [fountain],
			player: { ...renewed.player, health: renewed.player.maxHealth - 2 },
		},
		fountain,
		"sip",
	);
	if ("error" in drawn) throw Error(drawn.error);
	expect(metrics(drawn)?.healing.fountain).toBe(2);
});

it("measures Field medic healing after a disease cure restores health capacity", () => {
	const raw = game();
	const diseased = applyPlayerAffliction(
		{
			...raw,
			progression: {
				...raw.progression,
				perks: [{ level: 3, perk: "field-medic" }],
			},
		},
		"disease",
		"rat",
	);
	expect(diseased.player.health).toBe(diseased.player.maxHealth);
	const state = {
		...diseased,
		bag: createBag([{ id: "remedy", kind: "cure-disease-potion" }]),
	};
	const cured = act(state, { type: "consume", itemId: "remedy" }).state;
	expect(cured.player.health).toBeGreaterThan(state.player.health);
	expect(metrics(cured)?.healing.potion).toBe(
		cured.player.health - state.player.health,
	);
});

it("keeps sanctuary healing and town consumption separate from dungeon floors", () => {
	const raw = game();
	const state = {
		...raw,
		town: { ...createTownLocation(), coordinate: { row: 5, col: 7 } },
		gold: 1000,
		player: { ...raw.player, health: raw.player.maxHealth - 3 },
	};
	const treated = treatAtSanctuary(state, {
		type: "sanctuary-treatment",
		quote: sanctuaryQuote(state, "health"),
	});
	expect("error" in treated).toBe(false);
	expect(treated.state.combatTelemetry?.town.healing.sanctuary).toBe(3);
	expect(treated.state.combatTelemetry?.floors).toEqual({});
	const beforePotion = {
		...treated.state,
		player: {
			...treated.state.player,
			health: treated.state.player.maxHealth - 1,
		},
		bag: createBag([{ id: "town-heal", kind: "healing-potion" }]),
	};
	const potion = act(beforePotion, { type: "consume", itemId: "town-heal" });
	expect(potion.turnAdvanced).toBe(false);
	expect(potion.state.combatTelemetry?.town.healing.potion).toBe(1);
	expect(
		potion.state.combatTelemetry?.town.usage.consumables["healing-potion"],
	).toBe(1);
	expect(potion.state.combatTelemetry?.floors).toEqual({});
});

it("retains encounter facts and counts each thief only on first visibility", () => {
	const raw = game();
	const thief = {
		...bruteEncounter().monsters[0],
		kind: "treasure-thief" as const,
	};
	const state = {
		...raw,
		encounters: emptyRunEncounters(0),
		monsters: [thief],
	};
	const seen = recordRunEncounters(state, state);
	expect(metrics(seen)?.pressure["thief-met"]).toBe(1);
	expect(recordRunEncounters(seen, seen)).toBe(seen);
	let announced = recordOmen(seen, "echoing-halls");
	announced = recordOmen(announced, "echoing-halls");
	announced = recordPact(announced, "ash");
	announced = recordPressure(announced, "mimic-revealed");
	expect(metrics(announced)?.omens).toEqual({ "echoing-halls": 1 });
	expect(metrics(announced)?.pacts).toEqual({ ash: 1 });
	const rolled = {
		...announced,
		activityHistory: appendActivityEvents(
			announced.activityHistory,
			Array.from(
				{ length: 120 },
				(): ActivityEvent => ({
					type: "monster-missed",
					monster: "orc",
					turn: 0,
				}),
			),
		),
	};
	expect(rolled.combatTelemetry).toEqual(announced.combatTelemetry);
});

it("attributes upward stairs to the departed floor and equipped time to the arrival floor", () => {
	const raw = game();
	const state = {
		...raw,
		run: { ...raw.run, playerCoordinate: { row: 1, col: 2 } },
	};
	const result = act(state, { type: "move", direction: "left" }).state;
	expect(result.run.activeFloor).toBe(3);
	expect(result.combatTelemetry?.floors[4]?.pressure["upward-stairs"]).toBe(1);
	expect(result.combatTelemetry?.floors[3]?.usage.equippedTurns).toEqual(
		result.usage?.equippedTurns,
	);
	expect(result.combatTelemetry?.floors[4]?.usage.equippedTurns).toEqual({});
});

it("preserves counters and deterministic continuation through save/load; absent old metrics stay absent", () => {
	const raw = game();
	const state = {
		...raw,
		player: { ...raw.player, health: 5 },
		bag: createBag([{ id: "heal", kind: "healing-potion" }]),
	};
	const first = act(state, { type: "consume", itemId: "heal" }).state;
	const document = tacticalSnapshot(first);
	const parsed = parseSave(serializeSave(document));
	expect(parsed.ok).toBe(true);
	if (!parsed.ok) return;
	const loaded = restoreSave(parsed.value).state;
	expect(act(loaded, { type: "wait" }).state).toEqual(
		act(first, { type: "wait" }).state,
	);
	delete document.state.combatTelemetry;
	const old = restoreSave(document).state;
	expect(act(old, { type: "wait" }).state.combatTelemetry).toBeUndefined();
});

it("rejects unknown sources, impossible floors, negative counters and inconsistent usage/deaths", () => {
	const state = act(game(), { type: "wait" }).state;
	const document = tacticalSnapshot(state);
	const changes: ((
		telemetry: CombatTelemetry,
		floor: CombatMetrics,
	) => void)[] = [
		(_t, m) => {
			(m.damage as Record<string, number>).unknown = 1;
		},
		(t, m) => {
			t.floors[21] = m;
		},
		(_t, m) => {
			m.healing.potion = -1;
		},
		(_t, m) => {
			m.usage.casts.heal = 2;
		},
		(_t, m) => {
			m.death = { source: "melee" };
		},
	];
	for (const change of changes) {
		const modified = structuredClone(document);
		const telemetry = modified.state.combatTelemetry,
			floor = telemetry?.floors[4];
		if (!telemetry || !floor) throw Error("Expected tracked floor");
		change(telemetry, floor);
		expect(parseSave(serializeSave(modified)).ok).toBe(false);
	}
});

it("preserves seeded gameplay and all counters when a combat sequence continues after reload", () => {
	const base = mixedEncounter();
	let tracked: GameState = { ...base, combatTelemetry: emptyCombatTelemetry() };
	let plain = base;
	for (const action of [{ type: "wait" } as const, ...mixedFollowUp]) {
		tracked = resolvePlayerAction(tracked, action).state;
		plain = resolvePlayerAction(plain, action).state;
		const { combatTelemetry: _, ...gameplay } = tracked;
		expect(gameplay).toEqual(plain);
		const parsed = parseSave(serializeSave(tacticalSnapshot(tracked)));
		expect(parsed.ok).toBe(true);
		if (!parsed.ok) return;
		tracked = restoreSave(parsed.value).state;
	}
});

it("bounds twenty fully populated floor counter maps under 128 KiB independently of run duration", () => {
	const count = Number.MAX_SAFE_INTEGER;
	const counts = (keys: readonly string[]) =>
		Object.fromEntries(keys.map((k) => [k, count]));
	const full = {
		...emptyCombatMetrics(),
		damage: counts(DAMAGE_SOURCES),
		damageByMonster: counts(Object.keys(MONSTER_DEFINITIONS)),
		damageByCondition: counts(Object.keys(AFFLICTION_DEFINITIONS)),
		healing: counts(HEALING_SOURCES),
		defeated: counts(Object.keys(MONSTER_DEFINITIONS)),
		pressure: counts(PRESSURE_EVENTS),
		omens: Object.fromEntries(OMEN_KINDS.map((k) => [k, 1])),
		pacts: counts(PACT_KINDS),
		usage: {
			casts: counts(Object.keys(SPELL_DEFINITIONS)),
			consumables: counts(USAGE_CONSUMABLE_KINDS),
			equippedTurns: counts(USAGE_EQUIPMENT_KINDS),
		},
	};
	const telemetry = {
		town: full,
		floors: Object.fromEntries(
			Array.from({ length: 20 }, (_, i) => [i + 1, full]),
		),
	};
	expect(
		new TextEncoder().encode(JSON.stringify(telemetry)).length,
	).toBeLessThan(128 * 1024);
});
