// @vitest-environment node
import { expect, it } from "vitest";
import { emptyCombatTelemetry } from "../domain/game/CombatTelemetry";
import { createGameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { SPELL_DEFINITIONS } from "../domain/game/Spells";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";

const lowRolls = () => ({ d20: () => 20, damage: (min: number) => min });

it.each([
	["shock", 5, 10],
	["stone-lance", 6, 12],
	["sonic-spear", 7, 18],
	["drain-life", 6, 4],
] as const)(
	"casts %s with its own cost and damage profile in exactly one turn",
	(spell, cost, damage) => {
		const state = {
			...createGameState(createCorridorEncounter()),
			mana: 10,
			knownSpells: [spell],
			monsters: [
				{
					id: "1:1",
					kind: "orc" as const,
					floorNumber: 1,
					coordinate: { row: 1, col: 3 },
					health: 7,
					intent: { type: "idle" as const },
				},
			],
		};
		const result = resolvePlayerAction(
			state,
			{ type: "cast", spell, targetId: "1:1" },
			lowRolls,
		);
		expect(result.turnAdvanced).toBe(true);
		expect(result.state.turn).toBe(1);
		expect(result.state.mana).toBe(10 - cost);
		expect(result.state.activityHistory.entries[0].event).toMatchObject({
			type: "spell-hit",
			spell,
			damage,
		});
		expect(SPELL_DEFINITIONS[spell].mode).toBe("targeted");
	},
);
it("drains only actual lost monster health, caps healing and resolves it before retaliation", () => {
	const state = {
		...createGameState(createCorridorEncounter()),
		player: { health: 2, maxHealth: 10 },
		combatTelemetry: emptyCombatTelemetry(),
		knownSpells: ["drain-life"] as const,
		monsters: [
			{
				id: "1:1",
				kind: "goblin" as const,
				floorNumber: 1,
				coordinate: { row: 1, col: 2 },
				health: 1,
				intent: { type: "idle" as const },
			},
		],
	};
	const after = resolvePlayerAction(
		state,
		{ type: "cast", spell: "drain-life", targetId: "1:1" },
		lowRolls,
	).state;
	expect(after.player.health).toBe(3);
	expect(after.combatTelemetry?.floors[1]?.healing["drain-life"]).toBe(1);
	expect(after.monsters).toEqual([]);
	expect(
		after.activityHistory.entries.some(
			(e) => e.event.type === "spell-healed" && e.event.recovered === 1,
		),
	).toBe(true);
});

it("caps life drain to missing health and heals before a surviving enemy acts", () => {
	const initial = createGameState(createCorridorEncounter());
	const target = {
		id: "1:1",
		kind: "goblin" as const,
		floorNumber: 1,
		coordinate: { row: 1, col: 3 },
		health: 4,
		intent: { type: "idle" as const },
	};
	const almostFull = {
		...initial,
		player: { health: 9, maxHealth: 10 },
		knownSpells: ["drain-life"] as const,
		monsters: [target],
	};
	expect(
		resolvePlayerAction(
			almostFull,
			{ type: "cast", spell: "drain-life", targetId: "1:1" },
			lowRolls,
		).state.player.health,
	).toBe(10);
	const surrounded = {
		...almostFull,
		player: { health: 2, maxHealth: 10 },
		monsters: [
			target,
			{
				...target,
				id: "1:2",
				kind: "orc" as const,
				coordinate: { row: 1, col: 2 },
				health: 7,
			},
		],
	};
	const after = resolvePlayerAction(
		surrounded,
		{ type: "cast", spell: "drain-life", targetId: "1:1" },
		lowRolls,
	).state;
	expect(after.player.health).toBe(4);
	const messages = after.activityHistory.entries.map(
		(entry) => entry.event.type,
	);
	expect(messages.indexOf("spell-healed")).toBeLessThan(
		messages.indexOf("monster-hit"),
	);
});
