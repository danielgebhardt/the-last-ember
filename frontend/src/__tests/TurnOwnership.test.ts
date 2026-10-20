// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createGameState, type GameState } from "../domain/game/GameState";
import { damageMonster } from "../domain/game/MonsterDamage";
import {
	type PlayerAction,
	resolvePlayerAction,
} from "../domain/game/PlayerActions";
import { castSpell } from "../domain/game/SpellCasting";
import { createBag } from "../domain/items/Bag";
import { predictableAttackRolls } from "./ControlledCombatTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";

// Turn 29 tests recovery on the next turn. The adjacent goblin survives
// either attack so an extra monster phase would cause observable damage.
const encounter = (): GameState => {
	const initial = createGameState(createCorridorEncounter());
	return {
		...initial,
		run: { ...initial.run, playerCoordinate: { row: 1, col: 3 } },
		turn: 29,
		player: { health: 5, maxHealth: 10 },
		mana: 5,
		bag: createBag([
			{ id: "bag:potion", kind: "healing-potion" },
			{ id: "bag:sword", kind: "iron-sword" },
		]),
		potionHotbar: ["healing-potion", null, null, null],
		floorItems: [
			{
				item: { id: "ground:potion", kind: "healing-potion" },
				floorNumber: 1,
				coordinate: { row: 1, col: 3 },
			},
		],
		monsters: [
			{
				intent: { type: "idle" as const },
				id: "1:1",
				kind: "goblin",
				floorNumber: 1,
				coordinate: { row: 1, col: 4 },
				health: 9,
			},
		],
	};
};

describe("Effect helpers use the already committed turn", () => {
	it("applies two damage effects and records both on the same committed turn", () => {
		const committed = { ...encounter(), turn: 30 };
		const first = damageMonster(committed, committed.monsters[0], 1, {
			type: "player-hit",
		});
		const second = damageMonster(first, first.monsters[0], 1, {
			type: "spell-hit",
			spell: "magic-missile",
		});
		expect(second.turn).toBe(30);
		expect(second.monsters[0].health).toBe(7);
		expect(second.activityHistory.entries.map(({ event }) => event)).toEqual([
			{ type: "player-hit", monster: "goblin", damage: 1, turn: 30 },
			{
				type: "spell-hit",
				spell: "magic-missile",
				monster: "goblin",
				damage: 1,
				turn: 30,
			},
		]);
		expect(committed.monsters[0].health).toBe(9);
	});
	it("heals on the committed turn without running monsters or regeneration", () => {
		const committed = { ...encounter(), turn: 30 };
		const result = castSpell(
			committed,
			{ type: "cast", spell: "heal" },
			predictableAttackRolls,
		);
		if ("error" in result) throw new Error(result.error);
		expect(result.state).toMatchObject({
			turn: 30,
			mana: 1,
			player: { health: 9 },
		});
		expect(result.state.activityHistory.entries[0].event.turn).toBe(30);
	});
	it("uses the committed turn for spell rolls and damage events", () => {
		const committed = { ...encounter(), turn: 30 };
		const rolls = vi.fn(predictableAttackRolls);
		const result = castSpell(
			committed,
			{ type: "cast", spell: "magic-missile", targetId: "1:1" },
			rolls,
		);
		if ("error" in result) throw new Error(result.error);
		expect(rolls).toHaveBeenCalledWith(
			expect.objectContaining({
				turn: 30,
				attackerId: "player:spell:magic-missile",
			}),
		);
		expect(result.state).toMatchObject({ turn: 30, mana: 2 });
		expect(result.state.activityHistory.entries[0].event.turn).toBe(30);
	});
});

const committedActions: {
	name: string;
	action: PlayerAction;
	health: number;
	mana: number;
}[] = [
	{
		// Stepping away from the adjacent monster draws its strike first.
		name: "move",
		action: { type: "move", direction: "left" },
		health: 4,
		mana: 6,
	},
	{
		name: "bump attack",
		action: { type: "move", direction: "right" },
		health: 4,
		mana: 6,
	},
	{ name: "wait", action: { type: "wait" }, health: 4, mana: 6 },
	{
		name: "consume",
		action: { type: "consume", itemId: "bag:potion" },
		health: 9,
		mana: 6,
	},
	{
		name: "hotbar potion",
		action: { type: "use-hotbar", slot: 1 },
		health: 9,
		mana: 6,
	},
	{
		name: "pickup",
		action: { type: "pickup", itemId: "ground:potion" },
		health: 4,
		mana: 6,
	},
	{
		name: "drop",
		action: { type: "drop", itemId: "bag:sword" },
		health: 4,
		mana: 6,
	},
	{
		name: "equip",
		action: { type: "equip", itemId: "bag:sword", slot: "mainHand" },
		health: 4,
		mana: 6,
	},
	{
		name: "unequip",
		action: { type: "unequip", slot: "mainHand" },
		health: 4,
		mana: 6,
	},
	{ name: "Heal", action: { type: "cast", spell: "heal" }, health: 8, mana: 2 },
	{
		name: "Magic Missile",
		action: { type: "cast", spell: "magic-missile", targetId: "1:1" },
		health: 4,
		mana: 3,
	},
];
describe("One committed action completes one turn", () => {
	it.each(committedActions)(
		"$name resolves effects, one monster phase and recovery on turn 30",
		({ action, health, mana }) => {
			const before = encounter();
			const result = resolvePlayerAction(
				before,
				action,
				predictableAttackRolls,
			);
			expect(result.turnAdvanced).toBe(true);
			expect(result.state).toMatchObject({
				turn: 30,
				player: { health },
				mana,
			});
			expect(
				result.state.activityHistory.entries.every(
					({ event }) => event.turn === 30,
				),
			).toBe(true);
			expect(before).toMatchObject({
				turn: 29,
				player: { health: 5 },
				mana: 5,
			});
		},
	);
	it.each([
		{ type: "move", direction: "up" },
		{ type: "pickup", itemId: "missing" },
		{ type: "cast", spell: "magic-missile", targetId: "missing" },
	] satisfies PlayerAction[])(
		"rejects $type without committing a turn, monsters or recovery",
		(action) => {
			const before = encounter();
			const result = resolvePlayerAction(
				before,
				action,
				predictableAttackRolls,
			);
			expect(result.turnAdvanced).toBe(false);
			expect(result.state).toBe(before);
		},
	);
	it("changes a hotbar assignment without committing combat or recovery", () => {
		const before = encounter();
		const result = resolvePlayerAction(
			before,
			{ type: "clear-hotbar", slot: 1 },
			predictableAttackRolls,
		);
		expect(result.turnAdvanced).toBe(false);
		expect(result.state).toMatchObject({
			turn: 29,
			mana: 5,
			player: { health: 5 },
			potionHotbar: [null, null, null, null],
		});
	});
});
