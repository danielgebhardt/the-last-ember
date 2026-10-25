// @vitest-environment node

import { describe, expect, it } from "vitest";
import { WARDEN_SPAWN_ID, wardenStats } from "../domain/monsters/EmberWarden";
import {
	MONSTER_DEFINITIONS,
	type Monster,
	type MonsterKind,
} from "../domain/monsters/Monster";
import {
	TARGET_TELEGRAPHS,
	type TargetTelegraph,
	TELEGRAPH_COOLDOWNS,
	type TelegraphCooldown,
} from "../domain/monsters/MonsterTelegraphs";
import { THIEF_SPAWN_ID } from "../domain/monsters/TreasureThief";
import { parseSave, serializeSave } from "../domain/saves/SaveFormat";
import { savedAdventure } from "./SaveTestHelpers";

// Minibosses only exist in their arena, which this short fixture has none of; their own
// tests cover their saves.
const kinds = (Object.keys(MONSTER_DEFINITIONS) as MonsterKind[]).filter(
	(kind) => !MONSTER_DEFINITIONS[kind].miniboss,
);
// The Warden only exists with its reserved ID and depth stats, and a thief owns its
// reserved ID. Any other kind is reshaped as is.
const asKind = (monster: Monster, kind: MonsterKind): Monster =>
	kind === "ember-warden"
		? {
				...monster,
				kind,
				id: `${monster.floorNumber}:${WARDEN_SPAWN_ID}`,
				warden: { ...wardenStats(5), awake: true },
			}
		: kind === "treasure-thief"
			? { ...monster, kind, id: `${monster.floorNumber}:${THIEF_SPAWN_ID}` }
			: { ...monster, kind };
// One floor-2 actor (the player is on floor 1) reshaped into the kind under test. A
// Warden never leaves the final floor and carries the flame, so it stands on the flame's
// tile there and takes it back up.
const withActor = (change: (monster: Monster) => Monster) => {
	const document = savedAdventure();
	const monster = document.state.monsters.find(
		(actor) => actor.floorNumber === 2,
	);
	if (!monster) throw new Error("Fixture requires a floor-2 monster");
	const changed = change({ ...monster, health: 1 });
	const flame = document.state.floorItems.find(
		(entry) => entry.item.kind === "cure",
	);
	if (changed.kind === "ember-warden" && flame) {
		document.state.monsters = [
			{
				...changed,
				id: `${flame.floorNumber}:${WARDEN_SPAWN_ID}`,
				floorNumber: flame.floorNumber,
				coordinate: { ...flame.coordinate },
			},
		];
		document.state.floorItems = document.state.floorItems.filter(
			(entry) => entry !== flame,
		);
	} else document.state.monsters = [changed];
	return document;
};
const reachableTarget = (monster: Monster, type: TargetTelegraph) => {
	const terrain = savedAdventure().state.run.floors[1].terrain;
	for (
		let row = monster.coordinate.row - 8;
		row <= monster.coordinate.row + 8;
		row++
	)
		for (
			let col = monster.coordinate.col - 8;
			col <= monster.coordinate.col + 8;
			col++
		)
			if (
				terrain[row]?.[col] === "." &&
				TARGET_TELEGRAPHS[type].reaches(monster, { row, col })
			)
				return { row, col };
	throw new Error(`No reachable ${type} target in the fixture`);
};

describe("registered monster telegraphs in saves", () => {
	it.each(Object.keys(TARGET_TELEGRAPHS) as TargetTelegraph[])(
		"round-trips %s on an owning kind and rejects it on a kind without it",
		(type) => {
			const rule = TARGET_TELEGRAPHS[type];
			// Targets lie on floor 2, which the Warden never leaves the final floor for.
			const owner = kinds.find(
				(kind) =>
					kind !== "ember-warden" && rule.owns(MONSTER_DEFINITIONS[kind]),
			);
			const other = kinds.find((kind) => !rule.owns(MONSTER_DEFINITIONS[kind]));
			if (!owner || !other) throw new Error(`${type} needs both kinds`);
			const prepare = (kind: MonsterKind) => (monster: Monster) => {
				const actor = asKind(monster, kind);
				return {
					...actor,
					intent: {
						type,
						target: reachableTarget({ ...actor, kind: owner }, type),
					},
				};
			};
			const parsed = parseSave(serializeSave(withActor(prepare(owner))));
			if (!parsed.ok) throw new Error(parsed.error);
			expect(parsed.value.state.monsters[0].intent.type).toBe(type);
			expect(parseSave(serializeSave(withActor(prepare(other)))).ok).toBe(
				false,
			);
		},
	);

	it.each(Object.keys(TELEGRAPH_COOLDOWNS) as TelegraphCooldown[])(
		"keeps a %s cooldown only on a kind that has that attack",
		(cooldown) => {
			const owns = (kind: MonsterKind) =>
				TELEGRAPH_COOLDOWNS[cooldown](MONSTER_DEFINITIONS[kind]) !== undefined;
			const owner = kinds.find(owns);
			const other = kinds.find((kind) => !owns(kind));
			if (!owner || !other) throw new Error(`${cooldown} needs both kinds`);
			const cooled = (kind: MonsterKind) => (monster: Monster) => ({
				...asKind(monster, kind),
				telegraphTurn: { [cooldown]: 0 },
			});
			const parsed = parseSave(serializeSave(withActor(cooled(owner))));
			if (!parsed.ok) throw new Error(parsed.error);
			expect(parsed.value.state.monsters[0].telegraphTurn).toEqual({
				[cooldown]: 0,
			});
			expect(parseSave(serializeSave(withActor(cooled(other)))).ok).toBe(false);
		},
	);
});
