// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { FLOOR } from "../domain/dungeon/Tiles";
import { emptyCombatTelemetry } from "../domain/game/CombatTelemetry";
import { createGameState, type GameState } from "../domain/game/GameState";
import { damageMonster } from "../domain/game/MonsterDamage";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import {
	maximumMonsterHealth,
	monsterAttackDamage,
} from "../domain/monsters/MonsterStats";
import type { DungeonObject } from "../domain/objects/DungeonObject";
import {
	isMimic,
	isMimicChest,
	MIMIC_TELL,
	mimicId,
} from "../domain/objects/MimicChests";
import { describeObject } from "../domain/objects/ObjectDescriptions";
import { chestReward } from "../domain/objects/TreasureChests";
import { hasConsistentActors } from "../domain/saves/SaveActorConsistency";
import { hasConsistentInventory } from "../domain/saves/SaveInventoryConsistency";
import { tacticalSnapshot } from "./TacticalReplayTestHelpers";
import { COMPACT_TEST_CONFIGURATION } from "./TestRunConfiguration";

const adventure = (seed: number) =>
	createGameState(
		connectDungeonFloors(
			generateDungeonRun(seed, 20, COMPACT_TEST_CONFIGURATION),
		),
	);
// The first generated mimic chest, with the player beside it and that floor emptied.
const besideMimic = (): { state: GameState; chest: DungeonObject } => {
	for (let seed = 1; seed < 200; seed++) {
		const generated = adventure(seed);
		const chest = generated.objects.find((o) => isMimicChest(seed, o));
		if (!chest) continue;
		const floor = generated.run.floors[chest.floorNumber - 1];
		const beside = [
			{ row: -1, col: 0 },
			{ row: 1, col: 0 },
			{ row: 0, col: -1 },
			{ row: 0, col: 1 },
		]
			.map(({ row, col }) => ({
				row: chest.coordinate.row + row,
				col: chest.coordinate.col + col,
			}))
			.find(
				(tile) =>
					floor.terrain[tile.row]?.[tile.col] === FLOOR &&
					!generated.objects.some(
						(o) =>
							o.floorNumber === chest.floorNumber &&
							o.coordinate.row === tile.row &&
							o.coordinate.col === tile.col,
					),
			);
		if (!beside) continue;
		return {
			chest,
			state: {
				...generated,
				run: {
					...generated.run,
					activeFloor: chest.floorNumber,
					playerCoordinate: beside,
				},
				monsters: generated.monsters.filter(
					(m) => m.floorNumber !== chest.floorNumber,
				),
			},
		};
	}
	throw new Error("Expected a mimic chest within 200 seeds");
};
const open = (state: GameState, chest: DungeonObject) =>
	resolvePlayerAction(state, { type: "interact", objectId: chest.id }).state;
// The rules a mimic adds: actor identity and chest loot ownership. The fixture moves the
// player straight to a deep floor, so geometry checks do not apply here.
const saves = (state: GameState) => {
	const document = JSON.parse(JSON.stringify(tacticalSnapshot(state)));
	return hasConsistentActors(document) && hasConsistentInventory(document);
};

describe("Mimic chests", () => {
	it("makes about one chest in eight a mimic from floor 4, fixed by seed and chest", () => {
		let chests = 0,
			mimics = 0;
		for (let seed = 1; seed <= 40; seed++) {
			const state = adventure(seed);
			for (const chest of state.objects.filter((o) => o.kind === "chest")) {
				const mimic = isMimicChest(seed, chest);
				expect(isMimicChest(seed, chest)).toBe(mimic);
				if (chest.floorNumber < 4) expect(mimic).toBe(false);
				else {
					chests += 1;
					if (mimic) mimics += 1;
				}
			}
		}
		expect(mimics / chests).toBeGreaterThan(0.05);
		expect(mimics / chests).toBeLessThan(0.25);
	});

	it("wakes beside you instead of giving loot, then drops the chest's loot plus its own when slain", () => {
		const { state, chest } = besideMimic();
		const opened = open(
			{ ...state, combatTelemetry: emptyCombatTelemetry() },
			chest,
		);
		expect(
			opened.combatTelemetry?.floors[chest.floorNumber]?.pressure[
				"mimic-revealed"
			],
		).toBe(1);
		expect(opened.objects.find((o) => o.id === chest.id)?.activated).toBe(true);
		const mimic = opened.monsters.find(isMimic);
		expect(mimic).toMatchObject({
			id: mimicId(chest.floorNumber),
			floorNumber: chest.floorNumber,
		});
		const reward = chestReward(state.run.seed, chest);
		expect(opened.floorItems.some((e) => e.item.id === reward.item.id)).toBe(
			false,
		);
		expect(
			opened.activityHistory.entries.map(({ event }) => event.type),
		).toContain("mimic-revealed");
		if (!mimic) throw new Error("Expected a mimic");
		const slain = damageMonster(opened, mimic, 999, { type: "player-hit" });
		expect(slain.monsters.some(isMimic)).toBe(false);
		expect(slain.floorItems).toContainEqual({
			...reward,
			coordinate: mimic.coordinate,
		});
		// Its own drop joins the chest's loot.
		expect(
			slain.floorItems.filter(
				(e) =>
					e.coordinate.row === mimic.coordinate.row &&
					e.coordinate.col === mimic.coordinate.col,
			).length,
		).toBeGreaterThanOrEqual(2);
	});

	it("grows from 20 health and 4 attack on floor 4 to a heroic fight on floor 20, leaving the champion unchanged", () => {
		expect(maximumMonsterHealth("treasure-mimic", 1, 4)).toBe(20);
		expect(monsterAttackDamage("treasure-mimic", 4)).toBe(4);
		expect(maximumMonsterHealth("treasure-mimic", 1, 20)).toBe(68);
		expect(monsterAttackDamage("treasure-mimic", 20)).toBe(16);
		expect(maximumMonsterHealth("iron-champion", 1, 20)).toBe(144);
		expect(monsterAttackDamage("iron-champion", 20)).toBe(30);
	});

	it("gives a tell only in the nearby notice of a fresh chest", () => {
		const chest = { kind: "chest" as const, activated: false };
		expect(describeObject(chest, MIMIC_TELL)).toContain(MIMIC_TELL);
		expect(describeObject(chest)).not.toContain(MIMIC_TELL);
		expect(
			describeObject({ ...chest, activated: true }, MIMIC_TELL),
		).not.toContain(MIMIC_TELL);
	});

	it("accepts a living mimic in a save, and rejects one without its opened chest or with its loot already out", () => {
		const { state, chest } = besideMimic();
		const opened = open(state, chest);
		expect(saves(opened)).toBe(true);
		expect(
			saves({
				...opened,
				objects: opened.objects.map((o) =>
					o.id === chest.id ? { ...o, activated: false } : o,
				),
			}),
		).toBe(false);
		expect(
			saves({
				...opened,
				floorItems: [...opened.floorItems, chestReward(opened.run.seed, chest)],
			}),
		).toBe(false);
		const slain = damageMonster(
			opened,
			opened.monsters.find(isMimic) as GameState["monsters"][number],
			999,
			{ type: "player-hit" },
		);
		expect(saves(slain)).toBe(true);
	});
});
