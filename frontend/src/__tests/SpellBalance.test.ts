// @vitest-environment node
import { expect, it } from "vitest";
import { tickAfflictionDamage } from "../domain/game/Afflictions";
import { createGameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { experienceThreshold } from "../domain/game/Progression";
import { castSpell } from "../domain/game/SpellCasting";
import { spellTargetDetails } from "../domain/game/SpellDetails";
import { SPELL_DEFINITIONS, spellPotency } from "../domain/game/Spells";
import { advanceTimedEffects } from "../domain/game/TimedEffects";
import { createTestDungeonFloor } from "./testhelpers";

const rolls = () => ({ d20: () => 20, damage: (min: number) => min });
const arena = () => ({
	...createGameState({
		seed: 123,
		activeFloor: 1,
		playerCoordinate: { row: 7, col: 2 },
		floors: [
			createTestDungeonFloor({
				floorNumber: 1,
				rows: 15,
				cols: 15,
				room: { startRow: 1, endRow: 13, startCol: 1, endCol: 13 },
			}),
		],
	}),
	objects: [],
	floorItems: [],
	mana: 30,
	player: { health: 50, maxHealth: 50 },
	knownSpells: Object.keys(
		SPELL_DEFINITIONS,
	) as (keyof typeof SPELL_DEFINITIONS)[],
	monsters: [
		{
			id: "1:1",
			kind: "orc" as const,
			floorNumber: 1,
			coordinate: { row: 7, col: 5 },
			health: 100,
			intent: { type: "idle" as const },
		},
		{
			id: "1:2",
			kind: "orc" as const,
			floorNumber: 1,
			coordinate: { row: 9, col: 6 },
			health: 100,
			intent: { type: "idle" as const },
		},
		{
			id: "1:3",
			kind: "orc" as const,
			floorNumber: 1,
			coordinate: { row: 10, col: 6 },
			health: 100,
			intent: { type: "idle" as const },
		},
	],
});
it.each([
	["ember-bolt", 8, 12],
	["shock", 10, 16],
	["stone-lance", 12, 18],
	["sonic-spear", 18, 26],
] as const)(
	"%s offers stronger burst and doubles Intelligence scaling",
	(spell, min, max) => {
		const state = arena();
		expect(
			spellPotency(state.progression, SPELL_DEFINITIONS[spell]),
		).toMatchObject({ minimumDamage: min, maximumDamage: max });
		const effects = [
			{
				actorId: "player",
				floorNumber: null,
				kind: "enlightened" as const,
				remaining: 6,
			},
		];
		expect(
			spellPotency(state.progression, SPELL_DEFINITIONS[spell], {}, effects),
		).toMatchObject({ minimumDamage: min + 2, maximumDamage: max + 2 });
		expect(
			spellPotency(
				state.progression,
				SPELL_DEFINITIONS["magic-missile"],
				{},
				effects,
			),
		).toMatchObject({ minimumDamage: 4, maximumDamage: 6 });
	},
);
it("Fireball hits its center harder, reaches radius three and burns its caster once", () => {
	const state = arena();
	const result = castSpell(
		state,
		{ type: "cast", spell: "fireball", targetId: "1:1" },
		rolls,
	);
	if (!("state" in result)) throw new Error(result.error);
	expect(result.state.monsters.map((m) => m.health)).toEqual([84, 92, 100]);
	expect(result.state.player.health).toBe(42);
	expect(result.state.mana).toBe(22);
	expect(
		result.state.activityHistory.entries
			.filter((e) => e.event.type === "player-spell-hit")
			.map((e) => e.event),
	).toEqual([
		{ type: "player-spell-hit", spell: "fireball", damage: 8, turn: 0 },
	]);
	expect(
		castSpell(
			state,
			{ type: "cast", spell: "fireball", targetId: "1:1" },
			rolls,
		),
	).toEqual(result);
});
it("fatal friendly fire commits the cast, enters defeat and skips retaliation and Renewal", () => {
	const state = {
		...arena(),
		player: { health: 8, maxHealth: 50 },
		effects: [
			{
				actorId: "player",
				floorNumber: null,
				kind: "renewing" as const,
				remaining: 4,
			},
		],
	};
	const result = resolvePlayerAction(
		state,
		{ type: "cast", spell: "fireball", targetId: "1:1" },
		rolls,
	);
	expect(result.turnAdvanced).toBe(true);
	expect(result.state.player.health).toBe(0);
	expect(result.state.mana).toBe(22);
	expect(result.state.activityHistory.entries.at(-1)?.event).toEqual({
		type: "player-died",
		turn: 1,
	});
	expect(result.state.effects).toEqual(state.effects);
});
it.each([
	[1, 2, 4],
	[9, 4, 6],
	[20, 6, 8],
])(
	"level %s scales Renewal and poison without scaling player poison",
	(level, healing, poison) => {
		const state = {
			...arena(),
			progression: { experience: experienceThreshold(level) },
			player: { health: 10, maxHealth: 50 },
			effects: [
				{
					actorId: "player",
					floorNumber: null,
					kind: "renewing" as const,
					remaining: 4,
				},
				{
					actorId: "1:1",
					floorNumber: 1,
					kind: "poisoned" as const,
					remaining: 3,
				},
			],
			afflictions: [
				{ kind: "poisoned" as const, remaining: 3, source: "test" },
			],
		};
		// Player poison ticks first (as an affliction), then Renewal and monster poison.
		const next = advanceTimedEffects(tickAfflictionDamage(state));
		expect(next.monsters[0].health).toBe(100 - poison);
		expect(next.player.health).toBe(9 + healing);
	},
);
it("Blink prefers a useful jump of four to ten tiles", () => {
	const state = { ...arena(), monsters: [] };
	const result = castSpell(state, { type: "cast", spell: "blink" }, rolls);
	if (!("state" in result)) throw new Error(result.error);
	const point = result.state.run.playerCoordinate;
	const distance = Math.abs(point.row - 7) + Math.abs(point.col - 2);
	expect(distance).toBeGreaterThanOrEqual(4);
	expect(distance).toBeLessThanOrEqual(10);
});

it("Fireball preview shares the actual splash range and wall-aware danger area", () => {
	const state = arena();
	const details = spellTargetDetails(state, "fireball", state.monsters[0]);
	expect(details).toContain("Damage 16–24");
	expect(details).toContain("Splash 8–12");
	expect(details).toContain("you are inside the blast and take 8–12");
	const safe = {
		...state,
		run: { ...state.run, playerCoordinate: { row: 7, col: 1 } },
	};
	expect(spellTargetDetails(safe, "fireball", safe.monsters[0])).not.toContain(
		"Warning:",
	);
	const result = castSpell(
		safe,
		{ type: "cast", spell: "fireball", targetId: "1:1" },
		rolls,
	);
	if (!("state" in result)) throw new Error(result.error);
	expect(result.state.player.health).toBe(50);
	const terrain = state.run.floors[0].terrain.map((row) => [...row]);
	terrain[8][5] = "#";
	const blocked = {
		...state,
		run: { ...state.run, floors: [{ ...state.run.floors[0], terrain }] },
		monsters: state.monsters.map((m) =>
			m.id === "1:2" ? { ...m, coordinate: { row: 9, col: 5 } } : m,
		),
	};
	const blast = castSpell(
		blocked,
		{ type: "cast", spell: "fireball", targetId: "1:1" },
		rolls,
	);
	if (!("state" in blast)) throw new Error(blast.error);
	expect(blast.state.monsters.find((m) => m.id === "1:2")?.health).toBe(100);
});

it.each([1, 10, 20])(
	"level %s has stronger alternatives in the same seeded encounter",
	(level) => {
		const initial = {
			...arena(),
			progression: { experience: experienceThreshold(level) },
			run: { ...arena().run, playerCoordinate: { row: 7, col: 1 } },
		};
		const hit = (
			spell:
				| "magic-missile"
				| "ember-bolt"
				| "shock"
				| "stone-lance"
				| "sonic-spear",
		) => {
			const result = castSpell(
				initial,
				{ type: "cast", spell, targetId: "1:1" },
				rolls,
			);
			if (!("state" in result)) throw new Error(result.error);
			return (
				100 - (result.state.monsters.find((m) => m.id === "1:1")?.health ?? 0)
			);
		};
		const missile = hit("magic-missile");
		for (const spell of [
			"ember-bolt",
			"shock",
			"stone-lance",
			"sonic-spear",
		] as const)
			expect(hit(spell)).toBeGreaterThan(missile);
	},
);

it("Blink falls back to a close tile when no long jump exists", () => {
	const initial = arena();
	const terrain = initial.run.floors[0].terrain.map((row) =>
		row.map(() => "#"),
	);
	terrain[7][2] = ".";
	terrain[7][3] = ".";
	const state = {
		...initial,
		monsters: [],
		run: { ...initial.run, floors: [{ ...initial.run.floors[0], terrain }] },
	};
	const result = castSpell(state, { type: "cast", spell: "blink" }, rolls);
	if (!("state" in result)) throw new Error(result.error);
	expect(result.state.run.playerCoordinate).toEqual({ row: 7, col: 3 });
	expect(result.state.mana).toBe(26);
});

it("permanent attribute potions preserve the countdown of a longer spell buff", () => {
	const initial = {
		...arena(),
		monsters: [],
		bag: {
			items: [{ id: "strength:bottle", kind: "strength-potion" as const }],
		},
	};
	const action = { type: "consume" as const, itemId: "strength:bottle" };
	const ordinary = resolvePlayerAction(initial, action, rolls).state;
	expect(ordinary.effects).toEqual([]);
	expect(ordinary.progression.permanentAttributes?.strength).toBe(1);
	const buffed = {
		...initial,
		effects: [
			{
				actorId: "player",
				floorNumber: null,
				kind: "strengthened" as const,
				remaining: 15,
			},
		],
	};
	const refreshed = resolvePlayerAction(buffed, action, rolls).state;
	expect(refreshed.effects).toHaveLength(1);
	expect(refreshed.effects[0].remaining).toBe(14);
	expect(refreshed.progression.permanentAttributes?.strength).toBe(1);
});
