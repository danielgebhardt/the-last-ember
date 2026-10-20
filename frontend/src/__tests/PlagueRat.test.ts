// @vitest-environment node
import { expect, it } from "vitest";
import { applyPlayerAffliction } from "../domain/game/Afflictions";
import { createGameState, type GameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { createMonsterDrop } from "../domain/items/MonsterDrops";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import { savedAdventure } from "./SaveTestHelpers";

const hit = () => ({ d20: () => 20, damage: (min: number) => min });
const miss = () => ({ d20: () => 1, damage: (min: number) => min });
const encounter = (turn = 0): GameState => ({
	...createGameState(createCorridorEncounter()),
	turn,
	monsters: [
		{
			id: "1:1",
			kind: "plague-rat",
			floorNumber: 1,
			coordinate: { row: 1, col: 2 },
			health: 4,
			intent: { type: "idle" },
		},
	],
});
const diseased = (state: GameState) =>
	state.afflictions?.some((a) => a.kind === "disease") ?? false;
const waitAt = (turn: number, rolls = hit, state = encounter(turn)) =>
	resolvePlayerAction(state, { type: "wait" }, rolls).state;
const turns = [...Array(200).keys()];

it("infects on about one landed hit in five, deterministically, and never on a miss", () => {
	const infected = turns.filter((turn) => diseased(waitAt(turn)));
	expect(infected.length / turns.length).toBeGreaterThan(0.1);
	expect(infected.length / turns.length).toBeLessThan(0.3);
	expect(turns.filter((turn) => diseased(waitAt(turn)))).toEqual(infected);
	expect(turns.some((turn) => diseased(waitAt(turn, miss)))).toBe(false);

	const after = waitAt(infected[0]);
	// The 1-damage bite leaves 9 HP, then Disease clamps it to the new maximum.
	expect(after.player).toEqual({ health: 8, maxHealth: 8 });
	expect(after.afflictions).toEqual([
		{ kind: "disease", remaining: null, source: "plague rat" },
	]);
	expect(after.activityHistory.entries.map(({ event }) => event.type)).toEqual([
		"monster-hit",
		"affliction-changed",
	]);
});

it("does not stack, and magic resistance never protects against Disease", () => {
	const infected = turns.filter((turn) => diseased(waitAt(turn)));
	const first = waitAt(infected[0]);
	const again = waitAt(infected[1], hit, { ...first, turn: infected[1] });
	expect(again.afflictions).toEqual(first.afflictions);
	expect(again.player.maxHealth).toBe(8);
	expect(
		again.activityHistory.entries.filter(
			({ event }) => event.type === "affliction-changed",
		),
	).toHaveLength(1);

	const warded = (turn: number) => ({
		...encounter(turn),
		equipment: {
			...encounter(turn).equipment,
			chest: { id: "test:cloak", kind: "warding-cloak" as const },
		},
	});
	expect(
		turns.filter((turn) => diseased(waitAt(turn, hit, warded(turn)))),
	).toEqual(infected);
});

it("a fatal bite kills without infecting", () => {
	const infected = turns.filter((turn) => diseased(waitAt(turn)));
	const dying = {
		...encounter(infected[0]),
		player: { health: 1, maxHealth: 10 },
	};
	const dead = waitAt(infected[0], hit, dying);
	expect(dead.player.health).toBe(0);
	expect(dead.afflictions).toEqual([]);
});

it("the first carrier drops one Cure Disease potion; later carriers use ordinary loot", () => {
	const kill = (state: GameState) => {
		let current = state;
		for (let i = 0; i < 10 && current.monsters.length; i++)
			current = resolvePlayerAction(
				{ ...current, player: { health: 10, maxHealth: 10 }, afflictions: [] },
				{ type: "move", direction: "right" },
				hit,
			).state;
		return current;
	};
	const marked = encounter();
	const killed = kill({
		...marked,
		monsters: [{ ...marked.monsters[0], remedyDrop: true }],
	});
	expect(
		killed.floorItems.filter((entry) => entry.item.id === "monster:1:1:loot"),
	).toEqual([
		{
			item: { id: "monster:1:1:loot", kind: "cure-disease-potion" },
			floorNumber: 1,
			coordinate: { row: 1, col: 2 },
		},
	]);
	// Unmarked carriers keep the ordinary seeded drop chance and loot pool.
	const drops = [...Array(60).keys()].map((index) =>
		createMonsterDrop(123, {
			...marked.monsters[0],
			id: `2:${index + 1}`,
			floorNumber: 2,
		}),
	);
	expect(drops.some((drop) => drop === undefined)).toBe(true);
	expect(
		drops.filter((drop) => drop?.item.kind === "cure-disease-potion").length,
	).toBeLessThan(drops.length / 4);
});

it("saves the carrier marker and continues an infection identically after load", () => {
	const original = restoreSave(savedAdventure());
	const [first] = original.state.monsters;
	const withCarrier = {
		...original.state,
		monsters: original.state.monsters.map((m) =>
			m.id === first.id
				? {
						id: m.id,
						floorNumber: m.floorNumber,
						coordinate: m.coordinate,
						lastDamagedTurn: null,
						intent: { type: "idle" as const },
						kind: "plague-rat" as const,
						health: 4,
						remedyDrop: true,
					}
				: { ...m, remedyDrop: undefined },
		),
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
	const parsed = save(withCarrier);
	if (!parsed.ok) throw new Error(parsed.error);
	expect(
		restoreSave(parsed.value).state.monsters.find((m) => m.id === first.id),
	).toMatchObject({ kind: "plague-rat", remedyDrop: true });

	const second = original.state.monsters[1];
	expect(
		save({
			...withCarrier,
			monsters: withCarrier.monsters.map((m) =>
				m.id === second.id ? { ...m, remedyDrop: true } : m,
			),
		}).ok,
	).toBe(false);
	expect(
		save({
			...withCarrier,
			monsters: withCarrier.monsters.map((m) =>
				m.id === first.id ? { ...m, kind: "goblin" as const } : m,
			),
		}).ok,
	).toBe(false);

	const live = applyPlayerAffliction(
		{ ...original.state, monsters: [] },
		"disease",
		"plague rat",
	);
	const sickSave = save(live);
	if (!sickSave.ok) throw new Error(sickSave.error);
	const resumed = restoreSave(sickSave.value).state;
	expect(resumed.afflictions).toEqual(live.afflictions);
	expect(resumed.player).toEqual(live.player);
	expect(resolvePlayerAction(resumed, { type: "wait" }, hit).state).toEqual(
		resolvePlayerAction(live, { type: "wait" }, hit).state,
	);
});
