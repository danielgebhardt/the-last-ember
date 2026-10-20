// @vitest-environment node
import { expect, it } from "vitest";
import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { createGameState, type GameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { applyTimedEffect } from "../domain/game/TimedEffects";
import { createMonsterDrop } from "../domain/items/MonsterDrops";
import { MONSTER_DEFINITIONS } from "../domain/monsters/Monster";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import { savedAdventure } from "./SaveTestHelpers";
import { COMPACT_TEST_CONFIGURATION } from "./TestRunConfiguration";

const hit = () => ({ d20: () => 20, damage: (min: number) => min });
const encounter = (): GameState => {
	const base = createGameState(createCorridorEncounter());
	return {
		...base,
		run: { ...base.run, playerCoordinate: { row: 1, col: 5 } },
		monsters: [
			{
				id: "1:1",
				kind: "spider",
				floorNumber: 1,
				coordinate: { row: 1, col: 7 },
				health: 8,
				intent: { type: "idle" },
			},
		],
	};
};
const wait = (state: GameState) =>
	resolvePlayerAction(state, { type: "wait" }, hit).state;
const types = (state: GameState, from = 0) =>
	state.activityHistory.entries.slice(from).map(({ event }) => event.type);

it("telegraphs a web at the seen tile, then Slows a player who stays, without damage or poison", () => {
	const prepared = wait(encounter());
	expect(prepared.monsters[0].intent).toEqual({
		type: "preparing-web",
		target: { row: 1, col: 5 },
	});
	expect(types(prepared)).toEqual(["monster-web-prepared"]);
	const caught = wait(prepared);
	expect(types(caught, 1)).toEqual(["monster-web-hit", "affliction-changed"]);
	expect(caught.afflictions).toEqual([
		{ kind: "slowed", remaining: 9, source: "giant spider" },
	]);
	expect(caught.player).toEqual(encounter().player);
	expect(caught.effects).toEqual([]);
	expect(caught.monsters[0]).toMatchObject({
		intent: { type: "idle" },
		webTurn: caught.turn,
	});
});

it("misses a player who steps off the marked tile and never also bites that phase", () => {
	const prepared = wait(encounter());
	const dodged = resolvePlayerAction(
		prepared,
		{ type: "move", direction: "left" },
		hit,
	).state;
	expect(types(dodged, 1)).toEqual(["monster-web-avoided"]);
	expect(dodged.afflictions).toEqual([]);
	expect(dodged.player).toEqual(encounter().player);
});

it("waits out its cooldown, biting instead, before preparing another web", () => {
	let state = wait(wait(encounter()));
	const resolved = state.turn;
	const webs: number[] = [];
	for (let i = 0; i < 6; i++) {
		state = wait({ ...state, afflictions: [], player: encounter().player });
		if (state.monsters[0].intent.type === "preparing-web")
			webs.push(state.turn);
	}
	expect(webs[0]).toBeGreaterThan(resolved + 3);
	expect(
		state.activityHistory.entries.some(
			({ event }) => event.type === "monster-hit",
		),
	).toBe(true);
});

it("refreshes Slowed on a second web, ignores magic resistance, and Sleep cancels preparation", () => {
	const caught = wait(wait(encounter()));
	const again = wait(
		wait({
			...caught,
			afflictions: [{ kind: "slowed", remaining: 4, source: "giant spider" }],
			monsters: [{ ...caught.monsters[0], webTurn: -10 }],
		}),
	);
	expect(again.afflictions).toEqual([
		{ kind: "slowed", remaining: 9, source: "giant spider" },
	]);
	const warded = {
		...encounter(),
		equipment: {
			...encounter().equipment,
			chest: { id: "test:cloak", kind: "warding-cloak" as const },
		},
	};
	expect(wait(wait(warded)).afflictions).toEqual(
		wait(wait(encounter())).afflictions,
	);
	const prepared = wait(encounter());
	const asleep = applyTimedEffect(prepared, prepared.monsters[0], "asleep");
	expect(asleep.monsters[0].intent).toEqual({ type: "idle" });
	expect(wait(asleep).afflictions).toEqual([]);
});

it("saves a prepared web and cooldown, continuing identically, and rejects impossible web state", () => {
	const original = restoreSave(savedAdventure());
	const [first] = original.state.monsters;
	const spider = {
		id: first.id,
		floorNumber: first.floorNumber,
		coordinate: first.coordinate,
		lastDamagedTurn: null,
		kind: "spider" as const,
		health: 8,
		webTurn: original.state.turn,
		intent: {
			type: "preparing-web" as const,
			target: original.state.run.playerCoordinate,
		},
	};
	const save = (monster: object) =>
		parseSave(
			serializeSave(
				createSaveDocument(
					{
						...original.state,
						monsters: original.state.monsters.map((m) =>
							m.id === first.id ? monster : { ...m, remedyDrop: undefined },
						) as GameState["monsters"],
					},
					original.exploration,
					original.configuration,
					original.fog,
				),
			),
		);
	const parsed = save(spider);
	if (!parsed.ok) throw new Error(parsed.error);
	expect(
		restoreSave(parsed.value).state.monsters.find((m) => m.id === first.id),
	).toMatchObject({ webTurn: spider.webTurn, intent: spider.intent });
	expect(save({ ...spider, kind: "goblin", health: 4 }).ok).toBe(false);
	expect(save({ ...spider, webTurn: original.state.turn + 1 }).ok).toBe(false);
});

it("marks the shallowest spider of a new adventure to drop one Cleansing potion", () => {
	let checked = 0;
	for (let seed = 0; seed < 30 && checked < 3; seed++) {
		const state = createGameState(
			connectDungeonFloors(
				generateDungeonRun(seed, 8, COMPACT_TEST_CONFIGURATION),
			),
		);
		const spiders = state.monsters.filter((m) => m.kind === "spider");
		if (!spiders.length) continue;
		checked++;
		const marked = spiders.filter((m) => m.remedyDrop);
		expect(marked).toHaveLength(1);
		const shallowest = Math.min(...spiders.map((m) => m.floorNumber));
		expect(marked[0].floorNumber).toBe(shallowest);
		expect(createMonsterDrop(seed, marked[0])?.item).toEqual({
			id: `monster:${marked[0].id}:loot`,
			kind: "cleansing-potion",
		});
		expect(
			state.monsters.filter((m) => m.remedyDrop && m.kind === "plague-rat")
				.length,
		).toBeLessThanOrEqual(1);
	}
	expect(checked).toBeGreaterThan(0);
	expect(MONSTER_DEFINITIONS.spider.webAttack).toEqual({
		range: 3,
		cooldown: 3,
	});
});
