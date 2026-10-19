// @vitest-environment node
import { expect, it } from "vitest";
import { createGameState, type GameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import {
	maximumMonsterHealth,
	monsterAttackDamage,
} from "../domain/monsters/MonsterStats";
import { sarcophagusOutcome } from "../domain/objects/AncientSarcophagi";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";

const tomb = {
	id: "floor:1:object:sarcophagus:1",
	kind: "sarcophagus" as const,
	floorNumber: 1,
	coordinate: { row: 1, col: 2 },
	activated: false,
};
const encounter = (seed: number) => {
	const state = createGameState(createCorridorEncounter());
	return {
		...state,
		run: { ...state.run, seed },
		monsters: [],
		objects: [tomb],
	};
};
it("fixes all four outcomes independently of inspection, cancellation and turn", () => {
	const seen = new Set<string>();
	for (let seed = 0; seed < 60; seed++) {
		const state = encounter(seed);
		seen.add(sarcophagusOutcome(seed, tomb));
		expect(resolvePlayerAction(state, { type: "interact" }).state).toBe(state);
		expect(
			resolvePlayerAction(state, { type: "interact", choice: "leave" })
				.turnAdvanced,
		).toBe(false);
		const action = {
			type: "interact" as const,
			choice: "open-sarcophagus" as const,
		};
		const result = resolvePlayerAction(state, action);
		expect(result.turnAdvanced).toBe(true);
		expect(result.state.objects[0].activated).toBe(true);
		expect(result.state.floorItems).toEqual(
			resolvePlayerAction({ ...state, turn: 20 }, action).state.floorItems,
		);
		expect(resolvePlayerAction(result.state, action).turnAdvanced).toBe(false);
	}
	expect(seen).toEqual(new Set(["treasure", "guardian", "both", "empty"]));
});
it("doubles heroic base HP and attack before difficulty scaling without changing ordinary monsters", () => {
	expect(maximumMonsterHealth("skeleton", 1.25, 2, true)).toBe(20);
	expect(monsterAttackDamage("skeleton", 2, true)).toBe(8);
	expect(maximumMonsterHealth("skeleton", 1.25, 2)).toBe(10);
	expect(monsterAttackDamage("skeleton", 2)).toBe(4);
});

import { damageMonster } from "../domain/game/MonsterDamage";
import { createEquipment } from "../domain/items/Equipment";
import {
	eligibleMonsterKinds,
	MONSTER_DEFINITIONS,
} from "../domain/monsters/Monster";
import { resolveMonsterPhase } from "../domain/monsters/MonsterTurns";
import {
	openSarcophagus,
	sarcophagusGuardianKind,
	sarcophagusSpawn,
} from "../domain/objects/AncientSarcophagi";
import {
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { predictableAttackRolls } from "./ControlledCombatTestHelpers";
import {
	sarcophagusEncounter,
	testSarcophagus,
} from "./SarcophagusTestHelpers";
import { tacticalSnapshot } from "./TacticalReplayTestHelpers";

const open = { type: "interact" as const, choice: "open-sarcophagus" as const };
const checkedRestore = (state: GameState) => {
	const parsed = parseSave(serializeSave(tacticalSnapshot(state)));
	expect(parsed.ok, !parsed.ok ? parsed.error : "").toBe(true);
	if (!parsed.ok) throw new Error(parsed.error);
	return restoreSave(parsed.value).state;
};
it.each(["treasure", "guardian", "both", "empty"] as const)(
	"continues %s through sealed/opened saves without rerolls or duplicate rewards",
	(outcome) => {
		const state = sarcophagusEncounter(outcome);
		const restored = checkedRestore(state);
		const next = resolvePlayerAction(state, open).state;
		expect(resolvePlayerAction(restored, open).state).toEqual(next);
		const after = checkedRestore(next);
		expect(after.monsters).toEqual(next.monsters);
		expect(after.objects[0].sarcophagusOutcome).toBe(outcome);
		expect(resolvePlayerAction(after, open).turnAdvanced).toBe(false);
		expect(resolvePlayerAction(after, { type: "wait" }).state).toEqual(
			resolvePlayerAction(next, { type: "wait" }).state,
		);
		expect(next.monsters).toHaveLength(
			outcome === "guardian" || outcome === "both" ? 1 : 0,
		);
		expect(next.floorItems.length - state.floorItems.length).toBe(
			outcome === "treasure" || outcome === "both" ? 1 : 0,
		);
	},
);
it("uses floor-eligible undead, stable adjacent then nearest reachable empty room spawn", () => {
	const state = sarcophagusEncounter();
	expect(sarcophagusSpawn(state, testSarcophagus)).toEqual({ row: 3, col: 5 });
	const blocked = {
		...state,
		objects: [
			...state.objects,
			...[
				{ row: 3, col: 5 },
				{ row: 4, col: 6 },
				{ row: 5, col: 5 },
			].map((coordinate, index) => ({
				...testSarcophagus,
				id: `block:${index}`,
				kind: "chest" as const,
				coordinate,
			})),
		],
	};
	expect(sarcophagusSpawn(blocked, testSarcophagus)).toEqual({
		row: 2,
		col: 5,
	});
	for (let floorNumber = 2; floorNumber <= 20; floorNumber++) {
		const kind = sarcophagusGuardianKind(17, {
			...testSarcophagus,
			floorNumber,
		});
		expect(eligibleMonsterKinds(floorNumber)).toContain(kind);
		expect(["skeleton", "zombie", "wraith"]).toContain(kind);
	}
});
it.each(["guardian", "both"] as const)(
	"resolves a blocked %s tomb once, retaining independently selected treasure",
	(outcome) => {
		const state = sarcophagusEncounter(outcome);
		const floor = state.run.floors[3];
		const filled = {
			...state,
			floorItems: [
				...state.floorItems,
				...floor.terrain.flatMap((row, r) =>
					row.flatMap((tile, c) =>
						tile === "."
							? [
									{
										item: {
											id: `block:${r}:${c}`,
											kind: "healing-potion" as const,
										},
										floorNumber: 4,
										coordinate: { row: r, col: c },
									},
								]
							: [],
					),
				),
			],
		};
		expect(sarcophagusSpawn(filled, testSarcophagus)).toBeUndefined();
		const next = resolvePlayerAction(filled, open).state;
		expect(next.monsters).toHaveLength(0);
		expect(next.floorItems.length - filled.floorItems.length).toBe(
			outcome === "both" ? 1 : 0,
		);
		expect(
			next.activityHistory.entries.some(
				(e) => e.event.type === "sarcophagus-opened" && e.event.escaped,
			),
		).toBe(true);
		expect(next.turn).toBe(1);
		expect(resolvePlayerAction(next, open).turnAdvanced).toBe(false);
	},
);
it("runs exactly the normal monster phase on opening, including fatal damage and frozen victory/death", () => {
	const state = sarcophagusEncounter("guardian");
	const spawned = openSarcophagus(state, testSarcophagus, "open-sarcophagus");
	if ("error" in spawned) throw new Error(spawned.error);
	const expected = resolveMonsterPhase(
		{ ...spawned, turn: 1 },
		predictableAttackRolls,
	);
	const next = resolvePlayerAction(state, open, predictableAttackRolls).state;
	expect(next.monsters).toEqual(expected.monsters);
	expect(next.player.health).toBe(expected.player.health);
	// Opening beside an existing ordinary foe still grants that foe one response.
	const fatal = {
		...state,
		player: { ...state.player, health: 1 },
		monsters: [
			{
				id: "4:1",
				kind: "skeleton" as const,
				floorNumber: 4,
				coordinate: { row: 4, col: 3 },
				health: 8,
				intent: { type: "idle" as const },
			},
		],
	};
	const dead = resolvePlayerAction(fatal, open, predictableAttackRolls).state;
	expect(dead.player.health).toBe(0);
	expect(dead.objects[0].activated).toBe(true);
	expect(resolvePlayerAction(dead, open).turnAdvanced).toBe(false);
	expect(
		resolvePlayerAction(
			{
				...state,
				quest: {
					...state.quest,
					victory: {
						seed: state.run.seed,
						floors: 5,
						turns: 0,
						health: 10,
						experience: 0,
						level: 1,
						monstersDefeated: 0,
					},
				},
			},
			open,
		).turnAdvanced,
	).toBe(false);
});
it("awards doubled XP and ordinary gold/drop once and transfers tomb treasure through ordinary pickup", () => {
	const state = sarcophagusEncounter("both");
	const opened = resolvePlayerAction(state, open).state;
	const guardian = opened.monsters[0];
	expect(guardian.heroic).toBe(true);
	const killed = damageMonster(opened, guardian, 1000, { type: "player-hit" });
	expect(killed.progression.experience - opened.progression.experience).toBe(
		2 * MONSTER_DEFINITIONS[guardian.kind].experienceReward,
	);
	expect(damageMonster(killed, guardian, 1000, { type: "player-hit" })).toBe(
		killed,
	);
	checkedRestore(killed);
	const atTomb = {
		...killed,
		run: { ...killed.run, playerCoordinate: testSarcophagus.coordinate },
	};
	const picked = resolvePlayerAction(atTomb, {
		type: "pickup",
		itemId: `${testSarcophagus.id}:reward`,
	}).state;
	expect(
		picked.floorItems.some((i) => i.item.id === `${testSarcophagus.id}:reward`),
	).toBe(false);
	expect(
		[...picked.bag.items, ...Object.values(picked.equipment)].filter(
			(i) => i?.id === `${testSarcophagus.id}:reward`,
		),
	).toHaveLength(1);
	checkedRestore(picked);
	expect(
		resolvePlayerAction(picked, {
			type: "pickup",
			itemId: `${testSarcophagus.id}:reward`,
		}).turnAdvanced,
	).toBe(false);
});
it("rejects corrupt heroic variants, unearned treasure and altered stored results", () => {
	const state = resolvePlayerAction(sarcophagusEncounter("both"), open).state;
	const document = tacticalSnapshot(state);
	const invalid = [
		{
			...document,
			state: {
				...document.state,
				objects: document.state.objects.map((o) => ({
					...o,
					sarcophagusOutcome: "empty",
				})),
			},
		},
		{
			...document,
			state: {
				...document.state,
				monsters: document.state.monsters.map((m) => ({
					...m,
					kind: "demon-warden",
				})),
			},
		},
		{
			...document,
			state: {
				...document.state,
				monsters: document.state.monsters.map((m) => ({ ...m, heroic: "yes" })),
			},
		},
		{
			...document,
			state: {
				...document.state,
				objects: document.state.objects.map((o) => ({
					...o,
					activated: false,
					sarcophagusOutcome: undefined,
				})),
			},
		},
	];
	for (const data of invalid)
		expect(parseSave(JSON.stringify(data)).ok).toBe(false);
});

it.each([0.75, 1, 1.25] as const)(
	"scales Heroic spawn and landed attack once at difficulty %s while retaining zombie timing",
	(difficulty) => {
		const initial = sarcophagusEncounter("guardian");
		let seed = initial.run.seed;
		while (
			sarcophagusOutcome(seed, testSarcophagus) !== "guardian" ||
			sarcophagusGuardianKind(seed, testSarcophagus) !== "zombie"
		)
			seed++;
		const state = {
			...initial,
			difficulty,
			run: { ...initial.run, seed },
			equipment: createEquipment(),
			player: { health: 100, maxHealth: 100 },
		};
		const spawned = openSarcophagus(state, testSarcophagus, "open-sarcophagus");
		if ("error" in spawned) throw new Error(spawned.error);
		const guardian = { ...spawned.monsters[0], coordinate: { row: 4, col: 3 } };
		expect(guardian.health).toBe(Math.round(24 * difficulty));
		const adjacent = { ...spawned, monsters: [guardian] };
		const inactive = resolveMonsterPhase(
			{ ...adjacent, turn: 1 },
			predictableAttackRolls,
		);
		expect(inactive.player.health).toBe(100);
		const active = resolveMonsterPhase(
			{ ...adjacent, turn: 2 },
			predictableAttackRolls,
		);
		expect(100 - active.player.health).toBe(Math.round(10 * difficulty));
		expect(MONSTER_DEFINITIONS.zombie.maxHealth).toBe(12);
		expect(MONSTER_DEFINITIONS.zombie.attackDamage).toBe(5);
	},
);
